import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  sha256,
  stableStringify,
} from "../packages/bim-diff-core/src/index.js";
import {
  IfcDiffWasm,
  type IfcWasmCompareResult,
  type IfcWasmSide,
} from "../src/ifc-diff-wasm";

const wasm = await IfcDiffWasm.instantiate(
  await readFile(new URL("../public/wasm/ifc-diff.wasm", import.meta.url)),
);

const fixture = (name: string) =>
  new URL(`../../ifc/src/ifc/fixtures/${name}.ifc`, import.meta.url);

const meta = (name: string, sourceHash: string): IfcWasmSide => ({
  modelKey: name,
  version: name,
  sourceHash,
  coordinateSystem: "ifc",
  metersPerUnit: 1,
});

async function compare(
  leftName: string,
  rightName: string,
  detail = true,
): Promise<IfcWasmCompareResult> {
  const [left, right] = await Promise.all([
    readFile(fixture(leftName)),
    readFile(fixture(rightName)),
  ]);
  const [leftHash, rightHash] = await Promise.all([
    sha256(left),
    sha256(right),
  ]);
  return wasm.compare(
    left,
    right,
    meta(leftName, leftHash),
    meta(rightName, rightHash),
    detail,
  );
}

test("a copy has no changes", async () => {
  const result = await compare("base", "copy");
  assert.equal(result.summary.unchanged, 16);
  assert.equal(result.summary.modified, 0);
  assert.ok(result.artifact.changes.every((change) => change.kind === "unchanged"));
  assert.equal(result.artifact.method?.name, "ifc-wasm-v1");
});

test("renumbering every instance changes nothing", async () => {
  const result = await compare("base", "renumbered");
  assert.equal(result.summary.unchanged, 16);
  assert.equal(result.summary.modified, 0);
});

test("a renamed object is modified on the properties facet", async () => {
  const result = await compare("base", "renamed");
  assert.equal(result.summary.modified, 1);
  const change = result.artifact.changes.find(
    (candidate) => candidate.kind === "modified",
  );
  assert.ok(change);
  assert.deepEqual(change.facets, ["properties"]);
  assert.equal(change.left?.globalId, "1Wq2eRtyu0kugbFTf53O9L");
});

test("a recreated object is offered as a pair while the changes stay added/removed", async () => {
  const result = await compare("base", "recreated");
  assert.equal(result.summary.removed, 1);
  assert.equal(result.summary.added, 1);
  assert.equal(result.artifact.method?.recreated.length, 1);
  assert.equal(
    result.artifact.method?.recreated[0]?.leftGlobalId,
    "1Wq2eRtyu0kugbFTf53O9L",
  );
  assert.equal(
    result.artifact.method?.recreated[0]?.rightGlobalId,
    "7Zx9cVbnM0kugbFTf53O9L",
  );
  assert.ok(
    result.artifact.changes.some((change) => change.kind === "removed"),
  );
  assert.ok(result.artifact.changes.some((change) => change.kind === "added"));
});

test("a summary-only run omits the per-object list", async () => {
  const result = await compare("base", "copy", false);
  assert.equal(result.summary.unchanged, 16);
  assert.equal(result.artifact.changes.length, 0);
});

test("the artifact uses the same change keys as the TypeScript core", async () => {
  const result = await compare("base", "copy");
  const change = result.artifact.changes[0]!;
  assert.equal(change.key, stableStringify(["base", change.left?.globalId]));
});

test("a duplicated GlobalId is unknown and carries a diagnostic", () => {
  const source = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('x'),'4;1');",
    "FILE_NAME('x','t',(''),(''),'','','');",
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCWALL('AAAAAAAAAAAAAAAAAAAAAA',$,'A',$,$,$,$,$,.NOTDEFINED.);",
    "#2=IFCDOOR('AAAAAAAAAAAAAAAAAAAAAA',$,'B',$,$,$,$,$,.NOTDEFINED.);",
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n");
  const other = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('x'),'4;1');",
    "FILE_NAME('x','t',(''),(''),'','','');",
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCWALL('AAAAAAAAAAAAAAAAAAAAAA',$,'A',$,$,$,$,$,.NOTDEFINED.);",
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n");

  const result = wasm.compare(
    Buffer.from(source),
    Buffer.from(other),
    meta("dup-left", "left"),
    meta("dup-right", "right"),
  );
  assert.equal(result.summary.unknown, 2);
  assert.equal(result.artifact.changes.length, 2);
  assert.deepEqual(
    result.artifact.changes.map((change) => change.key).sort(),
    [
      stableStringify(["dup-left", "AAAAAAAAAAAAAAAAAAAAAA"]) + ":0",
      stableStringify(["dup-left", "AAAAAAAAAAAAAAAAAAAAAA"]) + ":1",
    ],
  );
  assert.ok(
    result.artifact.diagnostics.some(
      (diagnostic) => diagnostic.code === "DUPLICATE_GLOBAL_ID",
    ),
  );
});

test("invalid IFC is rejected", () => {
  assert.throws(() =>
    wasm.compare(
      Buffer.from("not an IFC file"),
      Buffer.from("not an IFC file"),
      meta("bad-left", "left"),
      meta("bad-right", "right"),
    ),
  );
});

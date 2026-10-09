import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareIndexes,
  normalizeElement,
  defaultOptions,
  identity,
  createOverlayPlan,
  stableStringify,
} from "../src/index.js";
import type { ModelIndex, RawElement } from "../src/index.js";
const raw = (id = "wall"): RawElement => ({
  localId: 1,
  globalId: id,
  properties: { rating: null },
  meshes: [
    {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      transform: [...identity],
    },
  ],
});
const index = async (element = raw(), version = "A"): Promise<ModelIndex> => ({
  schemaVersion: 1,
  algorithmVersion: "overlay-v1",
  modelKey: "building",
  version,
  sourceHash: version,
  converterVersion: "test",
  metersPerUnit: 1,
  coordinateSystem: "local",
  modelTransform: [...identity],
  options: defaultOptions,
  elements: [await normalizeElement(element, defaultOptions, 1, identity)],
  diagnostics: [],
});
test("identical model is unchanged and rendered once", async () => {
  const a = await index();
  const diff = compareIndexes(a, a);
  assert.equal(diff.changes[0].kind, "unchanged");
  assert.equal(createOverlayPlan(diff).items.length, 1);
});
test("geometry ignores vertex numbering and triangle ordering but preserves winding", async () => {
  const a = raw();
  const b = raw();
  b.meshes[0].positions = [0, 1, 0, 0, 0, 0, 1, 0, 0];
  assert.equal(
    (await normalizeElement(a, defaultOptions, 1, identity)).shapeHash,
    (await normalizeElement(b, defaultOptions, 1, identity)).shapeHash,
  );
  b.meshes[0].indices = [0, 2, 1];
  assert.notEqual(
    (await normalizeElement(a, defaultOptions, 1, identity)).shapeHash,
    (await normalizeElement(b, defaultOptions, 1, identity)).shapeHash,
  );
});
test("properties only use one mesh; position uses old and new", async () => {
  const b = raw();
  b.properties.rating = "EI60";
  let diff = compareIndexes(await index(), await index(b, "B"));
  assert.deepEqual(diff.changes[0].facets, ["properties"]);
  assert.equal(createOverlayPlan(diff).items.length, 1);
  b.meshes[0].transform[12] = 2;
  diff = compareIndexes(await index(), await index(b, "B"));
  assert.deepEqual(diff.changes[0].facets, ["properties", "position"]);
  assert.equal(createOverlayPlan(diff).items.length, 2);
});
test("missing differs from null and array order matters", () => {
  assert.notEqual(stableStringify({}), stableStringify({ x: null }));
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
});
test("duplicates, missing ids, incomplete geometry never become unchanged", async () => {
  const a = await index();
  a.elements.push(a.elements[0]);
  const d = compareIndexes(a, await index());
  assert.ok(d.changes.every((x) => x.kind === "unknown"));
  assert.ok(d.diagnostics.length);
  const b = raw("");
  assert.equal(
    compareIndexes(await index(b), await index(b)).changes[0].kind,
    "unknown",
  );
});
test("units normalize and incompatible coordinates invalidate comparison", async () => {
  const b = raw();
  b.meshes[0].positions = b.meshes[0].positions.map((x) => x * 1000);
  assert.equal(
    (await normalizeElement(raw(), defaultOptions, 1, identity)).shapeHash,
    (await normalizeElement(b, defaultOptions, 0.001, identity)).shapeHash,
  );
  const a = await index(),
    c = await index();
  c.coordinateSystem = "other";
  assert.equal(compareIndexes(a, c).changes[0].kind, "unknown");
});
test("direction reverses added/removed and result ordering is deterministic", async () => {
  const a = await index(),
    b = await index(raw("new"), "B");
  assert.deepEqual(
    compareIndexes(a, b).changes.map((x) => x.kind),
    ["added", "removed"],
  );
  assert.deepEqual(
    compareIndexes(b, a).changes.map((x) => x.kind),
    ["removed", "added"],
  );
  assert.equal(
    stableStringify(compareIndexes(a, b)),
    stableStringify(compareIndexes(a, b)),
  );
});

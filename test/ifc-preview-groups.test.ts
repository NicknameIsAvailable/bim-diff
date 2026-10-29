import assert from "node:assert/strict";
import test from "node:test";
import type { Change, ElementRef } from "../packages/bim-diff-core/src/index.js";
import { groupChanges, groupSize } from "../src/ifc-preview-groups";

function ref(globalId: string | null, localId = 1): ElementRef {
  return {
    modelKey: "m",
    version: "v",
    sourceHash: "h",
    localId,
    globalId,
  };
}

function change(
  kind: Change["kind"],
  left: ElementRef | null,
  right: ElementRef | null,
): Change {
  return { key: `${left?.localId}-${right?.localId}`, kind, facets: [], left, right };
}

test("unchanged elements are dimmed on both sides", () => {
  const groups = groupChanges({
    changes: [change("unchanged", ref("G1"), ref("G1"))],
  });
  assert.deepEqual(groups.left.unchanged, ["G1"]);
  assert.deepEqual(groups.right.unchanged, ["G1"]);
  assert.equal(groupSize(groups.left, "unchanged"), 1);
});

test("added elements only appear on the new side", () => {
  const groups = groupChanges({
    changes: [change("added", null, ref("NEW"))],
  });
  assert.deepEqual(groups.right.added, ["NEW"]);
  assert.equal(groups.left.added, undefined);
});

test("removed elements only appear on the old side", () => {
  const groups = groupChanges({
    changes: [change("removed", ref("OLD"), null)],
  });
  assert.deepEqual(groups.left.removed, ["OLD"]);
  assert.equal(groups.right.removed, undefined);
});

test("property-only modifications highlight both sides", () => {
  const groups = groupChanges({
    changes: [change("modified", ref("SAME"), ref("SAME"))],
  });
  assert.deepEqual(groups.left["modified-old"], ["SAME"]);
  assert.deepEqual(groups.right["modified-new"], ["SAME"]);
});

test("unknown elements are flagged on both sides", () => {
  const groups = groupChanges({
    changes: [change("unknown", ref("DUP"), ref("DUP"))],
  });
  assert.deepEqual(groups.left.unknown, ["DUP"]);
  assert.deepEqual(groups.right.unknown, ["DUP"]);
});

test("a real change wins over a duplicate unknown entry", () => {
  const groups = groupChanges({
    changes: [
      change("unknown", ref("G", 1), ref("G", 2)),
      change("modified", ref("G", 3), ref("G", 4)),
    ],
  });
  assert.deepEqual(groups.left["modified-old"], ["G"]);
  assert.deepEqual(groups.left.unknown, undefined);
  assert.deepEqual(groups.right["modified-new"], ["G"]);
});

test("global ids are de-duplicated", () => {
  const groups = groupChanges({
    changes: [
      change("added", null, ref("NEW")),
      change("added", null, ref("NEW")),
    ],
  });
  assert.deepEqual(groups.right.added, ["NEW"]);
});

test("elements without a GlobalId are ignored", () => {
  const groups = groupChanges({
    changes: [change("added", null, ref(null)), change("removed", ref(null), null)],
  });
  assert.deepEqual(groups, { left: {}, right: {} });
});

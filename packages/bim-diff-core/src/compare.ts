import { stableStringify } from "./canonical.js";

import type {
  Change,
  DiffArtifact,
  ElementRef,
  IndexedElement,
  ModelIndex,
  OverlayPlan,
} from "./contracts.js";
/** Compares normalized indexes without browser, renderer or clock dependencies. */
export function compareIndexes(
  left: ModelIndex,
  right: ModelIndex,
): DiffArtifact {
  const metadata = (x: ModelIndex) => ({
    modelKey: x.modelKey,
    version: x.version,
    sourceHash: x.sourceHash,
    converterVersion: x.converterVersion,
    coordinateSystem: x.coordinateSystem,
    metersPerUnit: x.metersPerUnit,
    modelTransform: x.modelTransform,
  });
  const diagnostics = [
    ...left.diagnostics.map((d) => ({ ...d, side: "left" as const })),
    ...right.diagnostics.map((d) => ({ ...d, side: "right" as const })),
  ];
  const compatible =
    left.schemaVersion === 1 &&
    right.schemaVersion === 1 &&
    left.algorithmVersion === right.algorithmVersion &&
    left.converterVersion === right.converterVersion &&
    !!left.coordinateSystem &&
    left.coordinateSystem === right.coordinateSystem &&
    !!left.metersPerUnit &&
    !!right.metersPerUnit &&
    stableStringify(left.options) === stableStringify(right.options) &&
    !left.diagnostics.length &&
    !right.diagnostics.length;
  if (!compatible)
    diagnostics.push({
      code: "INCOMPATIBLE_INPUTS",
      message:
        "Schema, converter, coordinates, units, options or completeness mismatch",
      side: "left",
    });
  const group = (x: ModelIndex) => {
    const m = new Map<string, IndexedElement[]>();
    for (const e of x.elements) {
      const key = stableStringify([
        x.modelKey,
        e.globalId?.trim() || `missing:${x.version}:${e.localId}`,
      ]);
      m.set(key, [...(m.get(key) ?? []), e]);
    }
    return m;
  };
  const a = group(left),
    b = group(right);
  const ref = (index: ModelIndex, e: IndexedElement): ElementRef => ({
    modelKey: index.modelKey,
    version: index.version,
    sourceHash: index.sourceHash,
    localId: e.localId,
    globalId: e.globalId,
  });
  const changes: Change[] = [];
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const aa = a.get(key) ?? [],
      bb = b.get(key) ?? [];
    const l = aa[0],
      r = bb[0];
    const unknown =
      !compatible ||
      aa.length > 1 ||
      bb.length > 1 ||
      [...aa, ...bb].some((e) => !e.complete);
    for (const [side, items] of [
      ["left", aa],
      ["right", bb],
    ] as const) {
      for (const e of items)
        diagnostics.push(...e.diagnostics.map((d) => ({ ...d, side })));
      if (items.length > 1)
        diagnostics.push({ code: "DUPLICATE_GLOBAL_ID", message: key, side });
    }
    if (unknown) {
      for (let i = 0; i < Math.max(aa.length, bb.length); i++)
        changes.push({
          key: key + ":" + i,
          kind: "unknown",
          facets: [],
          left: aa[i] ? ref(left, aa[i]!) : null,
          right: bb[i] ? ref(right, bb[i]!) : null,
        });
      continue;
    }
    const facets: Change["facets"] = [];
    if (l && r) {
      if (l.propertyHash !== r.propertyHash) facets.push("properties");
      if (l.shapeHash !== r.shapeHash) facets.push("shape");
      if (
        l.placementHash !== r.placementHash ||
        (l.shapeHash === r.shapeHash && l.arrangementHash !== r.arrangementHash)
      )
        facets.push("position");
    }
    changes.push({
      key,
      kind: !l
        ? "added"
        : !r
          ? "removed"
          : facets.length
            ? "modified"
            : "unchanged",
      facets,
      left: l ? ref(left, l) : null,
      right: r ? ref(right, r) : null,
    });
  }
  return {
    schemaVersion: 1,
    algorithmVersion: "overlay-v1",
    left: metadata(left),
    right: metadata(right),
    options: left.options,
    changes,
    diagnostics,
  };
}
/** Builds a render plan with common and property-only geometry present once. */
export function createOverlayPlan(diff: DiffArtifact): OverlayPlan {
  const items: OverlayPlan["items"] = [];
  for (const c of diff.changes) {
    if (c.kind === "unknown") {
      if (c.left) items.push({ ref: c.left, side: "left", style: "unknown" });
      if (c.right)
        items.push({ ref: c.right, side: "right", style: "unknown" });
      continue;
    }
    if (c.kind === "removed" && c.left)
      items.push({ ref: c.left, side: "left", style: "removed" });
    if (
      c.kind === "modified" &&
      c.left &&
      c.facets.some((f) => f !== "properties")
    )
      items.push({ ref: c.left, side: "left", style: "modified-old" });
    if (c.right)
      items.push({
        ref: c.right,
        side: "right",
        style:
          c.kind === "modified"
            ? "modified-new"
            : c.kind === "added"
              ? "added"
              : "unchanged",
      });
  }
  return { schemaVersion: 1, items };
}

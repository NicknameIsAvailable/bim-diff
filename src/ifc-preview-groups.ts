import type { Change, DiffArtifact } from "../packages/bim-diff-core/src/index.js";

/**
 * Visual styles understood by the preview. The names match `overlayColors`
 * so the legend, the old overlay renderer and the new preview agree.
 */
export type PreviewStyle =
  | "unchanged"
  | "added"
  | "removed"
  | "modified-old"
  | "modified-new"
  | "unknown";

/** GlobalIds grouped by the style they should receive on one side. */
export type PreviewSideGroups = Partial<Record<PreviewStyle, string[]>>;

export type PreviewGroups = {
  left: PreviewSideGroups;
  right: PreviewSideGroups;
};

/** Changed styles are drawn after the dim pass, so they must not be dimmed. */
export const changedStyles: readonly PreviewStyle[] = [
  "unknown",
  "removed",
  "modified-old",
  "added",
  "modified-new",
];

/**
 * A GlobalId can occur more than once in an artifact (duplicate ids are
 * reported as `unknown`). Pick the most informative style deterministically:
 * a real change wins over `unknown`, which wins over `unchanged`.
 */
const priority: Record<PreviewStyle, number> = {
  unchanged: 0,
  unknown: 1,
  "modified-old": 2,
  "modified-new": 2,
  removed: 3,
  added: 3,
};

/**
 * Maps a diff artifact to per-side GlobalId groups. Only GlobalIds are
 * returned: the preview resolves them against the Fragments model, whose
 * local ids are assigned by web-ifc and differ from the Zig parser's ids.
 */
export function groupChanges(artifact: Pick<DiffArtifact, "changes">): PreviewGroups {
  const left = new Map<string, PreviewStyle>();
  const right = new Map<string, PreviewStyle>();

  const apply = (
    target: Map<string, PreviewStyle>,
    globalId: string | null | undefined,
    style: PreviewStyle,
  ) => {
    if (!globalId) return;
    const previous = target.get(globalId);
    if (previous === undefined || priority[style] > priority[previous])
      target.set(globalId, style);
  };

  for (const change of artifact.changes) {
    const [leftStyle, rightStyle] = stylesFor(change);
    apply(left, change.left?.globalId, leftStyle);
    apply(right, change.right?.globalId, rightStyle);
  }

  return {
    left: toGroups(left),
    right: toGroups(right),
  };
}

function stylesFor(change: Change): [PreviewStyle, PreviewStyle] {
  switch (change.kind) {
    case "added":
      return ["unchanged", "added"];
    case "removed":
      return ["removed", "unchanged"];
    case "modified":
      // Both sides are highlighted, including property-only changes. The old
      // overlay only painted `modified-old` for geometry/placement facets; a
      // side-by-side view should always show that the element differs.
      return ["modified-old", "modified-new"];
    case "unknown":
      return ["unknown", "unknown"];
    case "unchanged":
    default:
      return ["unchanged", "unchanged"];
  }
}

function toGroups(
  styles: Map<string, PreviewStyle>,
): PreviewSideGroups {
  const groups: PreviewSideGroups = {};
  for (const [globalId, style] of styles) {
    (groups[style] ??= []).push(globalId);
  }
  return groups;
}

/** Number of distinct GlobalIds in a side group. */
export function groupSize(groups: PreviewSideGroups, style: PreviewStyle): number {
  return groups[style]?.length ?? 0;
}

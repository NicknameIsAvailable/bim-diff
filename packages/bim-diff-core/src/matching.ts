/** Strict compatibility lookup for the existing semantic API. Research uses diagnostics instead. */
export function indexByGlobalId<T extends { globalId: string }>(
  elements: readonly T[],
  version: string,
): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const element of elements) {
    if (!element.globalId.trim())
      throw new Error(
        `BIM semantic index has a missing GlobalId in ${version}.`,
      );
    if (map.has(element.globalId))
      throw new Error(
        `BIM semantic index has a duplicate GlobalId ${element.globalId} in ${version}.`,
      );
    map.set(element.globalId, element);
  }
  return map;
}
/** Compares signatures without knowledge of UI change DTOs. */
export function changedSignatures(
  left: { propertySignature: string; geometrySignature: string },
  right: { propertySignature: string; geometrySignature: string },
): ("properties" | "geometry")[] {
  const facets: ("properties" | "geometry")[] = [];
  if (left.propertySignature !== right.propertySignature)
    facets.push("properties");
  if (left.geometrySignature !== right.geometrySignature)
    facets.push("geometry");
  return facets;
}

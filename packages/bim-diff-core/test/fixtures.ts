import {
  defaultOptions,
  identity,
  normalizeElement,
  type ModelIndex,
  type RawElement,
} from "../src/index.js";
/** Deterministic input used independently by Node and browser worker acceptance checks. */
export async function fixtureIndexes(): Promise<[ModelIndex, ModelIndex]> {
  const raw = (id: string, x = 0): RawElement => ({
    localId: Number(id),
    globalId: "guid-" + id,
    properties: { name: "Wall", value: null },
    meshes: [
      {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        indices: [0, 1, 2],
        transform: [...identity.slice(0, 12), x, 0, 0, 1],
      },
    ],
  });
  const left = [raw("1"), raw("2"), raw("3"), raw("4")];
  const right = [raw("1"), raw("2", 2), raw("3"), raw("5")];
  right[0]!.properties.name = "Changed";
  right[2]!.meshes[0]!.positions[3] = 2;
  const make = async (
    elements: RawElement[],
    version: string,
  ): Promise<ModelIndex> => ({
    schemaVersion: 1,
    algorithmVersion: "overlay-v1",
    modelKey: "fixture",
    version,
    sourceHash: version,
    converterVersion: "test",
    coordinateSystem: "local",
    metersPerUnit: 1,
    modelTransform: [...identity],
    options: defaultOptions,
    diagnostics: [],
    elements: await Promise.all(
      elements.map((e) => normalizeElement(e, defaultOptions, 1, identity)),
    ),
  });
  return [await make(left, "A"), await make(right, "B")];
}

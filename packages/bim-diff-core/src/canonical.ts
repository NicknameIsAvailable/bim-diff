import {
  identity,
  type CompareOptions,
  type IndexedElement,
  type RawElement,
} from "./contracts.js";
/** Serializes objects by code-point key order, preserving array order and null. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value))
      throw new Error("Non-finite number");
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error("Non-JSON value");
    return result;
  }
  if (Array.isArray(value))
    return "[" + value.map(stableStringify).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((value as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}
/** Uses the same SHA-256 implementation interface in browsers and Node 20+. */
export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes),
  );
  return [...new Uint8Array(hash)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
/** Multiplies column-major affine matrices. */
function multiply(a: readonly number[], b: readonly number[]): number[] {
  return Array.from({ length: 16 }, (_, i) => {
    const row = i % 4,
      col = Math.floor(i / 4);
    return [0, 1, 2, 3].reduce(
      (sum, k) => sum + a[k * 4 + row]! * b[col * 4 + k]!,
      0,
    );
  });
}
/** Canonicalizes oriented triangles and associated placements, without converter IDs. */
export async function normalizeElement(
  raw: RawElement,
  options: CompareOptions,
  metersPerUnit: number,
  modelTransform: readonly number[] = identity,
): Promise<IndexedElement> {
  const diagnostics = [...(raw.diagnostics ?? [])];
  const fail = (message: string) =>
    diagnostics.push({
      code: "INCOMPLETE_GEOMETRY",
      message,
      localId: raw.localId,
    });
  const shapes: string[] = [];
  const placed: string[] = [];
  const arrangements: string[] = [];
  const quant = (n: number, tolerance: number) => {
    if (!Number.isFinite(n) || !Number.isFinite(tolerance) || tolerance <= 0)
      throw new Error("Invalid coordinate/tolerance");
    return Math.round(n / tolerance);
  };
  try {
    if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0)
      throw new Error("Unknown units");
    if (!raw.meshes.length) throw new Error("No supported geometry");
    for (const mesh of raw.meshes) {
      if (
        mesh.transform.length !== 16 ||
        modelTransform.length !== 16 ||
        mesh.positions.length % 3
      )
        throw new Error("Invalid geometry layout");
      const indices =
        mesh.indices ??
        Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
      if (!indices.length || indices.length % 3)
        throw new Error("Unsupported primitive");
      const anchor = [Infinity, Infinity, Infinity];
      for (let offset = 0; offset < mesh.positions.length; offset++)
        anchor[offset % 3] = Math.min(
          anchor[offset % 3]!,
          mesh.positions[offset]!,
        );
      const triangles: string[] = [];
      for (let i = 0; i < indices.length; i += 3) {
        const vertices = indices.slice(i, i + 3).map((v) => {
          if (
            !Number.isInteger(v) ||
            v < 0 ||
            v * 3 + 2 >= mesh.positions.length
          )
            throw new Error("Invalid index");
          return mesh.positions
            .slice(v * 3, v * 3 + 3)
            .map((n, axis) =>
              quant(
                (n - anchor[axis]!) * metersPerUnit,
                options.coordinateTolerance,
              ),
            )
            .join(",");
        });
        triangles.push(
          [0, 1, 2]
            .map((j) =>
              [...vertices.slice(j), ...vertices.slice(0, j)].join(";"),
            )
            .sort()[0]!,
        );
      }
      const shape = await sha256(triangles.sort().join("|"));
      shapes.push(shape);
      const local = mesh.transform.map((n, i) =>
        i === 12 || i === 13 || i === 14 ? n * metersPerUnit : n,
      );
      for (let axis = 0; axis < 3; axis++)
        local[12 + axis] =
          local[12 + axis]! +
          [0, 1, 2].reduce(
            (sum, k) => sum + local[k * 4 + axis]! * anchor[k]! * metersPerUnit,
            0,
          );
      const transform = multiply(modelTransform, local).map((n, i) =>
        quant(
          n,
          i === 12 || i === 13 || i === 14
            ? options.coordinateTolerance
            : options.rotationTolerance,
        ),
      );
      placed.push(transform.join(","));
      arrangements.push(shape + ":" + transform.join(","));
    }
  } catch (error) {
    fail(String(error));
  }
  if (!raw.globalId?.trim())
    diagnostics.push({
      code: "MISSING_GLOBAL_ID",
      message: "GlobalId is absent",
      localId: raw.localId,
    });
  let propertyHash = "";
  try {
    propertyHash = await sha256(stableStringify(raw.properties));
  } catch (error) {
    fail(String(error));
  }
  return {
    localId: raw.localId,
    globalId: raw.globalId,
    properties: raw.properties,
    propertyHash,
    shapeHash: await sha256(shapes.sort().join("|")),
    placementHash: await sha256(placed.sort().join("|")),
    arrangementHash: await sha256(arrangements.sort().join("|")),
    complete: diagnostics.length === 0,
    diagnostics,
  };
}

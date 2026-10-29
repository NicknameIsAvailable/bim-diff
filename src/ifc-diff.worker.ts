import { sha256 } from "../packages/bim-diff-core/src/index.js";
import {
  IfcDiffWasm,
  type IfcWasmSide,
  type IfcWasmCompareResult,
} from "./ifc-diff-wasm";

type Payload = {
  left: Uint8Array | ArrayBuffer;
  right: Uint8Array | ArrayBuffer;
  wasmUrl?: string;
  leftMeta?: Partial<IfcWasmSide>;
  rightMeta?: Partial<IfcWasmSide>;
  detail?: boolean;
};

let loaded: Promise<{ wasm: IfcDiffWasm; loadMs: number }> | undefined;

function loadWasm(url: string) {
  return (loaded ??= (async () => {
    const start = performance.now();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`IFC WASM ${response.status}`);
    const wasm = await IfcDiffWasm.instantiate(await response.arrayBuffer());
    return { wasm, loadMs: performance.now() - start };
  })());
}

const bytes = (value: Uint8Array | ArrayBuffer) =>
  value instanceof Uint8Array ? value : new Uint8Array(value);

self.onmessage = async (event: MessageEvent) => {
  const { id, operation, payload } = event.data as {
    id: number;
    operation: string;
    payload: Payload;
  };
  try {
    if (operation !== "ifc-diff-wasm")
      throw new Error(`Unsupported operation ${operation}`);
    const { wasm, loadMs } = await loadWasm(
      payload.wasmUrl ??
        new URL("../wasm/ifc-diff.wasm", self.location.href).href,
    );
    const left = bytes(payload.left);
    const right = bytes(payload.right);

    const hashStart = performance.now();
    const [leftHash, rightHash] = await Promise.all([
      payload.leftMeta?.sourceHash
        ? Promise.resolve(payload.leftMeta.sourceHash)
        : sha256(left),
      payload.rightMeta?.sourceHash
        ? Promise.resolve(payload.rightMeta.sourceHash)
        : sha256(right),
    ]);
    const hashMs = performance.now() - hashStart;

    const leftMeta: IfcWasmSide = {
      modelKey: payload.leftMeta?.modelKey ?? "left",
      version: payload.leftMeta?.version ?? "left",
      coordinateSystem: payload.leftMeta?.coordinateSystem ?? "ifc",
      metersPerUnit: payload.leftMeta?.metersPerUnit ?? 1,
      converterVersion: "ifc-wasm-v1",
      sourceHash: leftHash,
    };
    const rightMeta: IfcWasmSide = {
      modelKey: payload.rightMeta?.modelKey ?? "right",
      version: payload.rightMeta?.version ?? "right",
      coordinateSystem: payload.rightMeta?.coordinateSystem ?? "ifc",
      metersPerUnit: payload.rightMeta?.metersPerUnit ?? 1,
      converterVersion: "ifc-wasm-v1",
      sourceHash: rightHash,
    };

    const result: IfcWasmCompareResult = wasm.compare(
      left,
      right,
      leftMeta,
      rightMeta,
      payload.detail ?? true,
    );
    self.postMessage({
      id,
      result: {
        artifact: result.artifact,
        summary: result.summary,
        recreated: result.recreated,
        ambiguousPairs: result.ambiguousPairs,
        memoryBytes: result.memoryBytes,
        stages: { load: loadMs, hash: hashMs, ...result.stages },
      },
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

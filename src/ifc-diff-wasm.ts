import {
  defaultOptions,
  identity,
  stableStringify,
  type Change,
  type Diagnostic,
  type DiffArtifact,
  type ElementRef,
} from "../packages/bim-diff-core/src/index.js";

/** Metadata for one side of a raw-IFC comparison. */
export type IfcWasmSide = {
  modelKey: string;
  version: string;
  sourceHash: string;
  converterVersion?: string;
  coordinateSystem?: string | null;
  metersPerUnit?: number | null;
  modelTransform?: readonly number[];
};

export type IfcWasmSummary = {
  unchanged: number;
  added: number;
  removed: number;
  modified: number;
  unknown: number;
};

export type IfcWasmRecreated = {
  keyword: string;
  leftGlobalId: string;
  rightGlobalId: string;
};

export type IfcWasmDiagnostic = {
  code: string;
  globalId: string;
  side: "left" | "right";
  leftKeyword?: string;
  rightKeyword?: string;
};

export type IfcWasmSideEntry = {
  localId: number;
  keyword: string;
  digest?: number;
};

export type IfcWasmChange = {
  globalId: string;
  kind: "unchanged" | "added" | "removed" | "modified" | "unknown";
  duplicateIndex?: number;
  left?: IfcWasmSideEntry;
  right?: IfcWasmSideEntry;
};

export type IfcWasmRawResult = {
  changes: IfcWasmChange[];
  recreated: IfcWasmRecreated[];
  diagnostics: IfcWasmDiagnostic[];
  summary: IfcWasmSummary;
  ambiguousPairs: number;
};

export type IfcWasmStages = {
  copyLeft: number;
  copyRight: number;
  diff: number;
  decode: number;
  artifact: number;
};

export type IfcWasmCompareResult = {
  artifact: DiffArtifact;
  summary: IfcWasmSummary;
  recreated: IfcWasmRecreated[];
  ambiguousPairs: number;
  stages: IfcWasmStages;
  memoryBytes: number;
};

type IfcDiffExports = {
  memory: WebAssembly.Memory;
  ifc_diff_alloc(len: number): number;
  ifc_diff_free(ptr: number, len: number): void;
  ifc_diff_compare(
    leftPtr: number,
    leftLen: number,
    rightPtr: number,
    rightLen: number,
    detail: number,
  ): number;
  ifc_diff_result_ptr(): number;
  ifc_diff_result_len(): number;
  ifc_diff_reset(): void;
  ifc_diff_error_ptr(): number;
  ifc_diff_error_len(): number;
};

const decoder = new TextDecoder();

/** Thin synchronous wrapper around the Zig `ifc-diff.wasm` ABI. */
export class IfcDiffWasm {
  private constructor(private readonly wasm: IfcDiffExports) {}

  static async instantiate(
    source: BufferSource | WebAssembly.Module,
  ): Promise<IfcDiffWasm> {
    const module =
      source instanceof WebAssembly.Module
        ? source
        : await WebAssembly.compile(source);
    const instance = await WebAssembly.instantiate(module, {});
    return new IfcDiffWasm(instance.exports as unknown as IfcDiffExports);
  }

  compare(
    left: Uint8Array,
    right: Uint8Array,
    leftMeta: IfcWasmSide,
    rightMeta: IfcWasmSide,
    detail = true,
  ): IfcWasmCompareResult {
    const copyStart = performance.now();
    let leftPtr = 0;
    let rightPtr = 0;
    try {
      leftPtr = this.allocate(left);
      const copyMiddle = performance.now();
      rightPtr = this.allocate(right);
      const copyEnd = performance.now();

      const diffStart = performance.now();
      const code = this.wasm.ifc_diff_compare(
        leftPtr,
        left.length,
        rightPtr,
        right.length,
        detail ? 1 : 0,
      );
      const diffEnd = performance.now();

      if (code !== 0) {
        throw new Error(
          `IFC WASM compare failed (${code}): ${this.readError()}`,
        );
      }

      const decodeStart = performance.now();
      const text = this.readResult();
      const raw = JSON.parse(text) as IfcWasmRawResult;
      const decodeEnd = performance.now();

      const artifactStart = performance.now();
      const artifact = buildArtifact(raw, leftMeta, rightMeta);
      const artifactEnd = performance.now();

      return {
        artifact,
        summary: raw.summary,
        recreated: raw.recreated,
        ambiguousPairs: raw.ambiguousPairs,
        stages: {
          copyLeft: copyMiddle - copyStart,
          copyRight: copyEnd - copyMiddle,
          diff: diffEnd - diffStart,
          decode: decodeEnd - decodeStart,
          artifact: artifactEnd - artifactStart,
        },
        memoryBytes: this.wasm.memory.buffer.byteLength,
      };
    } finally {
      if (leftPtr !== 0) this.wasm.ifc_diff_free(leftPtr, left.length);
      if (rightPtr !== 0) this.wasm.ifc_diff_free(rightPtr, right.length);
    }
  }

  private allocate(bytes: Uint8Array): number {
    if (bytes.length === 0) throw new Error("IFC input is empty");
    const ptr = this.wasm.ifc_diff_alloc(bytes.length);
    if (!ptr) throw new Error("IFC WASM could not allocate the input buffer");
    // The view must be created after the allocation: growing memory detaches
    // every previous view of the buffer.
    new Uint8Array(this.wasm.memory.buffer, ptr, bytes.length).set(bytes);
    return ptr;
  }

  private readResult(): string {
    const ptr = this.wasm.ifc_diff_result_ptr();
    const len = this.wasm.ifc_diff_result_len();
    const bytes = new Uint8Array(this.wasm.memory.buffer, ptr, len);
    const text = decoder.decode(bytes);
    this.wasm.ifc_diff_reset();
    return text;
  }

  private readError(): string {
    const ptr = this.wasm.ifc_diff_error_ptr();
    const len = this.wasm.ifc_diff_error_len();
    return decoder.decode(new Uint8Array(this.wasm.memory.buffer, ptr, len));
  }
}

function buildArtifact(
  raw: IfcWasmRawResult,
  leftMeta: IfcWasmSide,
  rightMeta: IfcWasmSide,
): DiffArtifact {
  const changes: Change[] = raw.changes.map((change) => {
    const key =
      stableStringify([leftMeta.modelKey, change.globalId]) +
      (change.duplicateIndex === undefined ? "" : ":" + change.duplicateIndex);
    const facets: Change["facets"] =
      change.kind === "modified" ? ["properties"] : [];
    return {
      key,
      kind: change.kind,
      facets,
      left: change.left
        ? elementRef(leftMeta, change.globalId, change.left.localId)
        : null,
      right: change.right
        ? elementRef(rightMeta, change.globalId, change.right.localId)
        : null,
    };
  });
  // The Zig maps are unordered; the TypeScript core emits changes in key order.
  // Sorting here keeps exported artifacts deterministic and diffable.
  changes.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const diagnostics: Diagnostic[] = raw.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnosticMessage(diagnostic),
    side: diagnostic.side,
  }));

  return {
    schemaVersion: 1,
    algorithmVersion: "overlay-v1",
    left: sideMetadata(leftMeta),
    right: sideMetadata(rightMeta),
    options: defaultOptions,
    changes,
    diagnostics,
    method: {
      name: "ifc-wasm-v1",
      recreated: raw.recreated,
      ambiguousPairs: raw.ambiguousPairs,
      summary: raw.summary,
      limitations: [
        "Compares GlobalId identity and one level of entity parameters, not tessellated geometry.",
        "A shape or placement change inside a referenced entity is not visible to this method.",
        "Objects without a GlobalId are not part of the comparison.",
      ],
    },
  };
}

function sideMetadata(side: IfcWasmSide) {
  return {
    modelKey: side.modelKey,
    version: side.version,
    sourceHash: side.sourceHash,
    converterVersion: side.converterVersion ?? "ifc-wasm-v1",
    coordinateSystem: side.coordinateSystem ?? null,
    metersPerUnit: side.metersPerUnit ?? null,
    modelTransform: [...(side.modelTransform ?? identity)],
  };
}

function elementRef(
  side: IfcWasmSide,
  globalId: string,
  localId: number,
): ElementRef {
  return {
    modelKey: side.modelKey,
    version: side.version,
    sourceHash: side.sourceHash,
    localId,
    globalId,
  };
}

function diagnosticMessage(diagnostic: IfcWasmDiagnostic): string {
  switch (diagnostic.code) {
    case "DUPLICATE_GLOBAL_ID":
      return `${diagnostic.globalId} appears more than once on ${diagnostic.side}`;
    case "RETYPED":
      return `${diagnostic.globalId}: ${diagnostic.leftKeyword ?? "?"} -> ${diagnostic.rightKeyword ?? "?"}`;
    case "MISSING_DIGEST":
      return `${diagnostic.globalId}: content digest is unavailable`;
    default:
      return diagnostic.globalId;
  }
}

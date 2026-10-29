import {
  sha256,
  type BenchmarkReport,
  type BenchmarkRun,
  type DiffArtifact,
  type JsonValue,
  type Metric,
} from "../packages/bim-diff-core/src/index.js";
import { DiffWorkerClient } from "./worker-client";
import type {
  IfcWasmRecreated,
  IfcWasmStages,
  IfcWasmSummary,
} from "./ifc-diff-wasm";
import type { IfcPreviewHandle, IfcPreviewMetrics } from "./ifc-preview";
import type { ProtocolOptions, ResearchInput } from "./ui-contracts";

type WorkerResult = {
  artifact: DiffArtifact;
  summary: IfcWasmSummary;
  recreated: IfcWasmRecreated[];
  ambiguousPairs: number;
  memoryBytes: number;
  stages: IfcWasmStages & { load: number; hash: number };
};

/** Total input size below which the preview starts without a click. */
const previewThresholdBytes = 32 * 1024 ** 2;

let activePreview: IfcPreviewHandle | undefined;
let previewGeneration = 0;

const limitations = [
  "IFC WASM сравнивает GlobalId и один уровень параметров сущности, а не тесселированную геометрию.",
  "Изменение формы или положения внутри связанной сущности этим методом не видно.",
  "Объекты без GlobalId не участвуют в сравнении.",
  "Метрики рендера и камеры для этого метода не собираются: он измеряет только путь IFC → diff.",
  "3D-превью строится после замеров, в отдельном времени и памяти; в wasmTotal оно не входит.",
];


/** Runs the Zig wasm differ as a renderer-neutral benchmark method. */
export async function runIfcWasmProtocol(
  container: HTMLElement,
  pair: [ResearchInput, ResearchInput],
  options: ProtocolOptions,
  signal: AbortSignal,
  progress: (message: string) => void,
  onReport: (report: BenchmarkReport) => void,
): Promise<BenchmarkReport> {
  if (pair.some((input) => input.format !== "ifc"))
    throw new Error("IFC WASM поддерживает только .ifc; IFCZIP и FRAG не подходят");

  // A new run owns the viewport: drop the previous preview's workers, GL
  // contexts and canvases before measuring again.
  previewGeneration += 1;
  activePreview?.dispose();
  activePreview = undefined;

  // The direct `new Worker(new URL(...))` shape is what Vite recognizes when
  // it emits the worker chunk.
  const worker = new Worker(
    new URL("./ifc-diff.worker.ts", import.meta.url),
    { type: "module" },
  );
  const client = new DiffWorkerClient(signal, worker);
  const runs: BenchmarkRun[] = [];
  let lastArtifact: DiffArtifact | undefined;
  let lastSummary: IfcWasmSummary | undefined;
  let lastRecreated: IfcWasmRecreated[] = [];
  let lastAmbiguous = 0;
  let lastMemory = 0;

  progress("IFC WASM: подготовка входов");
  const wasmUrl = new URL("wasm/ifc-diff.wasm", document.baseURI).href;
  const hashStart = performance.now();
  const [leftHash, rightHash] = await Promise.all([
    sha256(pair[0].bytes),
    sha256(pair[1].bytes),
  ]);
  const hashMs = performance.now() - hashStart;

  try {
    const total = 1 + options.repeats;
    for (let index = 0; index < total; index++) {
      signal.throwIfAborted();
      const warmup = index === 0;
      progress(
        `IFC WASM: ${warmup ? "прогрев" : `прогон ${index}/${options.repeats}`}`,
      );
      const run = makeRun(index, warmup);
      runs.push(run);
      const start = performance.now();

      try {
        const result = await client.call<WorkerResult>("ifc-diff-wasm", {
          left: pair[0].bytes,
          right: pair[1].bytes,
          wasmUrl,
          leftMeta: {
            modelKey: pair[0].name,
            version: "left",
            sourceHash: leftHash,
            coordinateSystem: pair[0].coordinateSystem,
            metersPerUnit: pair[0].metersPerUnit,
          },
          rightMeta: {
            modelKey: pair[1].name,
            version: "right",
            sourceHash: rightHash,
            coordinateSystem: pair[1].coordinateSystem,
            metersPerUnit: pair[1].metersPerUnit,
          },
          detail: true,
        });
        const wall = performance.now() - start;
        const stages = result.stages;
        run.stages = {
          "wasm-load": stages.load,
          "wasm-hash": stages.hash,
          "wasm-copy-left": stages.copyLeft,
          "wasm-copy-right": stages.copyRight,
          "wasm-diff": stages.diff,
          "wasm-decode": stages.decode,
          "wasm-artifact": stages.artifact,
          "wasm-total": wall,
        };
        run.metrics = {
          wasmLoad: metric(stages.load, "ms"),
          wasmCopy: metric(stages.copyLeft + stages.copyRight, "ms"),
          wasmDiff: metric(stages.diff, "ms"),
          wasmDecode: metric(stages.decode, "ms"),
          wasmArtifact: metric(stages.artifact, "ms"),
          wasmTotal: metric(wall, "ms"),
          unchanged: metric(result.summary.unchanged, "count"),
          added: metric(result.summary.added, "count"),
          removed: metric(result.summary.removed, "count"),
          modified: metric(result.summary.modified, "count"),
          unknown: metric(result.summary.unknown, "count"),
          recreatedPairs: metric(result.recreated.length, "count"),
          ambiguousPairs: metric(result.ambiguousPairs, "count"),
          wasmMemoryBytes: metric(result.memoryBytes, "bytes"),
        };
        run.resources = { wasmMemoryBytes: result.memoryBytes };
        run.valid = true;
        run.status = "complete";
        lastSummary = result.summary;
        lastRecreated = result.recreated;
        lastAmbiguous = result.ambiguousPairs;
        lastMemory = result.memoryBytes;
        lastArtifact = result.artifact;
      } catch (error) {
        run.status = "failed";
        run.valid = false;
        run.error = String(error);
        run.issues.push(run.error);
        throw error;
      }

      onReport(
        buildReport(pair, options, runs, {
          hashMs,
          leftHash,
          rightHash,
          summary: lastSummary,
          recreated: lastRecreated,
          ambiguousPairs: lastAmbiguous,
          memoryBytes: lastMemory,
        }),
      );
    }
  } finally {
    client.dispose();
  }

  const report = buildReport(pair, options, runs, {
    hashMs,
    leftHash,
    rightHash,
    summary: lastSummary,
    recreated: lastRecreated,
    ambiguousPairs: lastAmbiguous,
    memoryBytes: lastMemory,
  });
  onReport(report);
  if (lastArtifact)
    void mountPreview(
      container,
      pair,
      lastArtifact,
      signal,
      report,
      previewGeneration,
      onReport,
    );
  return report;
}

/**
 * The preview is deliberately fire-and-forget: measured results are already
 * complete, and a preview failure must never invalidate the benchmark. Its
 * metrics are reported separately and never added to `wasmTotal`.
 */
async function mountPreview(
  container: HTMLElement,
  pair: [ResearchInput, ResearchInput],
  artifact: DiffArtifact,
  signal: AbortSignal,
  report: BenchmarkReport,
  generation: number,
  onReport: (report: BenchmarkReport) => void,
): Promise<void> {
  try {
    const { mountBrowserPreview } = await import("./ifc-preview-browser");
    if (signal.aborted || generation !== previewGeneration) return;
    const totalBytes = pair[0].bytes.byteLength + pair[1].bytes.byteLength;
    activePreview = mountBrowserPreview({
      container,
      left: { name: pair[0].name, bytes: pair[0].bytes },
      right: { name: pair[1].name, bytes: pair[1].bytes },
      artifact,
      signal,
      autoStart: totalBytes <= previewThresholdBytes,
      onMetrics: (metrics) => onReport(withPreviewMetrics(report, metrics)),
    });
  } catch (error) {
    console.warn("IFC preview could not be loaded", error);
  }
}

function withPreviewMetrics(
  report: BenchmarkReport,
  metrics: IfcPreviewMetrics,
): BenchmarkReport {
  return {
    ...report,
    summary: {
      ...report.summary,
      previewStatus: metrics.status,
      previewTotalMs: metrics.totalMs,
      previewConvertMs: metrics.convertMs,
      previewLoadMs: metrics.loadMs,
      previewHighlightMs: metrics.highlightMs,
      previewModels: metrics.models,
      previewChanged: metrics.changed,
      previewCacheHits: metrics.cacheHits,
      previewFragBytes: metrics.fragBytes.left + metrics.fragBytes.right,
      previewGeometries: metrics.geometries,
      previewTextures: metrics.textures,
      previewIncludedInWasmTotal: false,
    },
  };
}

function makeRun(index: number, warmup: boolean): BenchmarkRun {
  return {
    mode: "ifc-wasm-v1",
    scenario: "ifc",
    repetition: index,
    warmup,
    valid: false,
    issues: [],
    stages: {},
    metrics: {},
    startedAt: new Date().toISOString(),
    frameTimes: [],
    renderedFrames: 0,
    cache: {},
    resources: {},
    status: "complete",
  };
}

function metric(value: number, unit: string): Metric {
  return { value: Number.isFinite(value) ? value : null, unit };
}

type ReportState = {
  hashMs: number;
  leftHash: string;
  rightHash: string;
  summary: IfcWasmSummary | undefined;
  recreated: IfcWasmRecreated[];
  ambiguousPairs: number;
  memoryBytes: number;
};

function buildReport(
  pair: [ResearchInput, ResearchInput],
  options: ProtocolOptions,
  runs: BenchmarkRun[],
  state: ReportState,
): BenchmarkReport {
  const measured = runs.filter((run) => !run.warmup && run.valid);
  const totals = measured
    .map((run) => run.stages["wasm-total"])
    .filter((value): value is number => Number.isFinite(value))
    .sort((a, b) => a - b);
  const mean = totals.length
    ? totals.reduce((sum, value) => sum + value, 0) / totals.length
    : null;
  const percentile = (p: number) =>
    totals.length ? totals[Math.ceil(p * totals.length) - 1]! : null;

  return {
    schemaVersion: 1,
    build: {
      revision: "ifc-wasm-prototype",
      dirty: false,
      dependencies: {},
    },
    device: { userAgent: navigator.userAgent },
    parameters: {
      method: "ifc-wasm-v1",
      diffMethod: options.diffMethod ?? "ifc-wasm-v1",
      mode: options.mode,
      repeats: options.repeats,
      diagnostic: options.diagnostic,
      inputHashMs: state.hashMs,
    },
    inputs: {
      left: inputInfo(pair[0], state.leftHash),
      right: inputInfo(pair[1], state.rightHash),
    },
    runs,
    summary: {
      wasmTotal_mean: mean,
      wasmTotal_min: totals[0] ?? null,
      wasmTotal_p50: percentile(0.5),
      wasmTotal_p95: percentile(0.95),
      measuredRuns: measured.length,
      unchanged: state.summary?.unchanged ?? null,
      added: state.summary?.added ?? null,
      removed: state.summary?.removed ?? null,
      modified: state.summary?.modified ?? null,
      unknown: state.summary?.unknown ?? null,
      recreatedPairs: state.recreated.length,
      ambiguousPairs: state.ambiguousPairs,
      wasmMemoryBytes: state.memoryBytes,
      recreated: state.recreated as unknown as JsonValue,
    },
    limitations,
  };
}

function inputInfo(input: ResearchInput, hash: string): JsonValue {
  return {
    name: input.name,
    bytes: input.bytes.byteLength,
    sourceHash: hash,
    format: input.format,
  };
}

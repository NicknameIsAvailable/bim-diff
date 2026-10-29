// Injected into the prebuilt `npm start` runner. The production React bundle
// does not include a method selector, so this script adds one and intercepts
// the existing "Запустить" button only when the Zig differ is selected.
import { sha256, type DiffArtifact } from "../packages/bim-diff-core/src/index.js";
import {
  IfcDiffWasm,
  type IfcWasmCompareResult,
} from "./ifc-diff-wasm";
import type { IfcPreviewHandle, IfcPreviewMetrics } from "./ifc-preview";

type Input = { name: string; bytes: Uint8Array };
type Run = {
  warmup: boolean;
  total: number;
  stages: IfcWasmCompareResult["stages"];
  summary: IfcWasmCompareResult["summary"];
  recreated: number;
  memoryBytes: number;
};

/** Total input size below which the preview starts without a click. */
const previewThresholdBytes = 32 * 1024 ** 2;

let methodSelect: HTMLSelectElement | undefined;
let panel: HTMLElement | undefined;
let status: HTMLElement | undefined;
let running = false;
let wasm: Promise<IfcDiffWasm> | undefined;
let activePreview: IfcPreviewHandle | undefined;
let previewGeneration = 0;

install();

function install() {
  const timer = setInterval(() => {
    const fieldset = document.querySelector(".controls fieldset");
    if (!fieldset) return;
    clearInterval(timer);
    addControl(fieldset);
  }, 250);
}

function addControl(fieldset: Element) {
  const label = document.createElement("label");
  label.textContent = "Differ";
  const select = document.createElement("select");
  select.id = "ifc-wasm-method";
  for (const [value, text] of [
    ["overlay-v1", "Overlay v1 · существующий"],
    ["ifc-wasm-v1", "IFC WASM · Zig"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  label.append(select);
  fieldset.append(label);
  methodSelect = select;

  const section = document.createElement("section");
  section.className = "results";
  section.style.display = "none";
  const heading = document.createElement("h2");
  heading.textContent = "IFC WASM · Zig";
  status = document.createElement("p");
  status.className = "hint";
  status.textContent = "Выберите «IFC WASM · Zig» и нажмите «Запустить».";
  panel = document.createElement("div");
  section.append(heading, status, panel);
  document.querySelector(".controls")?.after(section);

  // React owns the real select; a capture listener keeps our selection out of
  // its state and sends only this method to the wasm runner.
  select.addEventListener(
    "change",
    () => {
      if (select.value === "ifc-wasm-v1" && status)
        status.textContent =
          "IFC WASM выбран. Нужны два .ifc; IFCZIP и FRAG не поддерживаются.";
      else if (status)
        status.textContent = "Выбран существующий Overlay v1.";
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (methodSelect?.value !== "ifc-wasm-v1") return;
      const target = event.target as Element | null;
      const button = target?.closest("button");
      if (!button || button.textContent?.trim() !== "Запустить") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!running) void run();
    },
    true,
  );
}

async function run() {
  running = true;
  previewGeneration += 1;
  activePreview?.dispose();
  activePreview = undefined;
  if (status) status.textContent = "IFC WASM: подготовка входов…";
  if (panel) panel.replaceChildren();
  if (panel?.parentElement) panel.parentElement.style.display = "";
  try {
    const pair = readPair();
    const [left, right] = await readInputs(pair);
    const [leftHash, rightHash] = await Promise.all([
      sha256(left.bytes),
      sha256(right.bytes),
    ]);
    if (status)
      status.textContent = `IFC WASM: ${left.name} ↔ ${right.name}, загрузка wasm…`;

    const instance = await loadWasm();
    const diagnostic = isDiagnostic();
    const repeats = diagnostic ? 1 : 5;
    const totalRuns = 1 + repeats;
    const runs: Run[] = [];
    let lastArtifact: DiffArtifact | undefined;
    const leftMeta = {
      modelKey: left.name,
      version: "left",
      sourceHash: leftHash,
      converterVersion: "ifc-wasm-v1",
      coordinateSystem: "ifc",
      metersPerUnit: 1,
    };
    const rightMeta = {
      modelKey: right.name,
      version: "right",
      sourceHash: rightHash,
      converterVersion: "ifc-wasm-v1",
      coordinateSystem: "ifc",
      metersPerUnit: 1,
    };

    for (let index = 0; index < totalRuns; index++) {
      const warmup = index === 0;
      if (status)
        status.textContent = `IFC WASM: ${warmup ? "прогрев" : `прогон ${index}/${repeats}`}…`;
      const start = performance.now();
      const result = instance.compare(
        left.bytes,
        right.bytes,
        leftMeta,
        rightMeta,
        true,
      );
      const total = performance.now() - start;
      lastArtifact = result.artifact;
      runs.push({
        warmup,
        total,
        stages: result.stages,
        summary: result.summary,
        recreated: result.recreated.length,
        memoryBytes: result.memoryBytes,
      });
    }

    const measured = runs.filter((run) => !run.warmup);
    const totals = measured.map((run) => run.total).sort((a, b) => a - b);
    const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length;
    const percentile = (p: number) =>
      totals.length ? totals[Math.ceil(p * totals.length) - 1]! : null;
    const last = measured.at(-1)!;
    const report = {
      schemaVersion: 1,
      method: "ifc-wasm-v1",
      createdAt: new Date().toISOString(),
      inputs: {
        left: { name: left.name, bytes: left.bytes.byteLength, sourceHash: leftHash },
        right: { name: right.name, bytes: right.bytes.byteLength, sourceHash: rightHash },
      },
      parameters: { pair, repeats, detail: true },
      runs,
      summary: {
        total_mean: mean,
        total_min: totals[0]!,
        total_p50: percentile(0.5),
        total_p95: percentile(0.95),
        ...last.summary,
        recreatedPairs: last.recreated,
        wasmMemoryBytes: last.memoryBytes,
      },
      limitations: [
        "Сравнивается GlobalId и параметры сущности, не геометрия.",
        "IFC WASM не строит сцену и не измеряет FPS.",
        "3D-превью строится после замеров, в отдельном времени и памяти; в total оно не входит.",
      ],
    };

    if (status)
      status.textContent = `IFC WASM: готово · ${mean.toFixed(1)} ms в среднем`;
    renderPanel(report, runs, measured);
    if (lastArtifact)
      void mountPreview(
        left,
        right,
        lastArtifact,
        previewGeneration,
        () => renderPanel(report, runs, measured),
        (metrics) => Object.assign(report.summary, previewSummary(metrics)),
      );
  } catch (error) {
    if (status) status.textContent = `IFC WASM: ${String(error)}`;
  } finally {
    running = false;
  }
}

/**
 * Loads the preview bundle on demand. It is intentionally separate from the
 * method bundle: the measured path stays small, and a preview failure never
 * affects the report.
 */
async function mountPreview(
  left: Input,
  right: Input,
  artifact: DiffArtifact,
  generation: number,
  rerender: () => void,
  applyMetrics: (metrics: IfcPreviewMetrics) => void,
) {
  try {
    const moduleUrl = new URL("./ifc-preview-app.js", import.meta.url).href;
    const module = (await import(/* @vite-ignore */ moduleUrl)) as {
      mountIfcWasmPreview: (
        options: import("./ifc-preview").IfcPreviewOptions,
      ) => IfcPreviewHandle;
    };
    if (generation !== previewGeneration) return;
    const viewport = document.querySelector<HTMLElement>(".viewport");
    if (!viewport) {
      console.warn("IFC preview: .viewport not found");
      return;
    }
    const totalBytes = left.bytes.byteLength + right.bytes.byteLength;
    activePreview = module.mountIfcWasmPreview({
      container: viewport,
      left: { name: left.name, bytes: left.bytes },
      right: { name: right.name, bytes: right.bytes },
      artifact,
      autoStart: totalBytes <= previewThresholdBytes,
      onMetrics: (metrics) => {
        applyMetrics(metrics);
        rerender();
      },
      assets: {
        fragmentsWorkerUrl: new URL(
          "./assets/worker-GQlxtHkx.mjs",
          location.href,
        ).href,
        importWorkerUrl: new URL(
          "./assets/import.worker-DVyIT7Np.js",
          location.href,
        ).href,
        wasmPath: new URL("./wasm/", location.href).href,
        wasmAbsolute: true,
      },
    });
  } catch (error) {
    console.warn("IFC preview failed", error);
  }
}

function previewSummary(metrics: IfcPreviewMetrics): Record<string, unknown> {
  return {
    previewStatus: metrics.status,
    previewTotalMs: metrics.totalMs,
    previewConvertMs: metrics.convertMs,
    previewLoadMs: metrics.loadMs,
    previewHighlightMs: metrics.highlightMs,
    previewModels: metrics.models,
    previewChanged: metrics.changed,
    previewFragBytes: metrics.fragBytes.left + metrics.fragBytes.right,
    previewGeometries: metrics.geometries,
    previewTextures: metrics.textures,
    previewIncludedInWasmTotal: false,
  };
}

function readPair(): string {
  const select = [...document.querySelectorAll("select")].find((candidate) =>
    [...candidate.options].some((option) => option.value === "properties"),
  );
  return select?.value ?? "properties";
}

async function readInputs(pair: string): Promise<[Input, Input]> {
  if (pair === "custom") {
    const files = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')]
      .map((input) => input.files?.[0])
      .filter((file): file is File => file !== undefined);
    if (files.length < 2) throw new Error("выберите оба .ifc");
    if (files.some((file) => !file.name.toLowerCase().endsWith(".ifc")))
      throw new Error("IFC WASM поддерживает только .ifc");
    const [left, right] = files;
    return [
      { name: left!.name, bytes: new Uint8Array(await left!.arrayBuffer()) },
      { name: right!.name, bytes: new Uint8Array(await right!.arrayBuffer()) },
    ];
  }

  const names =
    pair === "controlled"
      ? ["controlled-a.ifc", "controlled-b.ifc"]
      : pair === "self"
        ? ["simple-wall-v1.ifc", "simple-wall-v1.ifc"]
        : [ "simple-wall-v1.ifc", "simple-wall-v2.ifc" ];
  if (pair === "arc")
    throw new Error("пара ARC поставляется только в FRAG; выберите IFC или свои .ifc");
  const base = new URL("./bim-research/", location.href);
  const responses = await Promise.all(
    names.map((name) => fetch(new URL(name, base))),
  );
  if (responses.some((response) => !response.ok))
    throw new Error(`fixture ${responses.find((r) => !r.ok)?.status}`);
  const buffers = await Promise.all(
    responses.map((response) => response.arrayBuffer()),
  );
  return [
    { name: names[0]!, bytes: new Uint8Array(buffers[0]!) },
    { name: names[1]!, bytes: new Uint8Array(buffers[1]!) },
  ];
}

function isDiagnostic(): boolean {
  return [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].some(
    (input) =>
      input.closest("label")?.textContent?.includes("Короткая диагностика") ===
        true && input.checked,
  );
}

function loadWasm(): Promise<IfcDiffWasm> {
  return (wasm ??= (async () => {
    const response = await fetch("/wasm/ifc-diff.wasm");
    if (!response.ok) throw new Error(`wasm ${response.status}`);
    return IfcDiffWasm.instantiate(await response.arrayBuffer());
  })());
}

function renderPanel(
  report: Record<string, unknown> & {
    summary: Record<string, unknown>;
    inputs: Record<string, unknown>;
  },
  runs: Run[],
  measured: Run[],
) {
  if (!panel) return;
  panel.replaceChildren();
  const summary = report.summary as Record<string, number | null>;
  const counts = document.createElement("p");
  const preview =
    summary.previewTotalMs !== undefined && summary.previewTotalMs !== null
      ? ` · превью ${String(summary.previewStatus ?? "")} ${Math.round(Number(summary.previewTotalMs))} ms (вне замера)`
      : "";
  counts.textContent = `unchanged ${summary.unchanged ?? "?"} · added ${summary.added ?? "?"} · removed ${summary.removed ?? "?"} · modified ${summary.modified ?? "?"} · unknown ${summary.unknown ?? "?"} · recreated pairs ${summary.recreatedPairs ?? "?"} · wasm ${summary.wasmMemoryBytes ? (Number(summary.wasmMemoryBytes) / 1048576).toFixed(0) + " MiB" : "?"}${preview}`;
  panel.append(counts);

  const table = document.createElement("table");
  table.className = "metrics-table";
  table.innerHTML =
    "<thead><tr><th>Прогон</th><th>copy</th><th>diff</th><th>decode</th><th>artifact</th><th>total</th></tr></thead>";
  const body = document.createElement("tbody");
  for (const [index, run] of measured.entries()) {
    const row = document.createElement("tr");
    for (const value of [
      String(index + 1),
      (run.stages.copyLeft + run.stages.copyRight).toFixed(1),
      run.stages.diff.toFixed(1),
      run.stages.decode.toFixed(1),
      run.stages.artifact.toFixed(1),
      run.total.toFixed(1),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body);
  panel.append(table);

  const download = document.createElement("button");
  download.textContent = "Скачать JSON повторно";
  download.style.marginTop = "12px";
  download.addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ifc-wasm-${Date.now()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  panel.append(download);
}

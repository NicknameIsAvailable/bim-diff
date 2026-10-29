import { readFile, writeFile } from "node:fs/promises";
import { sha256, stableStringify } from "../packages/bim-diff-core/src/index.js";
import {
  IfcDiffWasm,
  type IfcWasmCompareResult,
  type IfcWasmSummary,
} from "./ifc-diff-wasm";

const args = process.argv.slice(2);
const positional: string[] = [];
let bench = false;
let summaryOnly = false;
let json = false;
let repeats = 5;

for (let index = 0; index < args.length; index++) {
  const arg = args[index]!;
  if (arg === "--bench") bench = true;
  else if (arg === "--summary") summaryOnly = true;
  else if (arg === "--json") json = true;
  else if (arg === "--repeats") {
    repeats = Number(args[++index]);
    if (!Number.isInteger(repeats) || repeats < 1)
      throw new Error("--repeats must be a positive integer");
  } else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
  else positional.push(arg);
}

const [leftPath, rightPath, outputPath] = positional;
if (!leftPath || !rightPath) {
  console.error(
    "Usage: npm run compare:ifc -- <left.ifc> <right.ifc> [out.json] [--bench] [--repeats N] [--summary] [--json]",
  );
  process.exit(1);
}

const [left, right] = await Promise.all([
  readFile(leftPath),
  readFile(rightPath),
]);
const [leftHash, rightHash] = await Promise.all([
  sha256(left),
  sha256(right),
]);
const wasm = await loadWasm();

const leftMeta = {
  modelKey: leftPath,
  version: "left",
  sourceHash: leftHash,
  converterVersion: "ifc-wasm-v1",
  coordinateSystem: "ifc",
  metersPerUnit: 1,
};
const rightMeta = {
  modelKey: rightPath,
  version: "right",
  sourceHash: rightHash,
  converterVersion: "ifc-wasm-v1",
  coordinateSystem: "ifc",
  metersPerUnit: 1,
};

if (!bench) {
  const result = wasm.compare(left, right, leftMeta, rightMeta, !summaryOnly);
  const text = summaryOnly
    ? stableStringify({
        summary: result.summary,
        recreated: result.recreated,
        ambiguousPairs: result.ambiguousPairs,
        stages: result.stages,
        memoryBytes: result.memoryBytes,
      })
    : stableStringify(result.artifact);
  if (outputPath) {
    await writeFile(outputPath, text + "\n");
    console.error(`wrote ${outputPath}`);
  } else {
    process.stdout.write(text + "\n");
  }
} else {
  const runs: {
    warmup: boolean;
    stages: IfcWasmCompareResult["stages"];
    total: number;
    summary: IfcWasmSummary;
    recreated: number;
    memoryBytes: number;
  }[] = [];
  const totalRuns = 1 + repeats;
  for (let index = 0; index < totalRuns; index++) {
    const warmup = index === 0;
    const start = performance.now();
    const result = wasm.compare(left, right, leftMeta, rightMeta, !summaryOnly);
    const total = performance.now() - start;
    runs.push({
      warmup,
      stages: result.stages,
      total,
      summary: result.summary,
      recreated: result.recreated.length,
      memoryBytes: result.memoryBytes,
    });
    if (!json)
      console.error(
        `${warmup ? "warmup" : `run ${index}`}: diff ${result.stages.diff.toFixed(1)} ms, total ${total.toFixed(1)} ms`,
      );
  }

  const measured = runs.filter((run) => !run.warmup);
  const totals = measured.map((run) => run.total).sort((a, b) => a - b);
  const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const percentile = (p: number) =>
    totals.length ? totals[Math.ceil(p * totals.length) - 1]! : null;
  const last = measured.at(-1)!;

  if (json) {
    const report = {
      schemaVersion: 1,
      method: "ifc-wasm-v1",
      inputs: {
        left: { path: leftPath, bytes: left.byteLength, sourceHash: leftHash },
        right: { path: rightPath, bytes: right.byteLength, sourceHash: rightHash },
      },
      parameters: { repeats, detail: !summaryOnly },
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
    };
    process.stdout.write(stableStringify(report) + "\n");
  } else {
    console.log(`\nIFC WASM · ${leftPath} vs ${rightPath}`);
    console.log(
      `  unchanged ${last.summary.unchanged}  added ${last.summary.added}  removed ${last.summary.removed}  modified ${last.summary.modified}  unknown ${last.summary.unknown}`,
    );
    console.log(
      `  recreated pairs ${last.recreated}  wasm memory ${(last.memoryBytes / 1048576).toFixed(0)} MiB`,
    );
    console.log(
      `  total mean ${mean.toFixed(1)} ms  p50 ${percentile(0.5)?.toFixed(1)} ms  p95 ${percentile(0.95)?.toFixed(1)} ms`,
    );
    console.table(
      measured.map((run, index) => ({
        run: index + 1,
        copy: +(run.stages.copyLeft + run.stages.copyRight).toFixed(1),
        diff: +run.stages.diff.toFixed(1),
        decode: +run.stages.decode.toFixed(1),
        artifact: +run.stages.artifact.toFixed(1),
        total: +run.total.toFixed(1),
      })),
    );
  }
}

async function loadWasm(): Promise<IfcDiffWasm> {
  const path = new URL("./assets/ifc-diff.wasm", import.meta.url);
  try {
    return await IfcDiffWasm.instantiate(await readFile(path));
  } catch (error) {
    throw new Error(
      `Cannot load ${path.pathname}. Run "npm run build:wasm" first. ${String(error)}`,
    );
  }
}

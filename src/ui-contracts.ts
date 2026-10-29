import type { BenchmarkReport } from "../packages/bim-diff-core/src/index.js";

/** UI-owned contracts. The host supplies the actual benchmark implementation. */
export type ResearchMode = "single" | "parallel" | "overlay-a" | "overlay-b";
export type DiffMethod = "overlay-v1" | "ifc-wasm-v1";
export type ResearchInput = {
  name: string;
  bytes: Uint8Array;
  format: "ifc" | "ifczip" | "frag";
  metersPerUnit: number;
  coordinateSystem: string;
};
export type ProtocolOptions = {
  mode: ResearchMode;
  scenario: "ifc" | "frag" | "indexes" | "cached";
  diffMethod?: DiffMethod;
  duration: number;
  repeats: number;
  device: string;
  diagnostic: boolean;
};
export type BenchmarkRunner = (
  container: HTMLElement,
  pair: [ResearchInput, ResearchInput],
  options: ProtocolOptions,
  signal: AbortSignal,
  progress: (message: string) => void,
  onReport: (report: BenchmarkReport) => void,
) => Promise<BenchmarkReport>;

export const overlayColors = {
  unchanged: "#aeb8c4", added: "#24b77d", removed: "#e34e59",
  "modified-old": "#cf7bdd", "modified-new": "#e8b43b", unknown: "#737373",
};

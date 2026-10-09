export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export type CompareOptions = {
  coordinateTolerance: number;
  rotationTolerance: number;
  propertyPolicy: "ordered-json-v1";
};
export const defaultOptions: CompareOptions = {
  coordinateTolerance: 0.0001,
  rotationTolerance: 0.000001,
  propertyPolicy: "ordered-json-v1",
};
export const identity = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
] as const;
export type Diagnostic = {
  code: string;
  message: string;
  localId?: number;
  side?: "left" | "right";
};
export type RawMesh = {
  positions: number[];
  indices?: number[];
  transform: number[];
};
export type RawElement = {
  localId: number;
  globalId: string | null;
  properties: Record<string, JsonValue>;
  meshes: RawMesh[];
  diagnostics?: Diagnostic[];
};
export type IndexedElement = {
  localId: number;
  globalId: string | null;
  properties: Record<string, JsonValue>;
  propertyHash: string;
  shapeHash: string;
  placementHash: string;
  arrangementHash: string;
  complete: boolean;
  diagnostics: Diagnostic[];
};
export type ModelIndex = {
  schemaVersion: 1;
  algorithmVersion: "overlay-v1";
  modelKey: string;
  version: string;
  sourceHash: string;
  converterVersion: string;
  metersPerUnit: number | null;
  coordinateSystem: string | null;
  modelTransform: number[];
  options: CompareOptions;
  elements: IndexedElement[];
  diagnostics: Diagnostic[];
};
export type ElementRef = {
  modelKey: string;
  version: string;
  sourceHash: string;
  localId: number;
  globalId: string | null;
};
export type Change = {
  key: string;
  kind: "unchanged" | "added" | "removed" | "modified" | "unknown";
  facets: ("properties" | "shape" | "position")[];
  left: ElementRef | null;
  right: ElementRef | null;
};
export type DiffArtifact = {
  schemaVersion: 1;
  algorithmVersion: "overlay-v1";
  left: Pick<
    ModelIndex,
    | "modelKey"
    | "version"
    | "sourceHash"
    | "converterVersion"
    | "coordinateSystem"
    | "metersPerUnit"
    | "modelTransform"
  >;
  right: Pick<
    ModelIndex,
    | "modelKey"
    | "version"
    | "sourceHash"
    | "converterVersion"
    | "coordinateSystem"
    | "metersPerUnit"
    | "modelTransform"
  >;
  options: CompareOptions;
  changes: Change[];
  diagnostics: Diagnostic[];
};
export type OverlayPlan = {
  schemaVersion: 1;
  items: {
    ref: ElementRef;
    side: "left" | "right";
    style:
      | "unchanged"
      | "added"
      | "removed"
      | "modified-old"
      | "modified-new"
      | "unknown";
  }[];
};
export type Metric = { value: number | null; unit: string; reason?: string };
export type BenchmarkRun = {
  mode: string;
  scenario: string;
  repetition: number;
  warmup: boolean;
  valid: boolean;
  issues: string[];
  stages: Record<string, number>;
  metrics: Record<string, Metric>;
  /** Raw observations, separated by run; times relative to run start. */
  samples?: Record<string, JsonValue[]>;
  startedAt?: string;
  frameTimes: number[];
  renderedFrames: number;
  cache: Record<string, number>;
  resources: Record<string, number>;
  status: "complete" | "failed" | "cancelled";
  error?: string;
};
export type BenchmarkReport = {
  schemaVersion: 1;
  build: {
    revision: string;
    dirty: boolean;
    dependencies: Record<string, string>;
  };
  device: Record<string, JsonValue>;
  parameters: Record<string, JsonValue>;
  inputs: Record<string, JsonValue>;
  runs: BenchmarkRun[];
  summary: Record<string, JsonValue>;
  limitations: string[];
};

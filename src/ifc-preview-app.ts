// Standalone entry point for the `npm start` runner. Built as its own bundle
// so the method script can load three.js and Fragments only after the
// measured runs have completed.
export { mountIfcWasmPreview } from "./ifc-preview";
export type {
  IfcPreviewAssets,
  IfcPreviewHandle,
  IfcPreviewMetrics,
  IfcPreviewOptions,
  PreviewInput,
} from "./ifc-preview";

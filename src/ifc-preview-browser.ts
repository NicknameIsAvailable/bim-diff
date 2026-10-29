// Vite-aware entry point for the preview. URLs are resolved by the bundler so
// the same viewer works in `dev:ui` and in the built UI.
import fragmentsWorkerUrl from "@thatopen/fragments/worker?url";
import type { DiffArtifact } from "../packages/bim-diff-core/src/index.js";
import {
  mountIfcWasmPreview,
  type IfcPreviewHandle,
  type IfcPreviewMetrics,
  type PreviewInput,
} from "./ifc-preview";

export function mountBrowserPreview(options: {
  container: HTMLElement;
  left: PreviewInput;
  right: PreviewInput;
  artifact: Pick<DiffArtifact, "changes">;
  signal?: AbortSignal;
  autoStart?: boolean;
  onMetrics?: (metrics: IfcPreviewMetrics) => void;
}): IfcPreviewHandle {
  return mountIfcWasmPreview({
    ...options,
    assets: {
      fragmentsWorkerUrl,
      importWorkerUrl: new URL(
        "assets/import.worker-DVyIT7Np.js",
        document.baseURI,
      ).href,
      wasmPath: new URL("web-ifc/", document.baseURI).href,
      wasmAbsolute: true,
    },
  });
}

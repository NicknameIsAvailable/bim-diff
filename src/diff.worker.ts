import { compareIndexes, normalizeElement } from "../packages/bim-diff-core/src/index.js";

self.onmessage = async (event: MessageEvent) => {
  const { id, operation, payload } = event.data;
  try {
    const result =
      operation === "normalize"
        ? await normalizeElement(
            payload.element,
            payload.options,
            payload.metersPerUnit,
            payload.modelTransform,
          )
        : compareIndexes(payload.left, payload.right);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

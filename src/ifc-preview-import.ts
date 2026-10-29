/**
 * Calls the same prebuilt `import.worker` chunk that the production runner
 * uses: IFC (or IFCZIP) → compressed `.frag`. Keeping this tiny RPC client
 * avoids shipping a second copy of web-ifc/Fragments just for conversion.
 */
export type ImportAssets = {
  importWorkerUrl: string;
  wasmPath: string;
  wasmAbsolute: boolean;
};

type ImportResponse = {
  bytes?: ArrayBuffer;
  progress?: number;
  error?: string;
};

type Pending = {
  resolve: (bytes: Uint8Array) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
};

export class ImportClient {
  private worker: Worker;
  private pending: Pending | undefined;
  private disposed = false;

  constructor(private assets: ImportAssets) {
    this.worker = new Worker(assets.importWorkerUrl, { type: "module" });
    this.worker.onmessage = (event: MessageEvent<ImportResponse>) => {
      const response = event.data;
      if (response.progress !== undefined) {
        this.pending?.onProgress?.(response.progress);
        return;
      }
      const pending = this.pending;
      this.pending = undefined;
      if (!pending) return;
      if (response.error || !response.bytes)
        pending.reject(new Error(response.error ?? "IFC conversion failed"));
      else pending.resolve(new Uint8Array(response.bytes));
    };
    this.worker.onerror = (event) => {
      this.fail(new Error(event.message));
    };
  }

  call(
    bytes: Uint8Array,
    signal: AbortSignal | undefined,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    if (this.disposed) return Promise.reject(new Error("Worker disposed"));
    throwIfAborted(signal);
    const copy = bytes.slice();
    return new Promise<Uint8Array>((resolve, reject) => {
      this.pending = { resolve, reject, onProgress };
      try {
        this.worker.postMessage(
          {
            bytes: copy,
            format: "ifc",
            wasmPath: this.assets.wasmPath,
          },
          [copy.buffer],
        );
      } catch (error) {
        this.pending = undefined;
        reject(error);
      }
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    this.fail(new Error("Preview cancelled"));
  }

  private fail(error: Error) {
    const pending = this.pending;
    this.pending = undefined;
    pending?.reject(error);
  }
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

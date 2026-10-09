/** Owns one bounded worker, terminating it on abort rather than leaving stale work. */
export class DiffWorkerClient {
  private worker = new Worker(new URL("./diff.worker.ts", import.meta.url), {
    type: "module",
  });
  private sequence = 0;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private closed = false;
  transferMs = 0;
  constructor(private signal: AbortSignal) {
    this.worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.id);
      this.pending.delete(data.id);
      if (data.error) pending?.reject(new Error(data.error));
      else pending?.resolve(data.result);
    };
    this.worker.onerror = (event) => this.dispose(new Error(event.message));
    signal.addEventListener("abort", this.abort, { once: true });
    if (signal.aborted) this.abort();
  }
  private abort = () =>
    this.dispose(new DOMException("Cancelled", "AbortError"));
  async call<T>(operation: string, payload: unknown): Promise<T> {
    this.signal.throwIfAborted();
    if (this.closed) throw new Error("Worker closed");
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      const start = performance.now();
      try {
        this.worker.postMessage({ id, operation, payload });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      } finally {
        this.transferMs += performance.now() - start;
      }
    });
  }
  dispose(error = new Error("Worker disposed")): void {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
    this.signal.removeEventListener("abort", this.abort);
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

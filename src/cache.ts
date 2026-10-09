import { sha256, stableStringify } from "../packages/bim-diff-core/src/index.js";

export type CacheLayer = "models" | "indexes" | "diffs" | "subsets";
/** Namespaces persisted artifacts and treats quota/corruption as cache misses. */
export class ResearchCache {
  hits: Record<string, number> = {};
  warnings: string[] = [];
  private db: Promise<IDBDatabase>;
  constructor() {
    this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open("graphdoc-bim-research-v1", 1);
      request.onupgradeneeded = () => {
        for (const layer of ["models", "indexes", "diffs", "subsets"])
          request.result.createObjectStore(layer);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    void this.db.catch(() => undefined);
  }
  async key(parameters: unknown): Promise<string> {
    return sha256(stableStringify(parameters));
  }
  private async operation<T>(
    layer: CacheLayer,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(layer, mode);
      const request = action(transaction.objectStore(layer));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  async read<T>(layer: CacheLayer, key: string): Promise<T | null> {
    try {
      const record = await this.operation(layer, "readonly", (s) => s.get(key));
      if (!record) return null;
      const hash = await sha256(
        record.value instanceof Uint8Array
          ? record.value
          : stableStringify(record.value),
      );
      if (hash !== record.hash) {
        await this.operation(layer, "readwrite", (s) => s.delete(key));
        this.warnings.push(`Corrupt ${layer} evicted`);
        return null;
      }
      this.hits[layer] = (this.hits[layer] ?? 0) + 1;
      return record.value as T;
    } catch (error) {
      this.warnings.push(String(error));
      return null;
    }
  }
  async write(layer: CacheLayer, key: string, value: unknown): Promise<void> {
    try {
      const hash = await sha256(
        value instanceof Uint8Array ? value : stableStringify(value),
      );
      await this.operation(layer, "readwrite", (s) =>
        s.put({ value, hash }, key),
      );
    } catch (error) {
      this.warnings.push(`Cache write skipped: ${error}`);
    }
  }
  async clear(): Promise<void> {
    for (const layer of ["models", "indexes", "diffs", "subsets"] as const)
      try {
        await this.operation(layer, "readwrite", (s) => s.clear());
      } catch (error) {
        this.warnings.push(String(error));
      }
    this.hits = {};
  }
  async close(): Promise<void> {
    try {
      (await this.db).close();
    } catch {
      /* Unavailable IndexedDB is already reported. */
    }
  }
}

/**
 * Small IndexedDB cache for converted `.frag` bytes. The expensive part of the
 * preview is web-ifc parsing/tessellation, so reusing the result by source
 * hash turns repeated previews of the same files into a load-only operation.
 */
const databaseName = "bim-diff-preview-cache";
const storeName = "fragments";
const metaStoreName = "metadata";
const databaseVersion = 2;
const maxEntries = 8;
const maxBytes = 512 * 1024 ** 2;

/** Bump when the renderer's converter stack changes. */
export const fragmentConverter = "fragments-3.4.6/web-ifc-0.0.77";

type CacheRecord = {
  key: string;
  bytes: ArrayBuffer;
};

type CacheMeta = {
  key: string;
  createdAt: number;
  size: number;
};

export function fragmentCacheKey(sourceHash: string): string {
  return `${fragmentConverter}:${sourceHash}`;
}

export async function readFragCache(key: string): Promise<Uint8Array | undefined> {
  try {
    const database = await open();
    try {
      const record = await request<CacheRecord | undefined>(
        database.transaction(storeName).objectStore(storeName).get(key),
      );
      return record ? new Uint8Array(record.bytes) : undefined;
    } finally {
      database.close();
    }
  } catch {
    return undefined;
  }
}

export async function writeFragCache(
  key: string,
  bytes: Uint8Array,
): Promise<void> {
  try {
    const database = await open();
    try {
      const record: CacheRecord = {
        key,
        bytes: bytes.slice().buffer,
      };
      const meta: CacheMeta = {
        key,
        createdAt: Date.now(),
        size: bytes.byteLength,
      };
      const transaction = database.transaction(
        [storeName, metaStoreName],
        "readwrite",
      );
      transaction.objectStore(storeName).put(record);
      transaction.objectStore(metaStoreName).put(meta);
      await transactionDone(transaction);
      await prune(database);
    } finally {
      database.close();
    }
  } catch {
    // A full or unavailable cache must never break the preview.
  }
}

export async function clearFragCache(): Promise<void> {
  try {
    const database = await open();
    try {
      const transaction = database.transaction(
        [storeName, metaStoreName],
        "readwrite",
      );
      transaction.objectStore(storeName).clear();
      transaction.objectStore(metaStoreName).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  } catch {
    /* ignore */
  }
}

async function prune(database: IDBDatabase): Promise<void> {
  const records = await request<CacheMeta[]>(
    database.transaction(metaStoreName).objectStore(metaStoreName).getAll(),
  );
  records.sort((a, b) => a.createdAt - b.createdAt);
  let size = records.reduce((sum, record) => sum + record.size, 0);
  let count = records.length;
  const stale = new Set<string>();
  while (count > maxEntries || size > maxBytes) {
    const record = records.shift();
    if (!record) break;
    count -= 1;
    size -= record.size;
    stale.add(record.key);
  }
  if (!stale.size) return;
  const transaction = database.transaction(
    [storeName, metaStoreName],
    "readwrite",
  );
  const fragments = transaction.objectStore(storeName);
  const meta = transaction.objectStore(metaStoreName);
  for (const key of stale) {
    fragments.delete(key);
    meta.delete(key);
  }
  await transactionDone(transaction);
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(databaseName, databaseVersion);
    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;
      if (!database.objectStoreNames.contains(storeName))
        database.createObjectStore(storeName, { keyPath: "key" });
      if (!database.objectStoreNames.contains(metaStoreName)) {
        const meta = database.createObjectStore(metaStoreName, {
          keyPath: "key",
        });
        meta.createIndex("createdAt", "createdAt");
      }
    };
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
}

function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

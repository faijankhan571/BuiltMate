import { AttendanceRecord, TaskRecord } from '../types';

export type OfflineMutationType = 'RECORD_ATTENDANCE' | 'ADD_TASK' | 'UPDATE_TASK';

export interface OfflineAttendancePayload {
  input: Omit<AttendanceRecord, 'attendance_id'>;
  allowOverwrite?: boolean;
  tempAttendanceId: number;
}

export interface OfflineAddTaskPayload {
  input: Omit<TaskRecord, 'task_id' | 'created_at'>;
  tempTaskId: number;
}

export interface OfflineUpdateTaskPayload {
  task_id: number;
  updates: Partial<TaskRecord>;
}

export interface OfflineSyncMutation {
  id: string;
  type: OfflineMutationType;
  payload:
    | OfflineAttendancePayload
    | OfflineAddTaskPayload
    | OfflineUpdateTaskPayload;
  createdAt: string;
  recordedBy: string;
  retryCount: number;
}

const DB_NAME = 'buildmate_workforce_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_sync_queue';
const CACHE_STORE = 'offline_table_cache';

// In-memory fallback for Node.js unit test environments where window.indexedDB is not present
const memoryQueue = new Map<string, OfflineSyncMutation>();
const memoryCache = new Map<string, unknown>();

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineSyncMutation, 'id' | 'createdAt' | 'retryCount'> & {
    id?: string;
    createdAt?: string;
  }
): Promise<OfflineSyncMutation> {
  const fullItem: OfflineSyncMutation = {
    id:
      mutation.id ||
      `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: mutation.type,
    payload: mutation.payload,
    recordedBy: mutation.recordedBy,
    createdAt: mutation.createdAt || new Date().toISOString(),
    retryCount: 0,
  };

  if (!hasIndexedDB()) {
    memoryQueue.set(fullItem.id, fullItem);
    return fullItem;
  }

  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    store.put(fullItem);
    tx.oncomplete = () => {
      db.close();
      resolve(fullItem);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to enqueue offline mutation in IndexedDB'));
    };
  });
}

export async function getPendingOfflineMutations(): Promise<OfflineSyncMutation[]> {
  if (!hasIndexedDB()) {
    return Array.from(memoryQueue.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const items = (req.result || []) as OfflineSyncMutation[];
        items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        resolve(items);
      };
      req.onerror = () => {
        db.close();
        reject(req.error || new Error('Failed to read IndexedDB offline queue'));
      };
    });
  } catch {
    return Array.from(memoryQueue.values());
  }
}

export async function removeOfflineMutation(id: string): Promise<void> {
  memoryQueue.delete(id);
  if (!hasIndexedDB()) return;

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Failed to remove item from IndexedDB'));
      };
    });
  } catch {
    // ignore cleanup error
  }
}

export async function clearOfflineMutations(): Promise<void> {
  memoryQueue.clear();
  if (!hasIndexedDB()) return;

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Failed to clear IndexedDB queue'));
      };
    });
  } catch {
    // ignore cleanup error
  }
}

export async function saveCachedStateToIndexedDB<T>(
  key: string,
  data: T
): Promise<void> {
  memoryCache.set(key, data);
  if (!hasIndexedDB()) return;

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      store.put({ key, data, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Failed to cache table in IndexedDB'));
      };
    });
  } catch {
    // ignore cache error
  }
}

export async function loadCachedStateFromIndexedDB<T>(
  key: string
): Promise<T | null> {
  if (!hasIndexedDB()) {
    return (memoryCache.get(key) as T) ?? null;
  }

  try {
    const db = await openOfflineDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        const res = req.result as { key: string; data: T } | undefined;
        resolve(res ? res.data : null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error || new Error('Failed to read cached state from IndexedDB'));
      };
    });
  } catch {
    return (memoryCache.get(key) as T) ?? null;
  }
}

export function registerWorkforceServiceWorker(
  onSyncRequested: () => void
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SYNC_OFFLINE_QUEUE') {
      onSyncRequested();
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      if (registration.active && navigator.onLine) {
        registration.active.postMessage({ type: 'CLIENT_READY' });
      }
    })
    .catch(() => {
      // Service worker registration optional if unsupported by preview frame
    });

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

export async function requestServiceWorkerSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync.register('buildmate-workforce-sync');
    } else if (registration.active) {
      registration.active.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
    }
  } catch {
    // Fallback handled by window online listener
  }
}

/**
 * SKOLAR Control Center - Authoritative Cloud + Local Persistence Engine
 *
 * Architecture:
 * 1. Awaits Firebase Auth readiness before executing remote Firestore queries (prevents race condition on refresh)
 * 2. Live Firestore synchronization on initial page load & manual Refresh (ensures zero stale or missing data)
 * 3. Instant in-memory cache for sub-millisecond in-app navigation
 * 4. Persistent LocalStorage fallback with _pendingSync reconciliation so offline writes auto-sync once connected
 */

import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, waitForAuthReady } from './firebase';

const memoryStore: Map<string, any[]> = new Map();
const syncedCollectionsThisSession: Set<string> = new Set();
const inFlightFetches: Map<string, Promise<any[]>> = new Map();
const CLOUD_OPERATION_TIMEOUT_MS = 8000;

/**
 * Deep sanitization: Recursively removes all undefined keys from objects and arrays,
 * preventing Firestore "Unsupported field value: undefined" errors.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)) as any;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          cleaned[key] = cleanFirestoreData(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Promise timeout wrapper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = CLOUD_OPERATION_TIMEOUT_MS,
  fallback?: T
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);

    promise
      .then((res) => {
        if (!timedOut) {
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch((err) => {
        if (!timedOut) {
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

function getIdKey(item: Record<string, any>): string {
  return item.id || item.uid || '';
}

function stripInternalFlags<T extends Record<string, any>>(item: T): T {
  const { _pendingSync, ...rest } = item;
  return cleanFirestoreData(rest) as T;
}

/**
 * Checks whether a collection has been populated in local storage
 */
export function isCollectionInitialized(collectionName: string): boolean {
  if (syncedCollectionsThisSession.has(collectionName) || memoryStore.has(collectionName)) return true;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(`skolar_init_${collectionName}`) === 'true';
    }
  } catch {}
  return false;
}

/**
 * Retrieves cached collection items from memory or localStorage.
 * Returns null ONLY if the collection has never been cached.
 */
export function getLocalCache<T>(collectionName: string): T[] | null {
  if (memoryStore.has(collectionName)) {
    return (memoryStore.get(collectionName) || []) as T[];
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(`skolar_data_${collectionName}`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memoryStore.set(collectionName, parsed);
          return parsed as T[];
        }
      }
    }
  } catch (e) {
    console.warn(`LocalStorage read notice for ${collectionName}:`, e);
  }

  return null;
}

/**
 * Updates both in-memory store and localStorage mirror immediately.
 */
export function setLocalCache<T>(collectionName: string, items: T[]): void {
  const safeItems = Array.isArray(items) ? items : [];
  memoryStore.set(collectionName, safeItems);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`skolar_data_${collectionName}`, JSON.stringify(safeItems));
      localStorage.setItem(`skolar_init_${collectionName}`, 'true');
    }
  } catch (e) {
    console.warn(`LocalStorage write notice for ${collectionName}:`, e);
  }
}

/**
 * Adds or replaces an item immediately in the local store.
 */
export function addToLocalCache<T extends Record<string, any>>(collectionName: string, item: T): void {
  const current = getLocalCache<T>(collectionName) || [];
  const itemId = getIdKey(item);
  const filtered = current.filter((i) => getIdKey(i) !== itemId);
  const updated = [item, ...filtered];
  setLocalCache(collectionName, updated);
}

/**
 * Updates an item immediately in the local store.
 */
export function updateInLocalCache<T extends Record<string, any>>(
  collectionName: string,
  id: string,
  updates: Partial<T>
): void {
  const current = getLocalCache<T>(collectionName) || [];
  const updated = current.map((i) => (getIdKey(i) === id ? { ...i, ...updates } : i));
  setLocalCache(collectionName, updated);
}

/**
 * Removes an item immediately from the local store.
 */
export function removeFromLocalCache<T extends Record<string, any>>(collectionName: string, id: string): void {
  const current = getLocalCache<T>(collectionName) || [];
  const updated = current.filter((i) => getIdKey(i) !== id);
  setLocalCache(collectionName, updated);
}

/**
 * Marks collections as needing fresh Firestore sync on next read WITHOUT destroying localStorage backup.
 */
export function invalidateCache(collectionName?: string): void {
  if (collectionName) {
    syncedCollectionsThisSession.delete(collectionName);
    memoryStore.delete(collectionName);
  } else {
    syncedCollectionsThisSession.clear();
    memoryStore.clear();
  }
}

/**
 * Authoritative Synced Fetch:
 * - If already synced from Firestore in this session & not forced, returns 0ms memory cache.
 * - On fresh page load or manual refresh, awaits Firebase Auth hydration, fetches live Firestore docs,
 *   pushes any locally queued offline items (_pendingSync), and stores merged truth in cache + localStorage.
 */
export async function fetchCollectionSynced<T extends Record<string, any>>(
  collectionName: string,
  options: {
    forceRemote?: boolean;
    seedIfRemoteEmpty?: T[];
    idField?: 'id' | 'uid';
  } = {}
): Promise<T[]> {
  const idField = options.idField || 'id';

  if (!options.forceRemote && syncedCollectionsThisSession.has(collectionName)) {
    const mem = getLocalCache<T>(collectionName);
    if (mem !== null) return [...mem];
  }

  // Deduplicate concurrent identical fetches (e.g. Dashboard + Sidebar mounting simultaneously)
  const existingPromise = inFlightFetches.get(collectionName);
  if (existingPromise && !options.forceRemote) {
    return existingPromise;
  }

  const syncTask = (async (): Promise<T[]> => {
    const localSnapshot = getLocalCache<T>(collectionName) || [];

    try {
      const isAuthed = await waitForAuthReady();
      if (!isAuthed) {
        // Not signed into Firebase yet (or offline session): safely preserve localStorage data
        if (localSnapshot.length === 0 && options.seedIfRemoteEmpty) {
          setLocalCache(collectionName, options.seedIfRemoteEmpty);
          return [...options.seedIfRemoteEmpty];
        }
        return [...localSnapshot];
      }

      const colRef = collection(db, collectionName);
      const snapshot = await withTimeout(getDocs(colRef), CLOUD_OPERATION_TIMEOUT_MS);

      const remoteMap = new Map<string, T>();
      snapshot.docs.forEach((d) => {
        const item = { [idField]: d.id, ...d.data() } as T;
        remoteMap.set(d.id, item);
      });

      // Flush any locally queued offline records up to Firestore
      const pendingItems = localSnapshot.filter((item) => (item as any)._pendingSync);
      if (pendingItems.length > 0) {
        await Promise.allSettled(
          pendingItems.map(async (item) => {
            const docId = item[idField] || item.id || item.uid;
            if (!docId) return;
            const cleaned = stripInternalFlags(item);
            await setDoc(doc(db, collectionName, docId), cleaned, { merge: true });
            remoteMap.set(docId, cleaned);
          })
        );
      }

      // If Firestore collection is completely empty and caller provides baseline defaults (countries / custom fields), seed them cleanly
      if (remoteMap.size === 0 && options.seedIfRemoteEmpty && options.seedIfRemoteEmpty.length > 0) {
        try {
          const batch = writeBatch(db);
          options.seedIfRemoteEmpty.forEach((item) => {
            const docId = item[idField] || item.id;
            if (docId) {
              const cleaned = stripInternalFlags(item);
              batch.set(doc(db, collectionName, docId), cleaned);
              remoteMap.set(docId, cleaned);
            }
          });
          await withTimeout(batch.commit(), CLOUD_OPERATION_TIMEOUT_MS);
        } catch (seedErr) {
          console.debug(`Baseline remote seed notice for ${collectionName}:`, seedErr);
          options.seedIfRemoteEmpty.forEach((item) => {
            const docId = item[idField] || item.id;
            if (docId) remoteMap.set(docId, item);
          });
        }
      }

      const merged = Array.from(remoteMap.values());
      setLocalCache(collectionName, merged);
      syncedCollectionsThisSession.add(collectionName);
      return [...merged];
    } catch (err: any) {
      console.warn(`Firestore sync fallback for ${collectionName}:`, err?.code || err?.message);
      if (localSnapshot.length > 0) {
        return [...localSnapshot];
      }
      if (options.seedIfRemoteEmpty) {
        setLocalCache(collectionName, options.seedIfRemoteEmpty);
        return [...options.seedIfRemoteEmpty];
      }
      return [];
    } finally {
      inFlightFetches.delete(collectionName);
    }
  })();

  inFlightFetches.set(collectionName, syncTask);
  return syncTask;
}

/**
 * Authoritative Write:
 * Immediately writes to local cache AND awaits Cloud Firestore confirmation when authenticated
 * so refreshing right after save always retains data in Cloud Firestore.
 */
export async function writeDocSynced<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T,
  merge: boolean = true
): Promise<T> {
  const cleaned = stripInternalFlags(data);

  // Optimistic local store update with pending flag until cloud confirms
  addToLocalCache(collectionName, { ...cleaned, _pendingSync: true } as any);

  try {
    const isAuthed = await waitForAuthReady();
    if (isAuthed) {
      const docRef = doc(db, collectionName, docId);
      await withTimeout(setDoc(docRef, cleaned, { merge }), CLOUD_OPERATION_TIMEOUT_MS);
      // Confirmed in Cloud Firestore -> clear pending marker
      addToLocalCache(collectionName, cleaned);
      syncedCollectionsThisSession.add(collectionName);
    }
  } catch (err: any) {
    console.warn(`[Cloud Write Pending - ${collectionName}/${docId}]: Retained locally:`, err?.code || err?.message);
  }

  return cleaned;
}

/**
 * Authoritative Partial Update:
 * Merges updates in local cache and awaits Cloud Firestore merge write.
 */
export async function updateDocSynced<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  const cleanedUpdates = stripInternalFlags(updates as any);
  updateInLocalCache(collectionName, docId, { ...cleanedUpdates, _pendingSync: true } as any);

  try {
    const isAuthed = await waitForAuthReady();
    if (isAuthed) {
      const docRef = doc(db, collectionName, docId);
      await withTimeout(setDoc(docRef, cleanedUpdates, { merge: true }), CLOUD_OPERATION_TIMEOUT_MS);
      updateInLocalCache(collectionName, docId, { ...cleanedUpdates, _pendingSync: undefined } as any);
    }
  } catch (err: any) {
    console.warn(`[Cloud Update Pending - ${collectionName}/${docId}]: Retained locally:`, err?.code || err?.message);
  }
}

/**
 * Authoritative Delete:
 * Removes from local cache AND awaits Cloud Firestore deleteDoc.
 */
export async function deleteDocSynced(collectionName: string, docId: string): Promise<void> {
  removeFromLocalCache(collectionName, docId);

  try {
    const isAuthed = await waitForAuthReady();
    if (isAuthed) {
      const docRef = doc(db, collectionName, docId);
      await withTimeout(deleteDoc(docRef), CLOUD_OPERATION_TIMEOUT_MS);
    }
  } catch (err: any) {
    console.warn(`[Cloud Delete Notice - ${collectionName}/${docId}]:`, err?.code || err?.message);
  }
}

/**
 * Background Cloud Sync Helper (kept for compatibility with non-critical updates)
 */
export function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): void {
  writeDocSynced(collectionName, docId, data, true).catch(() => {});
}

export function syncDocDeleteFromFirestore(collectionName: string, docId: string): void {
  deleteDocSynced(collectionName, docId).catch(() => {});
}

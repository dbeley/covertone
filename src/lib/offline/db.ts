import type { Album, Song } from "$lib/api/types";

export interface CachedSong {
  albumId: string;
  song: Song;
  bytes: ArrayBuffer;
  contentType?: string;
}

export interface CachedArt {
  bytes: ArrayBuffer;
  contentType?: string;
}

export interface CachedAlbum {
  album: Album;
  songs: Song[];
}

export type DownloadStatus = "downloading" | "ready" | "failed" | "cancelled";

export interface DownloadMeta {
  albumId: string;
  status: DownloadStatus;
  savedAt: string;
  songIds: string[];
  totalSongs: number;
}

const DB_NAME = "covertone-offline";
const DB_VERSION = 1;

export const DB_STORES = {
  songs: "songs",
  albums: "albums",
  art: "art",
  meta: "meta",
} as const;

type StoreName = (typeof DB_STORES)[keyof typeof DB_STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of Object.values(DB_STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
  return dbPromise;
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function getFromStore<T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await openDB();
  const store = db.transaction(storeName).objectStore(storeName);
  return reqToPromise<T | undefined>(store.get(key));
}

async function putInStore(
  storeName: StoreName,
  key: IDBValidKey,
  value: unknown,
): Promise<void> {
  const db = await openDB();
  const store = db.transaction(storeName, "readwrite").objectStore(storeName);
  await reqToPromise(store.put(value, key));
}

async function deleteFromStore(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const db = await openDB();
  const store = db.transaction(storeName, "readwrite").objectStore(storeName);
  await reqToPromise(store.delete(key));
}

async function getAllKeys(storeName: StoreName): Promise<IDBValidKey[]> {
  const db = await openDB();
  const store = db.transaction(storeName).objectStore(storeName);
  return reqToPromise(store.getAllKeys());
}

async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  const store = db.transaction(storeName).objectStore(storeName);
  return reqToPromise(store.getAll());
}

async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  const store = db.transaction(storeName, "readwrite").objectStore(storeName);
  await reqToPromise(store.clear());
}

// ——— songs ———
export async function putSong(
  songId: string,
  value: CachedSong,
): Promise<void> {
  await putInStore(DB_STORES.songs, songId, value);
}
export async function getSong(songId: string): Promise<CachedSong | undefined> {
  return getFromStore<CachedSong>(DB_STORES.songs, songId);
}
export async function deleteSong(songId: string): Promise<void> {
  await deleteFromStore(DB_STORES.songs, songId);
}
export async function getAllSongs(): Promise<CachedSong[]> {
  return getAllFromStore<CachedSong>(DB_STORES.songs);
}
export async function getSongsByAlbum(albumId: string): Promise<CachedSong[]> {
  const all = await getAllFromStore<CachedSong>(DB_STORES.songs);
  return all.filter((s) => s.albumId === albumId);
}

// ——— album metadata ———
export async function putAlbum(
  albumId: string,
  value: CachedAlbum,
): Promise<void> {
  await putInStore(DB_STORES.albums, albumId, value);
}
export async function getAlbum(
  albumId: string,
): Promise<CachedAlbum | undefined> {
  return getFromStore<CachedAlbum>(DB_STORES.albums, albumId);
}
export async function deleteAlbum(albumId: string): Promise<void> {
  await deleteFromStore(DB_STORES.albums, albumId);
}

// ——— artwork ———
export async function putArt(key: string, value: CachedArt): Promise<void> {
  await putInStore(DB_STORES.art, key, value);
}
export async function getArt(key: string): Promise<CachedArt | undefined> {
  return getFromStore<CachedArt>(DB_STORES.art, key);
}
export async function deleteArt(key: string): Promise<void> {
  await deleteFromStore(DB_STORES.art, key);
}
export async function getArtKeysByPrefix(prefix: string): Promise<string[]> {
  const keys = await getAllKeys(DB_STORES.art);
  return keys.map(String).filter((k) => k.startsWith(prefix));
}

// ——— download metadata ———
export async function putMeta(meta: DownloadMeta): Promise<void> {
  await putInStore(DB_STORES.meta, meta.albumId, meta);
}
export async function getMeta(
  albumId: string,
): Promise<DownloadMeta | undefined> {
  return getFromStore<DownloadMeta>(DB_STORES.meta, albumId);
}
export async function deleteMeta(albumId: string): Promise<void> {
  await deleteFromStore(DB_STORES.meta, albumId);
}
export async function getAllMeta(): Promise<DownloadMeta[]> {
  return getAllFromStore<DownloadMeta>(DB_STORES.meta);
}

/**
 * Wipe every store. Used mainly in tests, but also safe to expose for a
 * hypothetical "clear all offline data" control.
 */
export async function clearAll(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  for (const name of Object.values(DB_STORES)) {
    await clearStore(name);
  }
  if (dbPromise) {
    (await dbPromise).close();
    dbPromise = null;
  }
}

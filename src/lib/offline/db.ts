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
const DB_VERSION = 2;

/** Index on the songs store: album id -> song ids. */
export const SONGS_ALBUM_INDEX = "albumId";

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
      // Songs are queried by album (purge, resume); an index avoids scanning
      // the whole store — critical since each row holds full audio bytes.
      const songsStore = request.transaction!.objectStore(DB_STORES.songs);
      if (!songsStore.indexNames.contains(SONGS_ALBUM_INDEX)) {
        songsStore.createIndex(SONGS_ALBUM_INDEX, "albumId", {
          unique: false,
        });
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

/**
 * IndexedDB uses structured clone, which cannot clone Svelte 5 `$state`
 * proxies. Reduce any value to a plain, cloneable object before writing.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

async function getIndexKeys(
  storeName: StoreName,
  indexName: string,
  query: IDBValidKey,
): Promise<IDBValidKey[]> {
  const db = await openDB();
  const index = db
    .transaction(storeName)
    .objectStore(storeName)
    .index(indexName);
  return reqToPromise(index.getAllKeys(query));
}

async function getIndexAll<T>(
  storeName: StoreName,
  indexName: string,
  query: IDBValidKey,
): Promise<T[]> {
  const db = await openDB();
  const index = db
    .transaction(storeName)
    .objectStore(storeName)
    .index(indexName);
  return reqToPromise(index.getAll(query));
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
  // `song` is plainified for IndexedDB structured clone; `bytes` passes through.
  await putInStore(DB_STORES.songs, songId, {
    albumId: value.albumId,
    song: toPlain(value.song),
    bytes: value.bytes,
    contentType: value.contentType,
  });
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

/**
 * All cached song ids, without loading their audio bytes. Building the
 * in-memory presence set from keys (instead of `getAllSongs`) keeps app
 * startup memory flat no matter how large the cache is.
 */
export async function getAllSongIds(): Promise<string[]> {
  const keys = await getAllKeys(DB_STORES.songs);
  return keys.map(String);
}

/**
 * Song ids for one album via the `albumId` index — never scans the full
 * songs store (whose rows contain full audio bytes).
 */
export async function getSongIdsByAlbum(albumId: string): Promise<string[]> {
  const keys = await getIndexKeys(DB_STORES.songs, SONGS_ALBUM_INDEX, albumId);
  return keys.map(String);
}

export async function getSongsByAlbum(albumId: string): Promise<CachedSong[]> {
  return getIndexAll<CachedSong>(DB_STORES.songs, SONGS_ALBUM_INDEX, albumId);
}

// ——— album metadata ———
export async function putAlbum(
  albumId: string,
  value: CachedAlbum,
): Promise<void> {
  await putInStore(DB_STORES.albums, albumId, {
    album: toPlain(value.album),
    songs: value.songs.map((s) => toPlain(s)),
  });
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
  await putInStore(DB_STORES.meta, meta.albumId, toPlain(meta));
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
 * hypothetical "clear all offline data" control. The DB handle is kept open so
 * concurrent transactions aren't invalidated by a mid-operation close.
 */
export async function clearAll(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  for (const name of Object.values(DB_STORES)) {
    await clearStore(name);
  }
}

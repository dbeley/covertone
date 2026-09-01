import { writable } from "svelte/store";
import type { Album, Song } from "$lib/api/types";
import * as db from "./db";
import type { DownloadStatus } from "./db";
import { revokeAlbum, registerCachedSong, ART_SIZES } from "./resolve";

export interface DownloadProgress {
  status: DownloadStatus;
  downloadedSongs: number;
  totalSongs: number;
  error?: string;
}

export interface DownloadApi {
  getAlbum(params: { id: string }): Promise<{
    album: {
      id: string;
      name: string;
      artist: string;
      artistId: string;
      coverArt: string;
      songCount: number;
      duration: number;
      year?: number;
      genre?: string;
      starred?: string;
      song: Song[];
    };
  }>;
  getCoverArt(params: { id: string; size?: number }): string;
  stream(params: { id: string }): string;
}

const inflight = new Map<string, number>();

/**
 * Albums whose persisted meta is `ready`, mirrored in memory so the UI can
 * check readiness synchronously (no IndexedDB read per render tick).
 * Seeded from `getAllMeta()` at startup and kept in sync by download/purge.
 */
const readyAlbums = new Set<string>();

/** Seed the in-memory readiness set from persisted metadata. Cheap: no audio. */
export function seedReadyAlbums(metas: db.DownloadMeta[]): void {
  readyAlbums.clear();
  for (const m of metas) {
    if (m.status === "ready") readyAlbums.add(m.albumId);
  }
}

/** Synchronous readiness check backed by the in-memory set. */
export function isAlbumReadySync(albumId: string): boolean {
  return readyAlbums.has(albumId);
}

/**
 * Cancel any in-flight download for an album. Called when the album is
 * removed, so a still-running loop won't re-cache a removed album.
 */
export function cancelAlbumDownload(albumId: string): void {
  inflight.delete(albumId);
}

let epochCounter = 0;
function makeEpoch(): number {
  return ++epochCounter;
}

export const offlineProgress = writable<Record<string, DownloadProgress>>({});

function setProgress(albumId: string, progress: DownloadProgress): void {
  if (inflight.has(albumId)) {
    offlineProgress.update((all) => ({ ...all, [albumId]: progress }));
  }
}

function isInflight(albumId: string, epoch: number): boolean {
  return inflight.get(albumId) === epoch;
}

async function fetchBytes(url: string): Promise<{
  bytes: ArrayBuffer;
  contentType?: string;
} | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const bytes = await resp.arrayBuffer();
    const contentType = resp.headers?.get?.("content-type") ?? undefined;
    return { bytes, contentType };
  } catch {
    return null;
  }
}

const NETWORK_ATTEMPTS = 3;
const RETRY_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a transient fetch failure so a single network hiccup (common while the
 * app is actively streaming/loading) doesn't fail the whole album download.
 */
async function fetchBytesWithRetry(url: string): Promise<{
  bytes: ArrayBuffer;
  contentType?: string;
} | null> {
  for (let attempt = 0; attempt < NETWORK_ATTEMPTS; attempt++) {
    const result = await fetchBytes(url);
    if (result) return result;
    if (attempt < NETWORK_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  return null;
}

/** Retry a promise-returning call a few times before giving up. */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = NETWORK_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function isAlbumReady(albumId: string): Promise<boolean> {
  try {
    const meta = await db.getMeta(albumId);
    return meta?.status === "ready";
  } catch {
    return false;
  }
}

export function isAlbumDownloading(albumId: string): boolean {
  return inflight.has(albumId);
}

/**
 * Download an album (audio, artwork, metadata) into the offline cache.
 * Best-effort: returns the final status and never throws to callers.
 *
 * Cancellation contract: `purgeAlbum` (via `cancelAlbumDownload`) may run at
 * any moment while this is in flight. The epoch is registered synchronously
 * before the first await, and every IndexedDB write is preceded by an
 * in-flight check, so a cancelled download never leaves rows behind.
 */
export async function downloadAlbum(
  api: DownloadApi,
  album: Album,
): Promise<DownloadStatus> {
  if (inflight.has(album.id)) return "downloading";

  const epoch = makeEpoch();
  inflight.set(album.id, epoch);

  const songIds: string[] = [];
  try {
    if (await isAlbumReady(album.id)) return "ready";
    // A purge may have cancelled us while the ready check was in flight.
    if (!isInflight(album.id, epoch)) return "cancelled";

    setProgress(album.id, {
      status: "downloading",
      downloadedSongs: 0,
      totalSongs: album.songCount,
    });
    readyAlbums.delete(album.id);
    await db.putMeta({
      albumId: album.id,
      status: "downloading",
      savedAt: new Date().toISOString(),
      songIds: [],
      totalSongs: album.songCount,
    });

    const data = await withRetry(() => api.getAlbum({ id: album.id }));
    const songs = data.album.song;

    if (!isInflight(album.id, epoch)) return "cancelled";
    await db.putAlbum(album.id, { album, songs });

    for (const song of songs) {
      if (!isInflight(album.id, epoch)) return "cancelled";
      const art = await fetchBytesWithRetry(api.stream({ id: song.id }));
      if (!isInflight(album.id, epoch)) return "cancelled";
      if (!art) throw new Error(`Failed to download stream for ${song.id}`);
      await db.putSong(song.id, {
        albumId: album.id,
        song,
        bytes: art.bytes,
        contentType: art.contentType ?? song.contentType,
      });
      registerCachedSong(song.id);
      songIds.push(song.id);
      setProgress(album.id, {
        status: "downloading",
        downloadedSongs: songIds.length,
        totalSongs: songs.length,
      });
    }

    if (album.coverArt) {
      for (const size of ART_SIZES) {
        if (!isInflight(album.id, epoch)) return "cancelled";
        const art = await fetchBytesWithRetry(
          api.getCoverArt({ id: album.coverArt, size }),
        );
        if (!isInflight(album.id, epoch)) return "cancelled";
        if (art) {
          await db.putArt(`${album.id}:${size}`, {
            bytes: art.bytes,
            contentType: art.contentType ?? "image/jpeg",
          });
        }
      }
    }

    if (!isInflight(album.id, epoch)) return "cancelled";

    await db.putMeta({
      albumId: album.id,
      status: "ready",
      savedAt: new Date().toISOString(),
      songIds,
      totalSongs: songs.length,
    });
    readyAlbums.add(album.id);
    setProgress(album.id, {
      status: "ready",
      downloadedSongs: songIds.length,
      totalSongs: songs.length,
    });
    return "ready";
  } catch (e) {
    if (!isInflight(album.id, epoch)) return "cancelled";
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[offline] Download of album ${album.id} failed:`, e);
    readyAlbums.delete(album.id);
    await db.putMeta({
      albumId: album.id,
      status: "failed",
      savedAt: new Date().toISOString(),
      songIds,
      totalSongs: album.songCount,
    });
    setProgress(album.id, {
      status: "failed",
      downloadedSongs: songIds.length,
      totalSongs: album.songCount,
      error: message,
    });
    return "failed";
  } finally {
    if (isInflight(album.id, epoch)) inflight.delete(album.id);
  }
}

/**
 * Remove every cached artifact for an album (audio, metadata, artwork).
 */
export async function purgeAlbum(albumId: string): Promise<void> {
  cancelAlbumDownload(albumId);
  readyAlbums.delete(albumId);

  let songIds: string[] = [];
  try {
    const meta = await db.getMeta(albumId);
    const scanned = await db.getSongsByAlbum(albumId);
    songIds = [
      ...new Set([...(meta?.songIds ?? []), ...scanned.map((s) => s.song.id)]),
    ];
  } catch {
    /* ignore */
  }

  revokeAlbum(albumId, songIds);

  try {
    for (const id of songIds) {
      await db.deleteSong(id);
    }
    const artKeys = await db.getArtKeysByPrefix(`${albumId}:`);
    for (const key of artKeys) {
      await db.deleteArt(key);
    }
    await db.deleteAlbum(albumId);
    await db.deleteMeta(albumId);
  } catch {
    /* ignore */
  }

  offlineProgress.update((all) => {
    const next = { ...all };
    delete next[albumId];
    return next;
  });
}

export interface OfflineSummary {
  ready: number;
  downloading: number;
  failed: number;
}

/** Count cached albums by download status, from the metadata store. */
export async function getOfflineSummary(): Promise<OfflineSummary> {
  let metas: db.DownloadMeta[] = [];
  try {
    metas = await db.getAllMeta();
  } catch {
    return { ready: 0, downloading: 0, failed: 0 };
  }
  const summary: OfflineSummary = { ready: 0, downloading: 0, failed: 0 };
  for (const m of metas) {
    if (m.status === "ready") summary.ready++;
    else if (m.status === "downloading") summary.downloading++;
    else summary.failed++;
  }
  return summary;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

/** Local storage usage/quota, or null when the Storage API is unavailable. */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return null;
    }
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage ?? 0, quota: quota ?? 0 };
  } catch {
    return null;
  }
}

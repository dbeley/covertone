import { writable } from "svelte/store";
import type { Album, Song } from "$lib/api/types";
import * as db from "./db";
import type { DownloadStatus } from "./db";
import { revokeAlbum, registerCachedSong } from "./resolve";

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

const ART_SIZES = [192, 512];
const inflight = new Map<string, number>();

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
 */
export async function downloadAlbum(
  api: DownloadApi,
  album: Album,
): Promise<DownloadStatus> {
  if (await isAlbumReady(album.id)) return "ready";
  if (inflight.has(album.id)) return "downloading";

  const epoch = makeEpoch();
  inflight.set(album.id, epoch);

  setProgress(album.id, {
    status: "downloading",
    downloadedSongs: 0,
    totalSongs: album.songCount,
  });
  await db.putMeta({
    albumId: album.id,
    status: "downloading",
    savedAt: new Date().toISOString(),
    songIds: [],
    totalSongs: album.songCount,
  });

  const songIds: string[] = [];
  try {
    const data = await api.getAlbum({ id: album.id });
    const songs = data.album.song;

    await db.putAlbum(album.id, { album, songs });

    for (const song of songs) {
      if (!isInflight(album.id, epoch)) return "cancelled";
      const art = await fetchBytes(api.stream({ id: song.id }));
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
        const art = await fetchBytes(
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
    setProgress(album.id, {
      status: "ready",
      downloadedSongs: songIds.length,
      totalSongs: songs.length,
    });
    return "ready";
  } catch (e) {
    if (!isInflight(album.id, epoch)) return "cancelled";
    const message = e instanceof Error ? e.message : String(e);
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

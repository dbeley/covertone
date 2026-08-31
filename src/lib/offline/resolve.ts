import type { Song } from "$lib/api/types";
import * as db from "./db";
import type { CachedAlbum, CachedSong } from "./db";

function toBlob(bytes: ArrayBuffer, contentType?: string): Blob {
  return new Blob([bytes], contentType ? { type: contentType } : undefined);
}

const songUrls = new Map<string, string>();
const artUrls = new Map<string, string>();
const cachedSongIds = new Set<string>();

/** Track a song as cached so the player can know synchronously without I/O. */
export function registerCachedSong(songId: string): void {
  cachedSongIds.add(songId);
}

export function unregisterCachedSong(songId: string): void {
  cachedSongIds.delete(songId);
}

/** Rebuild the in-memory presence set from the DB (e.g. at app startup). */
export async function populateCachedSongIds(): Promise<void> {
  try {
    const all = await db.getAllSongs();
    for (const entry of all) cachedSongIds.add(entry.song.id);
  } catch {
    /* ignore */
  }
}

/**
 * Synchronous check for whether a song has cached audio. Used by the player
 * to decide synchronously whether to stream (remote) or resolve (offline).
 */
export function isSongCached(songId: string): boolean {
  return cachedSongIds.has(songId) || songUrls.has(songId);
}

/**
 * Resolve a playable source URL for a cached song. Returns a `blob:` URL that
 * can be passed straight to the audio element, or `null` when the song is not
 * cached (caller falls back to the remote stream URL).
 */
export async function resolveStream(songId: string): Promise<string | null> {
  const cached = songUrls.get(songId);
  if (cached) return cached;
  try {
    const entry: CachedSong | undefined = await db.getSong(songId);
    if (!entry) return null;
    const url = URL.createObjectURL(toBlob(entry.bytes, entry.contentType));
    songUrls.set(songId, url);
    return url;
  } catch {
    return null;
  }
}

export async function getCachedSong(songId: string): Promise<Song | null> {
  try {
    const entry = await db.getSong(songId);
    return entry?.song ?? null;
  } catch {
    return null;
  }
}

export async function getCachedAlbum(
  albumId: string,
): Promise<CachedAlbum | null> {
  try {
    return (await db.getAlbum(albumId)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve cover art for an album from the cache, as a `blob:` URL. Falls back
 * through larger cached sizes and finally to `null` when nothing is cached.
 */
export async function resolveCoverArt(
  albumId: string,
  size: number,
): Promise<string | null> {
  const sizes = [size, 512, 192];
  for (const s of sizes) {
    const key = `${albumId}:${s}`;
    const cached = artUrls.get(key);
    if (cached) return cached;
  }
  try {
    for (const s of sizes) {
      const key = `${albumId}:${s}`;
      const art: db.CachedArt | undefined = await db.getArt(key);
      if (art) {
        const url = URL.createObjectURL(toBlob(art.bytes, art.contentType));
        artUrls.set(key, url);
        return url;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Revoke a single song's cached blob URL without dropping its presence hint. */
export function revokeStreamUrl(songId: string): void {
  const url = songUrls.get(songId);
  if (url) {
    URL.revokeObjectURL(url);
    songUrls.delete(songId);
  }
}

/**
 * Revoke any live blob URLs for an album and its songs. Call before removing
 * the album's rows from the cache.
 */
export function revokeAlbum(albumId: string, songIds: string[]): void {
  for (const id of songIds) {
    const url = songUrls.get(id);
    unregisterCachedSong(id);
    if (url) {
      URL.revokeObjectURL(url);
      songUrls.delete(id);
    }
  }
  for (const [key, url] of [...artUrls]) {
    if (key.startsWith(`${albumId}:`)) {
      URL.revokeObjectURL(url);
      artUrls.delete(key);
    }
  }
}

/** For tests: drop every tracked blob URL and presence set. */
export function clearResolveUrls(): void {
  for (const url of songUrls.values()) URL.revokeObjectURL(url);
  for (const url of artUrls.values()) URL.revokeObjectURL(url);
  songUrls.clear();
  artUrls.clear();
  cachedSongIds.clear();
}

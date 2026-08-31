import type { Album } from "$lib/api/types";
import { listenLater } from "$lib/stores/listenLater";
import { createApiFromSettings } from "$lib/api/createApi";
import * as db from "./db";
import { downloadAlbum, purgeAlbum } from "./downloads";
import { populateCachedSongIds } from "./resolve";

let initialized = false;
let previous = new Set<string>();

async function ensureDownloaded(album: Album): Promise<void> {
  const api = createApiFromSettings();
  if (!api) return;
  await downloadAlbum(api, album);
}

/**
 * Bring the offline cache in line with the Listen Later list:
 *  - purge any cached album no longer saved
 *  - (re)download any saved album that isn't cached yet (resumes interrupted
 *    downloads after the app was backgrounded).
 */
export async function reconcile(): Promise<void> {
  await populateCachedSongIds();

  const albums = listenLater.getAll().map((e) => e.album);
  const ids = new Set(albums.map((a) => a.id));

  let metas: db.DownloadMeta[] = [];
  try {
    metas = await db.getAllMeta();
  } catch {
    return;
  }
  const metaByAlbum = new Map(metas.map((m) => [m.albumId, m]));

  for (const m of metas) {
    if (!ids.has(m.albumId)) {
      await purgeAlbum(m.albumId);
    }
  }

  for (const album of albums) {
    const meta = metaByAlbum.get(album.id);
    if (!meta || meta.status !== "ready") {
      await ensureDownloaded(album);
    }
  }
}

/**
 * Wire Offline caching to the Listen Later list: adding an album downloads
 * it, removing it purges its cache. Call once at app startup.
 */
export function initOffline(): void {
  if (initialized) return;
  initialized = true;

  void reconcile();

  listenLater.subscribe((entries) => {
    const current = new Set(entries.map((e) => e.album.id));

    for (const id of previous) {
      if (!current.has(id)) void purgeAlbum(id);
    }
    for (const entry of entries) {
      if (!previous.has(entry.album.id)) void ensureDownloaded(entry.album);
    }

    previous = current;
  });
}

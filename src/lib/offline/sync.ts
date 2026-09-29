import type { Album } from "$lib/api/types";
import { listenLater } from "$lib/stores/listenLater";
import { createApiFromSettings } from "$lib/api/createApi";
import * as db from "./db";
import { downloadAlbum, purgeAlbum, seedReadyAlbums } from "./downloads";
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
 *  - download saved albums that have never been cached (fresh upgrade) and
 *    resume interrupted downloads (status `downloading`).
 *
 * Albums in `failed` status are deliberately left alone: auto-retrying them
 * on every launch would re-hammer the network (and IndexedDB) at startup
 * for albums that may fail permanently — the user retries them explicitly
 * from the download indicator instead.
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
  seedReadyAlbums(metas);
  const metaByAlbum = new Map(metas.map((m) => [m.albumId, m]));

  await Promise.all(
    metas.filter((m) => !ids.has(m.albumId)).map((m) => purgeAlbum(m.albumId)),
  );

  for (const album of albums) {
    const meta = metaByAlbum.get(album.id);
    if (!meta || meta.status === "downloading") {
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

  // Seed the diff base before subscribing so the first synchronous emission
  // (current list) is not mistaken for a change and re-downloads everything.
  previous = new Set(listenLater.getAll().map((e) => e.album.id));

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

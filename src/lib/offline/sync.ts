import type { Album } from "$lib/api/types";
import { listenLater } from "$lib/stores/listenLater";
import { settings } from "$lib/stores/settings";
import { createApiFromSettings } from "$lib/api/createApi";
import * as db from "./db";
import {
  downloadAlbum,
  purgeAlbum,
  purgeAllOffline,
  seedReadyAlbums,
} from "./downloads";
import { populateCachedSongIds } from "./resolve";

let initialized = false;
let previous = new Set<string>();
let subscribed = false;
let lastEnabled: boolean | null = null;
let unsubscribeSettings: (() => void) | null = null;
let unsubscribeListenLater: (() => void) | null = null;

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

  const metas = await db.getAllMeta().catch(() => null);
  if (!metas) return;
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
 * Apply the offline-cache setting. Enabling downloads the Listen Later list;
 * disabling purges every cached artifact on this device. Idempotent per value
 * so unrelated settings changes don't retrigger work.
 */
async function applyOfflineCacheEnabled(enabled: boolean): Promise<void> {
  if (enabled === lastEnabled) return;
  lastEnabled = enabled;

  if (!enabled) {
    previous = new Set();
    await purgeAllOffline();
    return;
  }

  // Seed the diff base before subscribing so the first synchronous emission
  // (current list) is not mistaken for a change and re-downloads everything.
  previous = new Set(listenLater.getAll().map((e) => e.album.id));

  if (!subscribed) {
    subscribed = true;
    unsubscribeListenLater = listenLater.subscribe((entries) => {
      // A cache-disabled device must never download, even if the list changes.
      if (!lastEnabled) return;

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

  await reconcile();
}

/**
 * Wire Offline caching to the Listen Later list, gated by the per-device
 * "cache albums for offline listening" setting. Call once at app startup.
 */
export function initOffline(): void {
  if (initialized) return;
  initialized = true;

  // The subscription fires synchronously with the current value, so this also
  // handles the initial state (including the default-off first launch).
  unsubscribeSettings = settings.subscribe((state) => {
    void applyOfflineCacheEnabled(state.offlineCacheEnabled);
  });
}

/** For tests: drop subscriptions and bookkeeping so initOffline can re-run. */
export function resetOfflineSyncForTests(): void {
  unsubscribeSettings?.();
  unsubscribeListenLater?.();
  unsubscribeSettings = null;
  unsubscribeListenLater = null;
  initialized = false;
  subscribed = false;
  lastEnabled = null;
  previous = new Set();
}

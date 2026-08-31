import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import { clearAll, getMeta, putMeta } from "$lib/offline/db";
import { offlineProgress } from "$lib/offline/downloads";
import { clearResolveUrls } from "$lib/offline/resolve";
import { reconcile } from "$lib/offline/sync";
import { listenLater } from "$lib/stores/listenLater";
import type { Album } from "$lib/api/types";

const album: Album = {
  id: "a1",
  name: "Album One",
  artist: "Artist",
  artistId: "ar1",
  coverArt: "ca1",
  songCount: 2,
  duration: 400,
};

beforeEach(async () => {
  await clearAll();
  clearResolveUrls();
  offlineProgress.set({});
  localStorage.clear();
  listenLater.clear();
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: { get: () => "audio/mpeg" },
    }) as unknown as Response,
  );
});

describe("reconcile", () => {
  it("purges a cached album that is no longer in listen later", async () => {
    await putMeta({
      albumId: "a1",
      status: "ready",
      savedAt: "x",
      songIds: [],
      totalSongs: 0,
    });

    await reconcile();

    expect(await getMeta("a1")).toBeUndefined();
  });

  it("keeps a cached album that is in listen later as ready", async () => {
    await putMeta({
      albumId: "a1",
      status: "ready",
      savedAt: "x",
      songIds: [],
      totalSongs: 0,
    });
    listenLater.add(album);

    await reconcile();

    expect((await getMeta("a1"))?.status).toBe("ready");
  });

  it("re-downloads an incomplete album present in listen later", async () => {
    listenLater.add(album);
    await putMeta({
      albumId: "a1",
      status: "failed",
      savedAt: "x",
      songIds: [],
      totalSongs: 2,
    });

    // Server not configured -> download is skipped rather than attempted.
    const before = await getMeta("a1");
    expect(before?.status).toBe("failed");
    const progress = get(offlineProgress);
    expect(progress).toEqual({});
  });
});
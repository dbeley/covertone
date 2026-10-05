import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import { clearAll, getMeta, putMeta, putSong } from "$lib/offline/db";
import {
  offlineProgress,
  isAlbumReadySync,
  seedReadyAlbums,
} from "$lib/offline/downloads";
import { clearResolveUrls, isSongCached } from "$lib/offline/resolve";
import {
  reconcile,
  initOffline,
  resetOfflineSyncForTests,
} from "$lib/offline/sync";
import { listenLater } from "$lib/stores/listenLater";
import { settings } from "$lib/stores/settings";
import type { Album, Song } from "$lib/api/types";

vi.mock("$lib/api/createApi", () => ({
  createApiFromSettings: vi.fn(),
}));
import { createApiFromSettings } from "$lib/api/createApi";
const mockedCreateApi = vi.mocked(createApiFromSettings);

const album: Album = {
  id: "a1",
  name: "Album One",
  artist: "Artist",
  artistId: "ar1",
  coverArt: "ca1",
  songCount: 2,
  duration: 400,
};

const songs: Song[] = [
  {
    id: "s1",
    title: "One",
    artist: "Artist",
    album: "Album One",
    albumId: "a1",
    duration: 200,
    contentType: "audio/mpeg",
  },
  {
    id: "s2",
    title: "Two",
    artist: "Artist",
    album: "Album One",
    albumId: "a1",
    duration: 200,
    contentType: "audio/mpeg",
  },
];

function makeApi() {
  return {
    getAlbum: vi.fn(async ({ id }: { id: string }) => ({
      album: { ...album, song: songs },
    })),
    getCoverArt: vi.fn(
      ({ id, size }: { id: string; size?: number }) =>
        `https://site/art?id=${id}&size=${size}`,
    ),
    stream: vi.fn(({ id }: { id: string }) => `https://site/stream?id=${id}`),
  };
}

function makeFetchResponse() {
  return {
    ok: true,
    arrayBuffer: () =>
      Promise.resolve(new TextEncoder().encode("audio").buffer),
    headers: { get: () => "audio/mpeg" },
  };
}

const readyMeta = {
  albumId: "a1",
  status: "ready" as const,
  savedAt: "x",
  songIds: [],
  totalSongs: 0,
};

beforeEach(async () => {
  resetOfflineSyncForTests();
  await clearAll();
  clearResolveUrls();
  offlineProgress.set({});
  listenLater.clear();
  seedReadyAlbums([]);
  localStorage.clear();
  settings.reset();
  mockedCreateApi.mockReset();
  mockedCreateApi.mockReturnValue(null);
  globalThis.fetch = vi.fn(
    () => Promise.resolve(makeFetchResponse()) as unknown as Response,
  );
});

describe("reconcile", () => {
  it("purges a cached album that is no longer in listen later", async () => {
    await putMeta(readyMeta);

    await reconcile();

    expect(await getMeta("a1")).toBeUndefined();
  });

  it("keeps a cached album that is in listen later as ready", async () => {
    await putMeta(readyMeta);
    listenLater.add(album);

    await reconcile();

    expect((await getMeta("a1"))?.status).toBe("ready");
  });

  it("does not auto-retry a failed album on startup", async () => {
    listenLater.add(album);
    await putMeta({ ...readyMeta, status: "failed" });
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);

    await reconcile();

    // No download attempt: status unchanged, no streams fetched.
    expect((await getMeta("a1"))?.status).toBe("failed");
    expect(api.stream).not.toHaveBeenCalled();
  });

  it("resumes an interrupted (downloading) album", async () => {
    listenLater.add(album);
    await putMeta({ ...readyMeta, status: "downloading", totalSongs: 2 });
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);

    await reconcile();

    expect(api.stream).toHaveBeenCalledTimes(2);
    expect((await getMeta("a1"))?.status).toBe("ready");
  });

  it("downloads a saved album that has never been cached (fresh upgrade)", async () => {
    listenLater.add(album);
    // No meta written yet — as if the album was saved before the offline
    // feature existed.
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);

    await reconcile();

    expect(api.stream).toHaveBeenCalledTimes(2);
    expect((await getMeta("a1"))?.status).toBe("ready");
  });

  it("seeds the in-memory readiness set from persisted metadata", async () => {
    listenLater.add(album);
    await putMeta(readyMeta);
    expect(isAlbumReadySync("a1")).toBe(false);

    await reconcile();

    expect(isAlbumReadySync("a1")).toBe(true);
  });

  it("populates cached-song presence without loading audio bytes", async () => {
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new TextEncoder().encode("audio").buffer,
    });
    listenLater.add(album);

    // With a configured API, reconcile would download; presence set must be
    // populated regardless so the player can resolve s1 offline.
    await reconcile();

    expect(isSongCached("s1")).toBe(true);
  });
});

describe("offline cache gating", () => {
  it("purges existing cache and never downloads when disabled at startup", async () => {
    listenLater.add(album);
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new TextEncoder().encode("audio").buffer,
    });
    await putMeta(readyMeta);
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);
    settings.setOfflineCacheEnabled(false);

    initOffline();

    await vi.waitFor(async () => {
      expect(await getMeta("a1")).toBeUndefined();
    });
    expect(api.stream).not.toHaveBeenCalled();
    expect(isSongCached("s1")).toBe(false);
  });

  it("downloads listen later albums when enabled at startup", async () => {
    listenLater.add(album);
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);
    settings.setOfflineCacheEnabled(true);

    initOffline();

    await vi.waitFor(async () => {
      expect((await getMeta("a1"))?.status).toBe("ready");
    });
    // Exactly once: the initial listenLater emission must not re-download.
    expect(api.stream).toHaveBeenCalledTimes(2);
  });

  it("purges when the setting is toggled off after being enabled", async () => {
    listenLater.add(album);
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);
    settings.setOfflineCacheEnabled(true);

    initOffline();
    await vi.waitFor(async () => {
      expect((await getMeta("a1"))?.status).toBe("ready");
    });

    settings.setOfflineCacheEnabled(false);

    await vi.waitFor(async () => {
      expect(await getMeta("a1")).toBeUndefined();
    });
    expect(isSongCached("s1")).toBe(false);
  });

  it("does not download an album added while disabled", async () => {
    const api = makeApi();
    mockedCreateApi.mockReturnValue(api as unknown as never);
    settings.setOfflineCacheEnabled(false);

    initOffline();
    listenLater.add(album);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.stream).not.toHaveBeenCalled();
    expect(await getMeta("a1")).toBeUndefined();
  });
});

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import {
  clearAll,
  getSong,
  getAlbum as dbGetAlbum,
  getMeta,
  getArtKeysByPrefix,
  putMeta,
  getAllMeta,
} from "$lib/offline/db";
import {
  downloadAlbum,
  purgeAlbum,
  isAlbumReady,
  isAlbumReadySync,
  seedReadyAlbums,
  offlineProgress,
  getOfflineSummary,
} from "$lib/offline/downloads";
import { clearResolveUrls } from "$lib/offline/resolve";
import type { Album, Song } from "$lib/api/types";

const album: Album = {
  id: "a1",
  name: "Album One",
  artist: "Artist",
  artistId: "ar1",
  coverArt: "ca1",
  songCount: 2,
  duration: 400,
  year: 2024,
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

function makeFetchResponse(contentType = "audio/mpeg") {
  return {
    ok: true,
    arrayBuffer: () =>
      Promise.resolve(new TextEncoder().encode("audio").buffer),
    headers: { get: () => contentType },
  };
}

beforeEach(async () => {
  await clearAll();
  clearResolveUrls();
  offlineProgress.set({});
  seedReadyAlbums([]);
  globalThis.fetch = vi.fn(
    () => Promise.resolve(makeFetchResponse()) as unknown as Response,
  );
});

describe("downloadAlbum", () => {
  it("stores metadata, songs and artwork and marks ready", async () => {
    const api = makeApi();
    const status = await downloadAlbum(api, album);

    expect(status).toBe("ready");
    expect(api.getAlbum).toHaveBeenCalledWith({ id: "a1" });
    expect(api.stream).toHaveBeenCalledTimes(2);

    const cachedAlbum = await dbGetAlbum("a1");
    expect(cachedAlbum?.songs).toHaveLength(2);

    const s1 = await getSong("s1");
    expect(s1?.song.id).toBe("s1");
    expect(s1?.bytes.byteLength).toBeGreaterThan(0);

    const meta = await getMeta("a1");
    expect(meta?.status).toBe("ready");
    expect(meta?.songIds).toEqual(["s1", "s2"]);

    const artKeys = await getArtKeysByPrefix("a1:");
    expect(artKeys.sort()).toEqual(["a1:192", "a1:512"]);
  });

  it("is idempotent when already ready", async () => {
    const api = makeApi();
    await downloadAlbum(api, album);
    api.getAlbum.mockClear();
    api.stream.mockClear();
    const status = await downloadAlbum(api, album);
    expect(status).toBe("ready");
    expect(api.stream).not.toHaveBeenCalled();
  });

  it("marks failed when a stream download fails without throwing", async () => {
    const api = makeApi();
    const failing = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse())
      .mockRejectedValueOnce(new Error("network down"));
    globalThis.fetch = failing as unknown as typeof fetch;

    const status = await downloadAlbum(api, album);
    expect(status).toBe("failed");
    expect((await getMeta("a1"))?.status).toBe("failed");
  });

  it("reports progress in the offlineProgress store", async () => {
    const api = makeApi();
    await downloadAlbum(api, album);
    const prog = get(offlineProgress)[album.id];
    expect(prog?.status).toBe("ready");
    expect(prog?.downloadedSongs).toBe(2);
    expect(prog?.totalSongs).toBe(2);
  });

  it("downloads an album passed as a proxied (non-cloneable) object", async () => {
    // Svelte `$state` wraps array items in Proxies, which IndexedDB can't
    // structured-clone. De-proxying at the DB boundary must handle this.
    const api = makeApi();
    const proxiedAlbum = new Proxy(album, {});
    const status = await downloadAlbum(api, proxiedAlbum);
    expect(status).toBe("ready");
    expect(await dbGetAlbum("a1")).toBeDefined();
  });

  it("tracks readiness synchronously (in-memory set)", async () => {
    expect(isAlbumReadySync("a1")).toBe(false);

    const api = makeApi();
    await downloadAlbum(api, album);
    expect(isAlbumReadySync("a1")).toBe(true);

    await purgeAlbum("a1");
    expect(isAlbumReadySync("a1")).toBe(false);
  });

  it("stays not-ready when a download fails", async () => {
    const api = makeApi();
    const failing = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"));
    globalThis.fetch = failing as unknown as typeof fetch;

    await downloadAlbum(api, album);
    expect(isAlbumReadySync("a1")).toBe(false);
  });

  it("seedReadyAlbums mirrors persisted metadata into the sync set", async () => {
    await putMeta({
      albumId: "a1",
      status: "ready",
      savedAt: "x",
      songIds: [],
      totalSongs: 0,
    });
    await putMeta({
      albumId: "b2",
      status: "failed",
      savedAt: "y",
      songIds: [],
      totalSongs: 0,
    });

    seedReadyAlbums(await getAllMeta());

    expect(isAlbumReadySync("a1")).toBe(true);
    expect(isAlbumReadySync("b2")).toBe(false);
  });

  it("getOfflineSummary counts albums by status", async () => {
    await putMeta({
      albumId: "a1",
      status: "ready",
      savedAt: "x",
      songIds: [],
      totalSongs: 0,
    });
    await putMeta({
      albumId: "b2",
      status: "failed",
      savedAt: "y",
      songIds: [],
      totalSongs: 0,
    });
    await putMeta({
      albumId: "c3",
      status: "downloading",
      savedAt: "z",
      songIds: [],
      totalSongs: 0,
    });

    expect(await getOfflineSummary()).toEqual({
      ready: 1,
      downloading: 1,
      failed: 1,
    });
  });
});

describe("purgeAlbum", () => {
  it("removes songs, metadata, artwork and progress", async () => {
    const api = makeApi();
    await downloadAlbum(api, album);

    await purgeAlbum("a1");

    expect(await getSong("s1")).toBeUndefined();
    expect(await getSong("s2")).toBeUndefined();
    expect(await dbGetAlbum("a1")).toBeUndefined();
    expect(await getMeta("a1")).toBeUndefined();
    expect(await getArtKeysByPrefix("a1:")).toEqual([]);
    expect(await isAlbumReady("a1")).toBe(false);
    expect(get(offlineProgress)[album.id]).toBeUndefined();
  });

  it("cancels an in-flight download without re-caching a removed album", async () => {
    const api = makeApi();

    // Hold the second stream (s2) until we've purged the album mid-download.
    let releaseS2: () => void = () => {};
    const s2Gate = new Promise<void>((resolve) => {
      releaseS2 = resolve;
    });
    globalThis.fetch = vi.fn((url: unknown) => {
      if (String(url).includes("stream?id=s2")) {
        return s2Gate.then(() => makeFetchResponse());
      }
      return Promise.resolve(makeFetchResponse()) as unknown as Response;
    }) as unknown as typeof fetch;

    const done = downloadAlbum(api, album);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await purgeAlbum("a1");
    releaseS2();

    expect(await done).toBe("cancelled");
    expect(await getSong("s1")).toBeUndefined();
    expect(await getSong("s2")).toBeUndefined();
    expect(await getMeta("a1")).toBeUndefined();
    expect(await dbGetAlbum("a1")).toBeUndefined();
  });
});

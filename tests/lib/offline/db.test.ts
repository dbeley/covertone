import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  DB_STORES,
  clearAll,
  putSong,
  getSong,
  deleteSong,
  getAllSongs,
  putAlbum,
  getAlbum,
  deleteAlbum,
  putArt,
  getArt,
  deleteArt,
  getArtKeysByPrefix,
  putMeta,
  getMeta,
  deleteMeta,
  getAllMeta,
} from "$lib/offline/db";
import type { Album, Song } from "$lib/api/types";

describe("offline db", () => {
  beforeEach(async () => {
    await clearAll();
  });

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
    { id: "s1", title: "One", artist: "Artist", album: "Album One", albumId: "a1", duration: 200 },
    { id: "s2", title: "Two", artist: "Artist", album: "Album One", albumId: "a1", duration: 200 },
  ];

  it("stores and reads audio bytes by song id", async () => {
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new TextEncoder().encode("audio").buffer,
      contentType: "audio/mpeg",
    });
    const cached = await getSong("s1");
    expect(cached?.song.id).toBe("s1");
    const text = new TextDecoder().decode(cached?.bytes);
    expect(text).toBe("audio");
  });

  it("deletes a cached song", async () => {
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new ArrayBuffer(0),
    });
    await deleteSong("s1");
    expect(await getSong("s1")).toBeUndefined();
  });

  it("lists all cached songs", async () => {
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new ArrayBuffer(0),
    });
    await putSong("s2", {
      albumId: "a1",
      song: songs[1],
      bytes: new ArrayBuffer(0),
    });
    const all = await getAllSongs();
    expect(all.map((s) => s.song.id).sort()).toEqual(["s1", "s2"]);
  });

  it("stores and reads album metadata", async () => {
    await putAlbum("a1", { album, songs });
    const cached = await getAlbum("a1");
    expect(cached?.album.id).toBe("a1");
    expect(cached?.songs).toHaveLength(2);
  });

  it("deletes album metadata", async () => {
    await putAlbum("a1", { album, songs });
    await deleteAlbum("a1");
    expect(await getAlbum("a1")).toBeUndefined();
  });

  it("stores and reads artwork bytes", async () => {
    await putArt("a1:192", {
      bytes: new TextEncoder().encode("art192").buffer,
      contentType: "image/jpeg",
    });
    const art = await getArt("a1:192");
    expect(new TextDecoder().decode(art?.bytes)).toBe("art192");
    expect(art?.contentType).toBe("image/jpeg");
  });

  it("deletes artwork", async () => {
    await putArt("a1:192", { bytes: new ArrayBuffer(0) });
    await deleteArt("a1:192");
    expect(await getArt("a1:192")).toBeUndefined();
  });

  it("lists artwork keys by album prefix", async () => {
    await putArt("a1:192", { bytes: new ArrayBuffer(0) });
    await putArt("a1:512", { bytes: new ArrayBuffer(0) });
    await putArt("b2:192", { bytes: new ArrayBuffer(0) });
    const keys = await getArtKeysByPrefix("a1:");
    expect(keys.sort()).toEqual(["a1:192", "a1:512"]);
  });

  it("stores, reads and deletes download metadata", async () => {
    const meta = { albumId: "a1", status: "ready" as const, savedAt: "x", songIds: ["s1", "s2"], totalSongs: 2 };
    await putMeta(meta);
    expect(await getMeta("a1")).toEqual(meta);
    await deleteMeta("a1");
    expect(await getMeta("a1")).toBeUndefined();
  });

  it("lists all download metadata", async () => {
    await putMeta({ albumId: "a1", status: "ready", savedAt: "x", songIds: [], totalSongs: 0 });
    await putMeta({ albumId: "b2", status: "failed", savedAt: "y", songIds: [], totalSongs: 0 });
    const all = await getAllMeta();
    expect(all.map((m) => m.albumId).sort()).toEqual(["a1", "b2"]);
  });

  it("clearAll wipes every store", async () => {
    await putSong("s1", {
      albumId: "a1",
      song: songs[0],
      bytes: new ArrayBuffer(0),
    });
    await putAlbum("a1", { album, songs });
    await putArt("a1:192", { bytes: new ArrayBuffer(0) });
    await putMeta({ albumId: "a1", status: "ready", savedAt: "x", songIds: [], totalSongs: 0 });
    await clearAll();
    expect(await getSong("s1")).toBeUndefined();
    expect(await getAlbum("a1")).toBeUndefined();
    expect(await getArt("a1:192")).toBeUndefined();
    expect(await getMeta("a1")).toBeUndefined();
  });

  it("creates all object stores on upgrade", () => {
    // The store names used by the module are exactly the four expected stores.
    expect(Object.values(DB_STORES).sort()).toEqual(["albums", "art", "meta", "songs"]);
  });
});
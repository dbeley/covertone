import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearAll, putSong, putAlbum, putArt } from "$lib/offline/db";
import {
  resolveStream,
  getCachedSong,
  getCachedAlbum,
  resolveCoverArt,
  revokeAlbum,
  clearResolveUrls,
} from "$lib/offline/resolve";
import type { Album, Song } from "$lib/api/types";

const album: Album = {
  id: "a1",
  name: "Album One",
  artist: "Artist",
  artistId: "ar1",
  coverArt: "ca1",
  songCount: 1,
  duration: 200,
};

const songs: Song[] = [
  { id: "s1", title: "One", artist: "Artist", album: "Album One", albumId: "a1", duration: 200 },
];

const bytes = new TextEncoder().encode("audio").buffer;

beforeEach(async () => {
  await clearAll();
  clearResolveUrls();
  URL.createObjectURL = vi.fn((_) => `blob:mock-${Math.random().toString(36)}`);
  URL.revokeObjectURL = vi.fn();
});

describe("resolveStream", () => {
  it("returns a blob URL for a cached song", async () => {
    await putSong("s1", { albumId: "a1", song: songs[0], bytes, contentType: "audio/mpeg" });
    const url = await resolveStream("s1");
    expect(url).toMatch(/^blob:/);
  });

  it("returns null for an unknown song", async () => {
    expect(await resolveStream("missing")).toBeNull();
  });
});

describe("getCachedSong / getCachedAlbum", () => {
  it("returns the cached song metadata", async () => {
    await putSong("s1", { albumId: "a1", song: songs[0], bytes });
    expect(await getCachedSong("s1")).toEqual(songs[0]);
    expect(await getCachedSong("missing")).toBeNull();
  });

  it("returns the cached album", async () => {
    await putAlbum("a1", { album, songs });
    expect(await getCachedAlbum("a1")).toEqual({ album, songs });
    expect(await getCachedAlbum("missing")).toBeNull();
  });
});

describe("resolveCoverArt", () => {
  it("returns a blob URL for the requested size", async () => {
    await putArt("a1:192", { bytes, contentType: "image/jpeg" });
    const url = await resolveCoverArt("a1", 192);
    expect(url).toMatch(/^blob:/);
  });

  it("falls back to a larger cached size", async () => {
    await putArt("a1:512", { bytes, contentType: "image/jpeg" });
    expect(await resolveCoverArt("a1", 256)).toMatch(/^blob:/);
  });

  it("returns null when nothing is cached", async () => {
    expect(await resolveCoverArt("a1", 192)).toBeNull();
  });
});

describe("revokeAlbum", () => {
  it("revokes stored song and art urls", async () => {
    await putSong("s1", { albumId: "a1", song: songs[0], bytes });
    await putArt("a1:192", { bytes, contentType: "image/jpeg" });
    await resolveStream("s1");
    await resolveCoverArt("a1", 192);
    const revoke = URL.revokeObjectURL as ReturnType<typeof vi.fn>;

    revokeAlbum("a1", ["s1"]);

    expect(revoke.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
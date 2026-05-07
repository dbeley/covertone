import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cacheGet, cacheSet, cacheInvalidate } from "$lib/stores/apiCache";

describe("apiCache", () => {
  beforeEach(() => {
    cacheInvalidate();
  });

  it("stores and retrieves values", () => {
    cacheSet("key1", { data: "hello" });
    expect(cacheGet("key1")).toEqual({ data: "hello" });
  });

  it("returns null for missing key", () => {
    expect(cacheGet("nonexistent")).toBeNull();
  });

  it("respects TTL", () => {
    vi.useFakeTimers();
    cacheSet("key1", "value");
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(cacheGet("key1")).toBeNull();
    vi.useRealTimers();
  });

  it("invalidates all entries", () => {
    cacheSet("key1", "value1");
    cacheSet("key2", "value2");
    cacheInvalidate();
    expect(cacheGet("key1")).toBeNull();
    expect(cacheGet("key2")).toBeNull();
  });

  it("invalidates entries matching pattern", () => {
    cacheSet("/rest/getAlbum?id=1", "album1");
    cacheSet("/rest/getAlbum?id=2", "album2");
    cacheSet("/rest/getArtists", "artists");
    cacheInvalidate("getAlbum");
    expect(cacheGet("/rest/getAlbum?id=1")).toBeNull();
    expect(cacheGet("/rest/getAlbum?id=2")).toBeNull();
    expect(cacheGet("/rest/getArtists")).toEqual("artists");
  });

  it("evicts oldest entry when at capacity", () => {
    // fill to capacity (50)
    for (let i = 0; i < 50; i++) {
      cacheSet(`key-${i}`, `value-${i}`);
    }
    // add one more
    cacheSet("overflow", "value");
    // key-0 should be evicted
    expect(cacheGet("key-0")).toBeNull();
    // overflow should exist
    expect(cacheGet("overflow")).toEqual("value");
  });
});

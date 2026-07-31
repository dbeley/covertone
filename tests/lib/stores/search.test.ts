import { describe, it, expect, beforeEach } from "vitest";
import { searchStore } from "$lib/stores/search";
import { get } from "svelte/store";

describe("searchStore", () => {
  beforeEach(() => {
    searchStore.reset();
  });

  it("stores the query", () => {
    searchStore.setQuery("radiohead");
    expect(get(searchStore).query).toBe("radiohead");
  });

  it("stores search results", () => {
    const results = {
      artists: [{ id: "a1", name: "Radiohead" }],
      albums: [],
      songs: [],
    };
    searchStore.setResults(results);
    const state = get(searchStore);
    expect(state.artists).toEqual(results.artists);
    expect(state.hasSearched).toBe(false);
  });

  it("reset clears the state", () => {
    searchStore.setQuery("q");
    searchStore.setResults({ artists: [{ id: "a1", name: "X" }], albums: [], songs: [] });
    searchStore.reset();
    const state = get(searchStore);
    expect(state.query).toBe("");
    expect(state.artists).toEqual([]);
    expect(state.hasSearched).toBe(false);
  });
});

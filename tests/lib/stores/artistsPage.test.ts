import { describe, it, expect, beforeEach } from "vitest";
import { artistsPageStore } from "$lib/stores/artistsPage";
import { get } from "svelte/store";

describe("artistsPageStore", () => {
  beforeEach(() => {
    artistsPageStore.set({ query: "", debouncedQuery: "", visibleCount: 6 });
  });

  it("keeps the filter when the page component remounts", () => {
    artistsPageStore.set({
      query: "black metal",
      debouncedQuery: "black metal",
      visibleCount: 10,
    });
    expect(get(artistsPageStore)).toEqual({
      query: "black metal",
      debouncedQuery: "black metal",
      visibleCount: 10,
    });
  });

  it("resets to the default query when set to empty", () => {
    artistsPageStore.set({ query: "", debouncedQuery: "", visibleCount: 6 });
    expect(get(artistsPageStore).query).toBe("");
    expect(get(artistsPageStore).debouncedQuery).toBe("");
  });
});

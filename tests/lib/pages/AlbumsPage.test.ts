import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import { library } from "$lib/stores/library";
import { settings } from "$lib/stores/settings";
import { SubsonicAPI } from "$lib/api/SubsonicAPI";
import AlbumsPage from "$lib/pages/AlbumsPage.svelte";
import type { Album } from "$lib/api/types";

vi.mock("$lib/api/SubsonicAPI");

const mockAlbum: Album = {
  id: "1",
  name: "Album",
  artist: "Artist",
  artistId: "a1",
  coverArt: "ca-1",
  songCount: 10,
  duration: 3000,
  year: 2024,
};

function stubDom() {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  Element.prototype.getBoundingClientRect = () => ({
    top: 1000,
    bottom: 1000,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  } as DOMRect);
}

describe("AlbumsPage back-navigation", () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    stubDom();
    library.reset();
    settings.reset();
    settings.setServerConfig({ server: "https://example.com", username: "u", password: "p" });
    mockApi = {
      getAlbumList: vi
        .fn()
        .mockResolvedValue({ albumList2: { album: [mockAlbum] } }),
      getAlbum: vi.fn(),
      getArtists: vi.fn(),
    };
    (SubsonicAPI as any).mockImplementation(() => mockApi);
    library.init({ server: "https://example.com", username: "u", password: "p" });
  });

  it("does not refetch and keeps A-Z tab active when returning with A-Z data in store", async () => {
    await library.fetchAlbums({ type: "alphabeticalByName", offset: 0 });
    expect(get(library).currentAlbumListType).toBe("alphabeticalByName");
    mockApi.getAlbumList.mockClear();

    render(AlbumsPage);

    const aToZ = screen.getAllByText("A-Z")[0];
    expect(aToZ.className).toContain("bg-accent");
    expect(mockApi.getAlbumList).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import FavoritesPage from "$lib/pages/FavoritesPage.svelte";

const mockInstance = vi.hoisted(() => ({
  getStarred: vi.fn(),
  star: vi.fn(),
  unstar: vi.fn(),
}));

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({
        serverUrl: "http://test",
        username: "u",
        password: "p",
        isConfigured: true,
      });
      return vi.fn();
    }),
  },
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  SubsonicAPI: vi.fn().mockImplementation(() => mockInstance),
  getCoverArtUrl: vi.fn(() => ""),
}));

vi.mock("$lib/components/AlbumGrid.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>AlbumGrid</div>"),
}));

vi.mock("$lib/components/LazyImage.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>LazyImage</div>"),
}));

vi.mock("$lib/stores/player", () => ({
  player: {
    subscribe: vi.fn(() => vi.fn()),
    playTrack: vi.fn(),
  },
}));

vi.mock("$lib/stores/queue", () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    replaceAll: vi.fn(),
    playIndex: vi.fn(),
  },
}));

const starredData = {
  starred: {
    artist: [
      { id: "a1", name: "Test Artist", albumCount: 3 },
    ],
    album: [
      { id: "al1", name: "Test Album", artist: "Artist", artistId: "a1", coverArt: "ca1", songCount: 5, duration: 1000 },
    ],
    song: [
      { id: "s1", title: "Test Song", artist: "Artist", album: "Album", albumId: "al1", duration: 200 },
    ],
  },
};

const emptyData = { starred: { artist: [], album: [], song: [] } };

describe("FavoritesPage", () => {
  beforeEach(() => {
    mockInstance.getStarred.mockClear();
    mockInstance.star.mockClear();
    mockInstance.unstar.mockClear();
  });

  it("shows loading state initially", () => {
    mockInstance.getStarred.mockResolvedValue(emptyData);
    render(FavoritesPage);
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(mockInstance.getStarred).toHaveBeenCalledTimes(1);
  });

  it("renders sections for artists, albums, and songs", async () => {
    mockInstance.getStarred = vi.fn().mockResolvedValue(starredData);
    render(FavoritesPage);
    await vi.waitFor(() => {
      expect(screen.getByText("Artists")).toBeTruthy();
    }, { timeout: 3000 });
    expect(screen.getByText("Albums")).toBeTruthy();
    expect(screen.getByText("Songs")).toBeTruthy();
    expect(screen.getByText("Test Artist")).toBeTruthy();
    expect(screen.getByText("Test Song")).toBeTruthy();
  });

  it("shows empty state when no items are starred", async () => {
    mockInstance.getStarred.mockResolvedValue(emptyData);
    render(FavoritesPage);
    await vi.waitFor(() => {
      expect(screen.getByText(/No starred items yet/i)).toBeTruthy();
    });
  });
});

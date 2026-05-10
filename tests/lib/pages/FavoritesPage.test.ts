import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
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
    album: [
      { id: "al1", name: "Test Album", artist: "Artist", artistId: "a1", coverArt: "ca1", songCount: 5, duration: 1000, starred: "2024-01-01T00:00:00Z" },
    ],
    artist: [
      { id: "a1", name: "Test Artist", albumCount: 3, starred: "2024-01-01T00:00:00Z" },
    ],
    song: [
      { id: "s1", title: "Test Song", artist: "Artist", album: "Album", albumId: "al1", duration: 200, starred: "2024-01-01T00:00:00Z" },
    ],
  },
};

const emptyData = { starred: { album: [], artist: [], song: [] } };

describe("FavoritesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockInstance.getStarred.mockResolvedValue(emptyData);
    render(FavoritesPage);
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(mockInstance.getStarred).toHaveBeenCalledTimes(1);
  });

  it("shows Albums tab by default", async () => {
    mockInstance.getStarred.mockResolvedValue(starredData);
    render(FavoritesPage);
    expect(await screen.findByText("Albums")).toBeTruthy();
    expect(screen.getByText("Albums")!.classList.contains("bg-accent")).toBe(true);
  });

  it("loads everything on mount and shows sort dropdown on all tabs", async () => {
    mockInstance.getStarred.mockResolvedValue(starredData);
    render(FavoritesPage);
    await screen.findByText("Albums");
    const tabs = ["Artists", "Songs"];
    for (const tab of tabs) {
      await fireEvent.click(screen.getByText(tab));
      expect(screen.getByLabelText("Sort order")).toBeTruthy();
    }
  });

  it("switching tabs shows correct content", async () => {
    mockInstance.getStarred.mockResolvedValue(starredData);
    render(FavoritesPage);
    await screen.findByText("Albums");
    const artistsTab = screen.getByText("Artists");
    await fireEvent.click(artistsTab);
    expect(await screen.findByText("Test Artist")).toBeTruthy();
    const songsTab = screen.getByText("Songs");
    await fireEvent.click(songsTab);
    expect(await screen.findByText("Test Song")).toBeTruthy();
  });

  it("shows empty state when no items are starred", async () => {
    mockInstance.getStarred.mockResolvedValue(emptyData);
    render(FavoritesPage);
    expect(await screen.findByText(/No starred albums yet/i)).toBeTruthy();
  });
});

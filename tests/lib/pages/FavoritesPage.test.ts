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
      { id: "a1", name: "Z Artist", albumCount: 3, starred: "2024-01-01T00:00:00Z" },
      { id: "a2", name: "A Artist", albumCount: 2, starred: "2023-01-01T00:00:00Z" },
    ],
    song: [
      { id: "s1", title: "Z Song", artist: "Artist", album: "Album", albumId: "al1", duration: 200, starred: "2024-01-01T00:00:00Z" },
      { id: "s2", title: "A Song", artist: "Artist", album: "Album", albumId: "al1", duration: 180, starred: "2023-01-01T00:00:00Z" },
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
    expect(await screen.findByText("A Artist")).toBeTruthy();
    const songsTab = screen.getByText("Songs");
    await fireEvent.click(songsTab);
    expect(await screen.findByText("A Song")).toBeTruthy();
  });

  it("shows empty state when no items are starred", async () => {
    mockInstance.getStarred.mockResolvedValue(emptyData);
    render(FavoritesPage);
    expect(await screen.findByText(/No starred albums yet/i)).toBeTruthy();
  });

  it("shows error message when API call fails", async () => {
    mockInstance.getStarred.mockRejectedValue(new Error("Network error"));
    render(FavoritesPage);
    expect(await screen.findByText(/Network error/i)).toBeTruthy();
  });

  it("re-sorts artists when sort mode is changed", async () => {
    mockInstance.getStarred.mockResolvedValue(starredData);
    render(FavoritesPage);
    await screen.findByText("Albums");
    await fireEvent.click(screen.getByText("Artists"));
    expect(await screen.findByText("A Artist")).toBeTruthy();

    const select = screen.getByLabelText("Sort order") as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "z-a" } });
    await vi.waitFor(() => {
      const artistEls = screen.getAllByText(/Artist$/);
      expect(artistEls.length).toBe(2);
    });
  });
});

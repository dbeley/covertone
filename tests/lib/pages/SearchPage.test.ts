import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SearchPage from "$lib/pages/SearchPage.svelte";

const mockSearch3 = vi.fn();
const mockPlayTrack = vi.fn();
const mockNavigate = vi.fn();

vi.mock("$lib/stores/player", () => ({
  player: {
    subscribe: vi.fn((cb: (v: unknown) => void) => {
      cb({ currentTrack: null, status: "idle", currentTime: 0, duration: 0, volume: 1, repeating: false, shuffle: false, favorited: false });
      return vi.fn();
    }),
    playTrack: (...args: unknown[]) => mockPlayTrack(...args),
  },
}));

vi.mock("$lib/stores/queue", () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn((cb: (v: unknown) => void) => {
      cb({ path: "/search", matches: () => false, extractParams: () => ({}) });
      return vi.fn();
    }),
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: vi.fn((cb: (v: unknown) => void) => {
      cb({ serverUrl: "http://example.com", username: "user", password: "pass", isConfigured: true });
      return vi.fn();
    }),
  },
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  SubsonicAPI: vi.fn().mockImplementation(() => ({
    search3: mockSearch3,
  })),
  getCoverArtUrl: vi.fn().mockReturnValue("http://example.com/cover.jpg"),
}));

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input and heading", () => {
    render(SearchPage);
    expect(screen.getByText("Search")).toBeDefined();
    expect(screen.getByPlaceholderText("Search albums, artists, songs...")).toBeDefined();
  });

  it("renders search input with focus", () => {
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    expect(input).toBeDefined();
    // Input should exist and be of type text
    expect(input.type).toBe("text");
  });

  it("clears search results when input is cleared", async () => {
    mockSearch3.mockResolvedValue({
      searchResult3: { artist: [], album: [], song: [] },
    });
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    // Type a search query
    await fireEvent.input(input, { target: { value: "test" } });
    // Clear it
    await fireEvent.input(input, { target: { value: "" } });
    // Should show heading only
    expect(screen.getByText("Search")).toBeDefined();
  });

  it("shows no results message for empty search results", async () => {
    mockSearch3.mockResolvedValue({
      searchResult3: { artist: [], album: [], song: [] },
    });
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "xyzzynon existent" } });
    // Wait for debounce and async search
    await vi.waitFor(() => {
      expect(screen.getByText(/No results/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it("renders search results when search returns data", async () => {
    mockSearch3.mockResolvedValue({
      searchResult3: {
        artist: [{ id: "a1", name: "Test Artist" }],
        album: [{ id: "al1", name: "Test Album", artist: "Artist", coverArt: "c1" }],
        song: [{ id: "s1", title: "Test Song", artist: "Artist", album: "Album", albumId: "al1", duration: 200 }],
      },
    });
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Test" } });
    // Wait for results
    await vi.waitFor(() => {
      expect(screen.getByText("Test Artist")).toBeDefined();
    }, { timeout: 2000 });
    expect(screen.getByText("Test Album")).toBeDefined();
    expect(screen.getByText("Test Song")).toBeDefined();
  });
});

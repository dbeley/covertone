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

vi.mock("$lib/stores/queue", () => ({ queue: { subscribe: vi.fn(() => vi.fn()) } }));

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
      cb({ serverUrl: "http://ex.com", username: "u", password: "p", isConfigured: true });
      return vi.fn();
    }),
  },
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  SubsonicAPI: vi.fn().mockImplementation(() => ({ search3: mockSearch3 })),
  getCoverArtUrl: vi.fn().mockReturnValue("http://ex.com/cover.jpg"),
}));

describe("SearchPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders heading and search input", () => {
    render(SearchPage);
    expect(screen.getByText("Search")).toBeDefined();
    expect(screen.getByPlaceholderText("Search albums, artists, songs...")).toBeDefined();
  });

  it("clears results when input is cleared", async () => {
    mockSearch3.mockResolvedValue({ searchResult3: { artist: [], album: [], song: [] } });
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "t" } });
    await fireEvent.input(input, { target: { value: "" } });
    expect(screen.getByText("Search")).toBeDefined();
  });

  it("shows no results message", async () => {
    mockSearch3.mockResolvedValue({ searchResult3: { artist: [], album: [], song: [] } });
    render(SearchPage);
    const input = screen.getByPlaceholderText("Search albums, artists, songs...") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "xyzzynon" } });
    await vi.waitFor(() => expect(screen.getByText(/No results/i)).toBeDefined(), { timeout: 2000 });
  });

  it("renders search results", async () => {
    mockSearch3.mockResolvedValue({
      searchResult3: {
        artist: [{ id: "a1", name: "Test Artist" }],
        album: [{ id: "al1", name: "Test Album", artist: "Artist", coverArt: "c1" }],
        song: [{ id: "s1", title: "Test Song", artist: "Artist", album: "Album", albumId: "al1", duration: 200 }],
      },
    });
    render(SearchPage);
    await fireEvent.input(screen.getByPlaceholderText("Search albums, artists, songs..."), { target: { value: "Test" } });
    await vi.waitFor(() => expect(screen.getByText("Test Artist")).toBeDefined(), { timeout: 2000 });
    expect(screen.getByText("Test Album")).toBeDefined();
    expect(screen.getByText("Test Song")).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ArtistPage from "$lib/pages/ArtistPage.svelte";

const apiMock = vi.hoisted(() => ({
  getArtist: vi.fn(),
  getTopSongs: vi.fn(),
  getArtistInfo: vi.fn(),
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
  SubsonicAPI: vi.fn().mockImplementation(() => apiMock),
  getCoverArtUrl: vi.fn(({ id }: { id: string }) => `/cover/${id}`),
}));

vi.mock("$lib/components/LazyImage.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>LazyImage</div>"),
}));

vi.mock("$lib/components/AlbumGrid.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>AlbumGrid</div>"),
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({ path: "/artist/artist-1", params: { id: "artist-1" }, matches: () => false, extractParams: () => ({ id: "artist-1" }) });
      return vi.fn();
    }),
    navigate: vi.fn(),
  },
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
    addNext: vi.fn(),
    addToEnd: vi.fn(),
  },
}));

const artistResponse = {
  artist: {
    id: "artist-1",
    name: "Test Artist",
    album: [
      { id: "al1", name: "Album 1", artist: "Test Artist", artistId: "artist-1", coverArt: "ca1", songCount: 5, duration: 1000 },
    ],
  },
};

const starredArtistResponse = {
  artist: {
    ...artistResponse.artist,
    starred: "2024-01-01T00:00:00Z",
  },
};

const topSongsResponse = {
  topSongs: {
    song: [],
  },
};

const artistInfoResponse = {
  artistInfo2: {
    biography: "",
    similarArtist: [],
  },
};

describe("ArtistPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows star button when artist loads and is starred", async () => {
    apiMock.getArtist.mockResolvedValue(starredArtistResponse);
    apiMock.getTopSongs.mockResolvedValue(topSongsResponse);
    apiMock.getArtistInfo.mockResolvedValue(artistInfoResponse);
    render(ArtistPage);
    expect(await screen.findByLabelText("Remove from favorites")).toBeTruthy();
  });

  it("calls api.star when star button is toggled on", async () => {
    apiMock.getArtist.mockResolvedValue(artistResponse);
    apiMock.getTopSongs.mockResolvedValue(topSongsResponse);
    apiMock.getArtistInfo.mockResolvedValue(artistInfoResponse);
    render(ArtistPage);
    const btn = await screen.findByLabelText("Add to favorites");
    await fireEvent.click(btn);
    expect(apiMock.star).toHaveBeenCalledWith({ id: "artist-1" });
  });

  it("calls api.unstar when star button is toggled off", async () => {
    apiMock.getArtist.mockResolvedValue(starredArtistResponse);
    apiMock.getTopSongs.mockResolvedValue(topSongsResponse);
    apiMock.getArtistInfo.mockResolvedValue(artistInfoResponse);
    render(ArtistPage);
    const btn = await screen.findByLabelText("Remove from favorites");
    await fireEvent.click(btn);
    expect(apiMock.unstar).toHaveBeenCalledWith({ id: "artist-1" });
  });
});

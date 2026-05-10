import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import AlbumPage from "$lib/pages/AlbumPage.svelte";

const apiMock = vi.hoisted(() => ({
  getAlbum: vi.fn(),
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

vi.mock("$lib/components/TrackList.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>TrackList</div>"),
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({ path: "/album/album-1", params: { id: "album-1" }, matches: () => false, extractParams: () => ({ id: "album-1" }) });
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
    addTracksToEnd: vi.fn(),
  },
}));

const albumData = {
  album: {
    id: "album-1",
    name: "Test Album",
    artist: "Test Artist",
    artistId: "artist-1",
    coverArt: "ca1",
    songCount: 5,
    duration: 1000,
    created: "2024-01-01T00:00:00Z",
    starred: "2024-01-01T00:00:00Z",
    song: [
      { id: "s1", title: "Song 1", artist: "Test Artist", album: "Test Album", albumId: "album-1", duration: 200 },
    ],
  },
};

describe("AlbumPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows star button when album loads", async () => {
    apiMock.getAlbum.mockResolvedValue(albumData);
    render(AlbumPage);
    expect(await screen.findByLabelText("Remove from favorites")).toBeTruthy();
  });

  it("calls api.star when star button is toggled on", async () => {
    const unstarred = {
      album: { ...albumData.album, starred: undefined, song: albumData.album.song },
    };
    apiMock.getAlbum.mockResolvedValue(unstarred);
    render(AlbumPage);
    const btn = await screen.findByLabelText("Add to favorites");
    await fireEvent.click(btn);
    expect(apiMock.star).toHaveBeenCalledWith({ id: "album-1" });
  });

  it("calls api.unstar when star button is toggled off", async () => {
    apiMock.getAlbum.mockResolvedValue(albumData);
    render(AlbumPage);
    const btn = await screen.findByLabelText("Remove from favorites");
    await fireEvent.click(btn);
    expect(apiMock.unstar).toHaveBeenCalledWith({ id: "album-1" });
  });
});

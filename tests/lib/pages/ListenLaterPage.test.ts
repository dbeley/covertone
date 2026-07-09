import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ListenLaterPage from "$lib/pages/ListenLaterPage.svelte";
import { listenLater } from "$lib/stores/listenLater";

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
  SubsonicAPI: vi.fn(),
  getCoverArtUrl: vi.fn(() => ""),
}));

vi.mock("$lib/components/AlbumCard.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>AlbumCard</div>"),
}));

vi.mock("$lib/components/LazyImage.svelte", () => ({
  default: vi.fn().mockImplementation(() => "<div>LazyImage</div>"),
}));

vi.mock("$lib/stores/player", () => ({
  player: { subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock("$lib/stores/queue", () => ({
  queue: { subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn(() => vi.fn()),
    navigate: vi.fn(),
  },
}));

const albumA = {
  id: "a1",
  name: "Album A",
  artist: "Artist A",
  artistId: "art1",
  coverArt: "ca1",
  songCount: 5,
  duration: 1000,
};

const albumB = {
  id: "a2",
  name: "Album B",
  artist: "Artist B",
  artistId: "art2",
  coverArt: "ca2",
  songCount: 3,
  duration: 500,
};

describe("ListenLaterPage", () => {
  beforeEach(() => {
    listenLater.clear();
  });

  it("shows empty state when no albums saved", () => {
    render(ListenLaterPage);
    expect(screen.getByText("Nothing saved yet")).toBeTruthy();
  });

  it("shows heading and Clear all when albums are saved", () => {
    listenLater.add(albumA);
    listenLater.add(albumB);
    render(ListenLaterPage);
    expect(screen.getByText("Listen Later")).toBeTruthy();
    expect(screen.getByText("Clear all")).toBeTruthy();
  });

  it("clears all albums when Clear all is clicked", async () => {
    listenLater.add(albumA);
    listenLater.add(albumB);
    render(ListenLaterPage);
    const clearBtn = screen.getByText("Clear all");
    await fireEvent.click(clearBtn);
    expect(listenLater.getAll()).toEqual([]);
  });
});

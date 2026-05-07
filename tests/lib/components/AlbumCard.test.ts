import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import AlbumCard from "$lib/components/AlbumCard.svelte";
import type { Album } from "$lib/api/types";

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    navigate,
  },
}));

describe("AlbumCard", () => {
  const album: Album = {
    id: "album-1",
    name: "Album One",
    artist: "Artist One",
    artistId: "artist-1",
    coverArt: "cover-1",
    songCount: 10,
    duration: 1800,
    created: "2024-01-01",
  };

  beforeEach(() => {
    navigate.mockClear();
  });

  it("navigates to album page on click", async () => {
    render(AlbumCard, { album, coverArtUrl: "https://example.com/cover.jpg" });
    const card = screen.getByRole("button", { name: "Open album Album One" });
    await fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith("album/album-1");
  });

  it("navigates to album page on keyboard activation", async () => {
    render(AlbumCard, { album, coverArtUrl: "https://example.com/cover.jpg" });
    const card = screen.getByRole("button", { name: "Open album Album One" });
    await fireEvent.keyDown(card, { key: "Enter" });
    await fireEvent.keyDown(card, { key: " " });
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, "album/album-1");
    expect(navigate).toHaveBeenNthCalledWith(2, "album/album-1");
  });
});

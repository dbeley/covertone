import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import AlbumGrid from "$lib/components/AlbumGrid.svelte";
import type { Album } from "$lib/api/types";

const mockAlbums: Album[] = [
  { id: "1", name: "Album One", artist: "Artist A", artistId: "a1", coverArt: "c1", songCount: 10, duration: 3600, year: 2020 },
  { id: "2", name: "Album Two", artist: "Artist B", artistId: "a2", coverArt: "c2", songCount: 12, duration: 4200, year: 2021 },
];

const baseProps = { albums: mockAlbums, serverUrl: "http://ex.com", username: "u", password: "p" };

describe("AlbumGrid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all album cards", () => {
    render(AlbumGrid, baseProps);
    expect(screen.getByText("Album One")).toBeDefined();
    expect(screen.getByText("Album Two")).toBeDefined();
  });

  it("shows artist names", () => {
    render(AlbumGrid, baseProps);
    expect(screen.getByText("Artist A")).toBeDefined();
    expect(screen.getByText("Artist B")).toBeDefined();
  });

  it("renders empty grid for empty array", () => {
    const { container } = render(AlbumGrid, { ...baseProps, albums: [] });
    const grid = container.querySelector(".grid");
    expect(grid?.children.length).toBe(0);
  });

  it("has responsive grid classes", () => {
    const { container } = render(AlbumGrid, baseProps);
    expect(container.querySelector(".grid")?.className).toContain("grid-cols-2");
  });
});

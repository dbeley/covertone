import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import AlbumGrid from "$lib/components/AlbumGrid.svelte";
import type { Album } from "$lib/api/types";

const mockAlbums: Album[] = [
  {
    id: "1",
    name: "Album One",
    artist: "Artist A",
    artistId: "a1",
    coverArt: "cover-1",
    songCount: 10,
    duration: 3600,
    year: 2020,
  },
  {
    id: "2",
    name: "Album Two",
    artist: "Artist B",
    artistId: "a2",
    coverArt: "cover-2",
    songCount: 12,
    duration: 4200,
    year: 2021,
  },
];

const props = {
  albums: mockAlbums,
  serverUrl: "http://example.com",
  username: "user",
  password: "pass",
};

describe("AlbumGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders album cards for each album", () => {
    render(AlbumGrid, props);
    expect(screen.getByText("Album One")).toBeDefined();
    expect(screen.getByText("Album Two")).toBeDefined();
  });

  it("renders artist names", () => {
    render(AlbumGrid, props);
    expect(screen.getByText("Artist A")).toBeDefined();
    expect(screen.getByText("Artist B")).toBeDefined();
  });

  it("renders empty grid for empty albums array", () => {
    const { container } = render(AlbumGrid, { ...props, albums: [] });
    const grid = container.querySelector(".grid");
    expect(grid).toBeDefined();
    expect(grid?.children.length).toBe(0);
  });

  it("renders correct grid classes", () => {
    const { container } = render(AlbumGrid, props);
    const grid = container.querySelector(".grid");
    expect(grid).toBeDefined();
    expect(grid?.className).toContain("grid-cols-2");
  });
});

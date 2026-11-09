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

  describe("maxRows", () => {
    const many: Album[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      name: `Album ${i}`,
      artist: "Artist",
      artistId: "a",
      coverArt: `c${i}`,
      songCount: 1,
      duration: 1,
      year: 2020,
    }));

    function mockColumns(count: number) {
      vi.spyOn(window, "getComputedStyle").mockImplementation(
        () => ({ gridTemplateColumns: Array.from({ length: count }, () => "100px").join(" ") }) as CSSStyleDeclaration,
      );
    }

    it("renders only columns x rows albums", () => {
      mockColumns(3);
      const { container } = render(AlbumGrid, { ...baseProps, albums: many, maxRows: 2 });
      expect(container.querySelectorAll(".glass").length).toBe(6);
    });

    it("renders everything when maxRows is not set", () => {
      mockColumns(3);
      const { container } = render(AlbumGrid, { ...baseProps, albums: many });
      expect(container.querySelectorAll(".glass").length).toBe(10);
    });

    it("never renders more albums than available", () => {
      mockColumns(8);
      const { container } = render(AlbumGrid, { ...baseProps, maxRows: 2 });
      expect(container.querySelectorAll(".glass").length).toBe(2);
    });
  });
});

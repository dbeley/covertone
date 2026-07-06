import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import TrackList from "$lib/components/TrackList.svelte";
import { player } from "$lib/stores/player";
import { library } from "$lib/stores/library";
import type { Song } from "$lib/api/types";

const mockPlayerState = {
  status: "idle" as const,
  currentTrack: null as Song | null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  repeating: false,
  shuffle: false,
  favorited: false,
};

const mockStar = vi.fn();
const mockUnstar = vi.fn();

vi.mock("$lib/stores/player", () => ({
  player: {
    subscribe: vi.fn((cb: (state: typeof mockPlayerState) => void) => {
      cb(mockPlayerState);
      return vi.fn();
    }),
    playTrack: vi.fn(),
    togglePlay: vi.fn(),
  },
}));

vi.mock("$lib/stores/queue", () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    addNext: vi.fn(),
    addToEnd: vi.fn(),
  },
}));

vi.mock("$lib/stores/library", () => ({
  library: {
    getApi: vi.fn(() => ({
      star: mockStar,
      unstar: mockUnstar,
    })),
  },
}));

describe("TrackList", () => {
  const songs: Song[] = [
    {
      id: "1",
      title: "Song One",
      artist: "Artist A",
      album: "Album A",
      albumId: "a1",
      duration: 180,
      track: 1,
    },
    {
      id: "2",
      title: "Song Two",
      artist: "Artist B",
      album: "Album B",
      albumId: "b1",
      duration: 240,
      track: 2,
    },
    {
      id: "3",
      title: "Song Three",
      artist: "Artist C",
      album: "Album C",
      albumId: "c1",
      duration: 200,
      track: 3,
    },
  ];

  beforeEach(() => {
    mockPlayerState.currentTrack = null;
    vi.mocked(player.playTrack).mockClear();
    mockStar.mockReset();
    mockUnstar.mockReset();
  });

  it("renders song titles", () => {
    render(TrackList, { songs });
    expect(screen.getByText("Song One")).toBeTruthy();
    expect(screen.getByText("Song Two")).toBeTruthy();
    expect(screen.getByText("Song Three")).toBeTruthy();
  });

  it("renders song artists", () => {
    render(TrackList, { songs });
    expect(screen.getByText("Artist A")).toBeTruthy();
    expect(screen.getByText("Artist B")).toBeTruthy();
    expect(screen.getByText("Artist C")).toBeTruthy();
  });

  it("renders formatted durations", () => {
    render(TrackList, { songs });
    expect(screen.getByText("3:00")).toBeTruthy();
    expect(screen.getByText("4:00")).toBeTruthy();
    expect(screen.getByText("3:20")).toBeTruthy();
  });

  it("renders track numbers", () => {
    render(TrackList, { songs });
    expect(screen.getAllByText("1")[0]).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
    expect(screen.getAllByText("3")[0]).toBeTruthy();
  });

  it("renders context menu buttons", () => {
    render(TrackList, { songs });
    const buttons = screen.getAllByLabelText("Track options");
    expect(buttons.length).toBe(3);
  });

  it("calls player.playTrack by default when a row is clicked", async () => {
    render(TrackList, { songs });
    const row = screen
      .getByText("Song Two")
      .closest('[role="button"]') as HTMLElement;
    await fireEvent.click(row);
    expect(player.playTrack).toHaveBeenCalledTimes(1);
  });

  it("calls onPlay callback with song and index when provided", async () => {
    const onPlay = vi.fn();
    render(TrackList, { songs, onPlay });
    const row = screen
      .getByText("Song Two")
      .closest('[role="button"]') as HTMLElement;
    await fireEvent.click(row);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(songs[1], 1);
    expect(player.playTrack).not.toHaveBeenCalled();
  });

  it("no longer manages its own bottom padding (handled by AppShell)", () => {
    const { container } = render(TrackList, { songs });
    const list = container.querySelector(".w-full") as HTMLElement;
    expect(list.hasAttribute("style")).toBe(false);
  });

  it("no longer manages its own bottom padding even with a current track (handled by AppShell)", () => {
    mockPlayerState.currentTrack = songs[0];
    const { container } = render(TrackList, { songs });
    const list = container.querySelector(".w-full") as HTMLElement;
    expect(list.hasAttribute("style")).toBe(false);
  });

  describe("context menu", () => {
    it("opens context menu with fixed positioning when clicking the three-dot button", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      const menu = document.querySelector('[role="menu"]') as HTMLElement;
      expect(menu).not.toBeNull();
      // The 'fixed' class is set via Tailwind (not inline style)
      expect(menu.classList.contains("fixed")).toBe(true);
      // Inline style contains computed top/right positions
      expect(menu.getAttribute("style")).toMatch(/top:/);
      expect(menu.getAttribute("style")).toMatch(/right:/);
    });

    it("shows Play After and Add to Queue buttons in the menu", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      expect(screen.getByText("Play After")).toBeTruthy();
      expect(screen.getByText("Add to Queue")).toBeTruthy();
    });

    it("closes the menu when clicking the backdrop", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      expect(document.querySelector('[role="menu"]')).not.toBeNull();

      const backdrop = document.querySelector(
        '[role="presentation"]',
      ) as HTMLElement;
      await fireEvent.click(backdrop);

      expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it("closes the menu when clicking the three-dot button again", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");

      // Open
      await fireEvent.click(buttons[0]);
      expect(document.querySelector('[role="menu"]')).not.toBeNull();

      // Close by clicking same button again
      await fireEvent.click(buttons[0]);
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it("calls queue.addNext when Play After is clicked", async () => {
      const { queue } = await import("$lib/stores/queue");
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      const playAfterBtn = screen.getByText("Play After");
      await fireEvent.click(playAfterBtn);

      expect(queue.addNext).toHaveBeenCalledWith(songs[0]);
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it("calls queue.addToEnd when Add to Queue is clicked", async () => {
      const { queue } = await import("$lib/stores/queue");
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      const addToQueueBtn = screen.getByText("Add to Queue");
      await fireEvent.click(addToQueueBtn);

      expect(queue.addToEnd).toHaveBeenCalledWith(songs[0]);
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });
  });

  describe("favorite toggle in context menu", () => {
    it("shows Add to Favorites button in the context menu", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      expect(screen.getByText("Add to Favorites")).toBeTruthy();
    });

    it("calls api.star when Add to Favorites is clicked", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      const favBtn = screen.getByText("Add to Favorites");
      await fireEvent.click(favBtn);

      expect(mockStar).toHaveBeenCalledWith({ id: "1" });
      expect(mockUnstar).not.toHaveBeenCalled();
    });

    it("shows Remove from Favorites for songs that are already starred", async () => {
      const starredSongs = [
        { ...songs[0], starred: "2026-06-01T12:00:00Z" },
        ...songs.slice(1),
      ];
      render(TrackList, { songs: starredSongs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      expect(screen.getByText("Remove from Favorites")).toBeTruthy();
    });

    it("calls api.unstar when Remove from Favorites is clicked on a starred song", async () => {
      const starredSongs = [
        { ...songs[0], starred: "2026-06-01T12:00:00Z" },
        ...songs.slice(1),
      ];
      render(TrackList, { songs: starredSongs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      const unfavBtn = screen.getByText("Remove from Favorites");
      await fireEvent.click(unfavBtn);

      expect(mockUnstar).toHaveBeenCalledWith({ id: "1" });
      expect(mockStar).not.toHaveBeenCalled();
    });

    it("updates the label to Remove from Favorites when reopening the menu after favoriting", async () => {
      mockStar.mockResolvedValue(undefined);
      render(TrackList, { songs });
      await fireEvent.click(screen.getAllByLabelText("Track options")[0]);

      // Starts as "Add to Favorites"
      expect(screen.getByText("Add to Favorites")).toBeTruthy();

      // Click Add to Favorites — menu closes
      await fireEvent.click(screen.getByText("Add to Favorites"));
      expect(mockStar).toHaveBeenCalledWith({ id: "1" });

      // Reopen the menu — should now show Remove from Favorites
      await fireEvent.click(screen.getAllByLabelText("Track options")[0]);
      expect(screen.getByText("Remove from Favorites")).toBeTruthy();
    });

    it("closes the menu after toggling favorite", async () => {
      render(TrackList, { songs });
      const buttons = screen.getAllByLabelText("Track options");
      await fireEvent.click(buttons[0]);

      await fireEvent.click(screen.getByText("Add to Favorites"));

      // Menu should close
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });
  });
});

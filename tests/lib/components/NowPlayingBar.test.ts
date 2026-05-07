import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import NowPlayingBar from "$lib/components/NowPlayingBar.svelte";
import { player } from "$lib/stores/player";

const mockPlayerState = {
  status: "idle" as const,
  currentTrack: null as {
    title: string;
    artist: string;
    coverArt?: string;
  } | null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  repeating: false,
  shuffle: false,
  favorited: false,
};

vi.mock("$lib/stores/player", () => ({
  player: {
    subscribe: vi.fn((cb: (state: typeof mockPlayerState) => void) => {
      cb(mockPlayerState);
      return vi.fn();
    }),
    togglePlay: vi.fn(),
    playTrack: vi.fn(),
  },
}));

vi.mock("$lib/stores/queue", () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    getNextAutoDJ: vi.fn().mockResolvedValue(null),
    getPrevious: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: vi.fn((cb: (state: { serverUrl: string }) => void) => {
      cb({
        serverUrl: "http://example.com",
        username: "user",
        password: "pass",
        isConfigured: true,
        theme: "dark",
        appliedTheme: "dark",
      });
      return vi.fn();
    }),
  },
}));

describe("NowPlayingBar", () => {
  beforeEach(() => {
    mockPlayerState.status = "idle";
    mockPlayerState.currentTrack = null;
    vi.mocked(player.togglePlay).mockClear();
  });

  it("does not render when idle", () => {
    const { container } = render(NowPlayingBar);
    expect(container.querySelector("div")).toBeNull();
  });

  it("renders track info when playing", () => {
    mockPlayerState.status = "playing";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
      coverArt: "123",
    };
    render(NowPlayingBar);
    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.getByText("Test Artist")).toBeTruthy();
  });

  it("renders pause button when playing", () => {
    mockPlayerState.status = "playing";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
    };
    render(NowPlayingBar);
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  it("renders play button when paused", () => {
    mockPlayerState.status = "paused";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
    };
    render(NowPlayingBar);
    expect(screen.getByLabelText("Play")).toBeTruthy();
  });

  it("renders previous button", () => {
    mockPlayerState.status = "playing";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
    };
    render(NowPlayingBar);
    expect(screen.getByLabelText("Previous")).toBeTruthy();
  });

  it("renders next button", () => {
    mockPlayerState.status = "playing";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
    };
    render(NowPlayingBar);
    expect(screen.getByLabelText("Next")).toBeTruthy();
  });

  it("calls togglePlay when play/pause button clicked", async () => {
    mockPlayerState.status = "playing";
    mockPlayerState.currentTrack = {
      title: "Test Song",
      artist: "Test Artist",
    };
    render(NowPlayingBar);
    const btn = screen.getByLabelText("Pause");
    await fireEvent.click(btn);
    expect(player.togglePlay).toHaveBeenCalledTimes(1);
  });
});

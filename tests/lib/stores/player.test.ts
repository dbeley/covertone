import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import type { Song } from "$lib/api/types";

let mockPaused = true;

const mockEngine = {
  load: vi.fn(),
  play: vi.fn().mockImplementation(() => {
    mockPaused = false;
  }),
  pause: vi.fn().mockImplementation(() => {
    mockPaused = true;
  }),
  toggle: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  isPaused: vi.fn().mockImplementation(() => mockPaused),
  onTimeUpdate: vi.fn(),
  onEnded: vi.fn(),
  onLoaded: vi.fn(),
  destroy: vi.fn().mockImplementation(() => {
    mockPaused = true;
  }),
};

vi.mock("$lib/player/AudioEngine", () => ({
  AudioEngine: vi.fn().mockImplementation(() => mockEngine),
}));

import { player } from "$lib/stores/player";

const mockSong: Song = {
  id: "1",
  title: "Test Song",
  artist: "Test Artist",
  album: "Test Album",
  albumId: "a1",
  duration: 200,
};

describe("player store", () => {
  beforeEach(() => {
    player.reset();
    mockPaused = true;
    vi.clearAllMocks();
  });

  it("has correct initial state", () => {
    const state = get(player);
    expect(state.status).toBe("idle");
    expect(state.currentTrack).toBeNull();
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.volume).toBe(1);
    expect(state.repeating).toBe(false);
    expect(state.shuffle).toBe(false);
    expect(state.favorited).toBe(false);
  });

  it("setStreamBase stores the stream base URL", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    expect(mockEngine.load).toHaveBeenCalledWith(
      "https://example.com/rest/stream?id=1",
    );
  });

  it("playTrack creates engine, loads, and plays", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);

    expect(mockEngine.load).toHaveBeenCalledWith(
      "https://example.com/rest/stream?id=1",
    );
    expect(mockEngine.play).toHaveBeenCalledTimes(1);

    const state = get(player);
    expect(state.currentTrack).toEqual(mockSong);
    expect(state.status).toBe("loading");
  });

  it("playTrack sets up engine callbacks", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);

    expect(mockEngine.onTimeUpdate).toHaveBeenCalledWith(expect.any(Function));
    expect(mockEngine.onEnded).toHaveBeenCalledWith(expect.any(Function));
    expect(mockEngine.onLoaded).toHaveBeenCalledWith(expect.any(Function));
  });

  it("playTrack destroys previous engine before creating new one", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    expect(mockEngine.destroy).not.toHaveBeenCalled();

    const song2: Song = { ...mockSong, id: "2" };
    player.playTrack(song2);
    expect(mockEngine.destroy).toHaveBeenCalledTimes(1);
  });

  it("pause sets status to paused", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    player.pause();
    expect(mockEngine.pause).toHaveBeenCalledTimes(1);
    const state = get(player);
    expect(state.status).toBe("paused");
  });

  it("resume sets status to playing", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    player.pause();
    player.resume();
    expect(mockEngine.play).toHaveBeenCalledTimes(2);
    const state = get(player);
    expect(state.status).toBe("playing");
  });

  it("togglePlay toggles between play and pause", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    // playTrack sets status to 'playing', mockEngine.isPaused should reflect actual state
    // After playTrack, play was called which sets mockPaused = false
    mockPaused = false;

    player.togglePlay();
    expect(mockEngine.pause).toHaveBeenCalledTimes(1);
    expect(get(player).status).toBe("paused");

    player.togglePlay();
    expect(mockEngine.play).toHaveBeenCalledTimes(2);
    expect(get(player).status).toBe("playing");
  });

  it("stop resets to idle", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    player.stop();
    expect(mockEngine.destroy).toHaveBeenCalledTimes(1);
    const state = get(player);
    expect(state.status).toBe("idle");
    expect(state.currentTrack).toBeNull();
  });

  it("seek delegates to engine", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    player.seek(30);
    expect(mockEngine.seek).toHaveBeenCalledWith(30);
  });

  it("setVolume delegates to engine", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    vi.clearAllMocks(); // clear playTrack calls
    player.setVolume(0.7);
    expect(mockEngine.setVolume).toHaveBeenCalledWith(0.7);
  });

  it("setVolume stores volume in state even without engine", () => {
    player.setVolume(0.3);
    expect(get(player).volume).toBe(0.3);
  });

  it("setRepeating toggles repeating", () => {
    player.setRepeating(true);
    expect(get(player).repeating).toBe(true);
    player.setRepeating(false);
    expect(get(player).repeating).toBe(false);
  });

  it("setShuffle toggles shuffle", () => {
    player.setShuffle(true);
    expect(get(player).shuffle).toBe(true);
    player.setShuffle(false);
    expect(get(player).shuffle).toBe(false);
  });

  it("setFavorited toggles favorited", () => {
    player.setFavorited(true);
    expect(get(player).favorited).toBe(true);
    player.setFavorited(false);
    expect(get(player).favorited).toBe(false);
  });

  it("reset destroys engine and resets state", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    player.setRepeating(true);
    player.setVolume(0.5);

    vi.clearAllMocks(); // clear playTrack destroy/spy calls
    player.reset();
    expect(mockEngine.destroy).toHaveBeenCalledTimes(1);
    const state = get(player);
    expect(state.status).toBe("idle");
    expect(state.currentTrack).toBeNull();
    expect(state.repeating).toBe(false);
    expect(state.volume).toBe(1);
  });

  it("engine timeupdate callback updates store", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");

    let timeCb: Function | null = null;
    mockEngine.onTimeUpdate.mockImplementation((cb: Function) => {
      timeCb = cb;
    });

    player.playTrack(mockSong);
    mockEngine.getCurrentTime.mockReturnValue(45);

    timeCb!(45);
    expect(get(player).currentTime).toBe(45);
  });

  it("engine onLoaded callback updates store", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");

    let loadedCb: Function | null = null;
    mockEngine.onLoaded.mockImplementation((cb: Function) => {
      loadedCb = cb;
    });

    player.playTrack(mockSong);
    loadedCb!(200);
    expect(get(player).duration).toBe(200);
  });

  it("engine onEnded callback sets status to ended/idle", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");

    let endedCb: Function | null = null;
    mockEngine.onEnded.mockImplementation((cb: Function) => {
      endedCb = cb;
    });

    player.playTrack(mockSong);
    endedCb!();
    expect(get(player).status).toBe("idle");
  });
});

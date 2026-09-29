import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import "fake-indexeddb/auto";
import { clearAll, putSong, putArt } from "$lib/offline/db";
import { registerCachedSong, clearResolveUrls } from "$lib/offline/resolve";
import type { Song } from "$lib/api/types";

let mockPaused = true;

const mockEngine = {
  load: vi.fn(),
  play: vi.fn().mockImplementation(() => {
    mockPaused = false;
    return Promise.resolve();
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
  onError: vi.fn(),
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
  beforeEach(async () => {
    player.reset();
    mockPaused = true;
    vi.clearAllMocks();
    // jsdom lacks these URL helpers; stub them so cache cleanup is safe.
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    clearResolveUrls();
    await clearAll();
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

    expect(mockEngine.onTimeUpdate).toHaveBeenCalledWith(expect.anything());
    expect(mockEngine.onEnded).toHaveBeenCalledWith(expect.anything());
    expect(mockEngine.onLoaded).toHaveBeenCalledWith(expect.anything());
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

  it("initializes favorited from track.starred on playTrack", () => {
    const starredSong: Song = {
      ...mockSong,
      id: "starred-1",
      starred: "2024-01-01T00:00:00Z",
    };
    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(starredSong);
    expect(get(player).favorited).toBe(true);

    const unstarredSong: Song = { ...mockSong, id: "unstarred-1" };
    player.playTrack(unstarredSong);
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

    let timeCb: ((...args: unknown[]) => void) | null = null;
    mockEngine.onTimeUpdate.mockImplementation(
      (cb: (...args: unknown[]) => void) => {
        timeCb = cb;
      },
    );

    player.playTrack(mockSong);
    mockEngine.getCurrentTime.mockReturnValue(45);

    timeCb!(45);
    expect(get(player).currentTime).toBe(45);
  });

  it("engine onLoaded callback updates store", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");

    let loadedCb: ((...args: unknown[]) => void) | null = null;
    mockEngine.onLoaded.mockImplementation(
      (cb: (...args: unknown[]) => void) => {
        loadedCb = cb;
      },
    );

    player.playTrack(mockSong);
    loadedCb!(200);
    expect(get(player).duration).toBe(200);
  });

  it("engine onEnded callback sets status to ended/idle", () => {
    player.setStreamBase("https://example.com/rest/stream?id=");

    let endedCb: ((...args: unknown[]) => void) | null = null;
    mockEngine.onEnded.mockImplementation(
      (cb: (...args: unknown[]) => void) => {
        endedCb = cb;
      },
    );

    player.playTrack(mockSong);
    endedCb!();
    expect(get(player).status).toBe("idle");
  });

  it("loads a cached blob URL and plays when the song is offline-cached", async () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:offline");

    await putSong("1", {
      albumId: "a1",
      song: mockSong,
      bytes: new TextEncoder().encode("audio").buffer,
    });
    registerCachedSong("1");

    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    await vi.waitFor(() =>
      expect(mockEngine.load).toHaveBeenLastCalledWith("blob:offline"),
    );
    expect(mockEngine.play).toHaveBeenCalledTimes(1);

    URL.createObjectURL = originalCreate;
  });

  it("retries from the offline cache when a remote stream errors", async () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:offline");

    await putSong("1", {
      albumId: "a1",
      song: mockSong,
      bytes: new TextEncoder().encode("audio").buffer,
    });
    // Not registered as cached -> player chooses the remote stream first.
    let errorCb: (() => void) | null = null;
    mockEngine.onError = vi.fn((cb: () => void) => {
      errorCb = cb;
    });

    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    expect(mockEngine.load).toHaveBeenLastCalledWith(
      "https://example.com/rest/stream?id=1",
    );

    errorCb!();
    await vi.waitFor(() =>
      expect(mockEngine.load).toHaveBeenLastCalledWith("blob:offline"),
    );
    expect(mockEngine.play).toHaveBeenCalledTimes(2);

    URL.createObjectURL = originalCreate;
  });

  it("revokes the previous track's blob URL when switching tracks", async () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:offline");
    const revoke = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    revoke.mockClear();

    await putSong("1", {
      albumId: "a1",
      song: mockSong,
      bytes: new TextEncoder().encode("audio").buffer,
    });
    registerCachedSong("1");

    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);
    // Wait until the cached blob resolves and loads before switching tracks.
    await vi.waitFor(() =>
      expect(mockEngine.load).toHaveBeenLastCalledWith("blob:offline"),
    );

    const other: Song = { ...mockSong, id: "other" };
    player.playTrack(other);

    expect(revoke).toHaveBeenCalledWith("blob:offline");

    URL.createObjectURL = originalCreate;
  });

  it("refreshes the native notification with cached artwork offline", async () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:offline");
    const setPlaying = vi.fn();
    (window as unknown as { NativeMedia?: object }).NativeMedia = {
      setPlaying,
      setPaused: vi.fn(),
      hide: vi.fn(),
      setArtwork: vi.fn(),
    };

    await putSong("1", {
      albumId: "a1",
      song: mockSong,
      bytes: new TextEncoder().encode("audio").buffer,
    });
    await putArt("a1:512", {
      bytes: new TextEncoder().encode("art").buffer,
      contentType: "image/jpeg",
    });
    registerCachedSong("1");

    player.setStreamBase("https://example.com/rest/stream?id=");
    player.playTrack(mockSong);

    // The remote URL is sent first; the cached blob must replace it once the
    // artwork resolves from IndexedDB.
    await vi.waitFor(() =>
      expect(setPlaying).toHaveBeenLastCalledWith(
        "Test Song",
        "Test Artist",
        "blob:offline",
      ),
    );

    delete (window as unknown as { NativeMedia?: object }).NativeMedia;
    URL.createObjectURL = originalCreate;
  });
});

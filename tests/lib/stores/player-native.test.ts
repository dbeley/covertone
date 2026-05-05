import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import type { Song } from "$lib/api/types";

const mockBridge = {
  setPlaying: vi.fn(),
  setPaused: vi.fn(),
  hide: vi.fn(),
};

Object.defineProperty(window, "NativeMedia", {
  value: mockBridge,
  writable: true,
});

const mockEngine = {
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
  onTimeUpdate: vi.fn(),
  onEnded: vi.fn(),
  onLoaded: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  isPaused: vi.fn().mockReturnValue(false),
};

vi.mock("$lib/player/AudioEngine", () => ({
  AudioEngine: vi.fn().mockImplementation(() => mockEngine),
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  scrobbleTrack: vi.fn(),
}));

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: vi.fn((cb: (state: any) => void) => {
      cb({ scrobbleEnabled: false });
      return vi.fn();
    }),
  },
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

describe("player store - NativeMedia integration", () => {
  beforeEach(() => {
    player.reset();
    mockBridge.setPlaying.mockClear();
    mockBridge.setPaused.mockClear();
    mockBridge.hide.mockClear();
    mockEngine.load.mockClear();
    mockEngine.play.mockClear();
    mockEngine.pause.mockClear();
    mockEngine.destroy.mockClear();
  });

  it("calls NativeMedia.setPlaying when playTrack is called", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);
    expect(mockBridge.setPlaying).toHaveBeenCalledWith("Test Song", "Test Artist");
  });

  it("calls NativeMedia.setPaused when pause is called", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);
    mockBridge.setPlaying.mockClear();

    player.pause();
    expect(mockBridge.setPaused).toHaveBeenCalledWith("Test Song", "Test Artist");
  });

  it("calls NativeMedia.setPlaying when resume is called", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);
    mockBridge.setPlaying.mockClear();
    player.pause();
    mockBridge.setPaused.mockClear();

    player.resume();
    expect(mockBridge.setPlaying).toHaveBeenCalledWith("Test Song", "Test Artist");
  });

  it("calls NativeMedia.hide when stop is called", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);
    mockBridge.setPlaying.mockClear();

    player.stop();
    expect(mockBridge.hide).toHaveBeenCalled();
  });

  it("calls NativeMedia.hide exactly once on stop after playTrack", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);
    player.stop();
    expect(mockBridge.hide).toHaveBeenCalledTimes(1);
  });

  it("does not call setPlaying or setPaused when silently reset", () => {
    player.reset();
    expect(mockBridge.setPlaying).not.toHaveBeenCalled();
    expect(mockBridge.setPaused).not.toHaveBeenCalled();
    expect(mockBridge.hide).not.toHaveBeenCalled();
  });

  it("calls setPlaying with updated metadata after second playTrack", () => {
    player.setStreamBase("http://example.com/stream?id=");
    player.playTrack(mockSong);

    const song2: Song = { ...mockSong, id: "2", title: "Second", artist: "Artist2" };
    mockBridge.setPlaying.mockClear();
    player.playTrack(song2);

    expect(mockBridge.setPlaying).toHaveBeenCalledWith("Second", "Artist2");
  });
});

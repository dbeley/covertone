import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioEngine } from "$lib/player/AudioEngine";

function createMockAudio() {
  const listeners: Record<string, EventListener[]> = {};
  const audio = {
    src: "",
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: 1,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      (listeners[event] ??= []).push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      const list = listeners[event];
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    }),
    play: vi.fn().mockImplementation(() => {
      audio.paused = false;
      return Promise.resolve();
    }),
    pause: vi.fn().mockImplementation(() => {
      audio.paused = true;
    }),
    load: vi.fn(),
  };

  function emit(event: string) {
    listeners[event]?.forEach((fn) => fn(new Event(event)));
  }

  return { audio, listeners, emit };
}

describe("AudioEngine", () => {
  let engine: AudioEngine;
  let mock: ReturnType<typeof createMockAudio>;
  let AudioSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mock = createMockAudio();
    AudioSpy = vi
      .spyOn(window, "Audio")
      .mockImplementation(() => mock.audio as any);
    engine = new AudioEngine();
  });

  it("creates an Audio element in constructor", () => {
    expect(AudioSpy).toHaveBeenCalledTimes(1);
  });

  it("registers event listeners in constructor", () => {
    expect(mock.audio.addEventListener).toHaveBeenCalledWith(
      "timeupdate",
      expect.any(Function),
    );
    expect(mock.audio.addEventListener).toHaveBeenCalledWith(
      "ended",
      expect.any(Function),
    );
    expect(mock.audio.addEventListener).toHaveBeenCalledWith(
      "loadedmetadata",
      expect.any(Function),
    );
  });

  it("load sets audio src and calls audio.load", () => {
    engine.load("https://example.com/stream");
    expect(mock.audio.src).toBe("https://example.com/stream");
    expect(mock.audio.load).toHaveBeenCalledTimes(1);
  });

  it("play calls audio.play", () => {
    engine.play();
    expect(mock.audio.play).toHaveBeenCalledTimes(1);
  });

  it("pause calls audio.pause", () => {
    engine.pause();
    expect(mock.audio.pause).toHaveBeenCalledTimes(1);
  });

  it("toggle plays when paused", () => {
    mock.audio.paused = true;
    engine.toggle();
    expect(mock.audio.play).toHaveBeenCalledTimes(1);
  });

  it("toggle pauses when playing", () => {
    mock.audio.paused = false;
    engine.toggle();
    expect(mock.audio.pause).toHaveBeenCalledTimes(1);
  });

  it("seek sets currentTime", () => {
    engine.seek(42.5);
    expect(mock.audio.currentTime).toBe(42.5);
  });

  it("setVolume clamps to 0-1 and sets audio.volume", () => {
    engine.setVolume(0.5);
    expect(mock.audio.volume).toBe(0.5);

    engine.setVolume(-0.5);
    expect(mock.audio.volume).toBe(0);

    engine.setVolume(1.5);
    expect(mock.audio.volume).toBe(1);
  });

  it("getCurrentTime returns audio.currentTime", () => {
    mock.audio.currentTime = 30;
    expect(engine.getCurrentTime()).toBe(30);
  });

  it("getDuration returns audio.duration", () => {
    mock.audio.duration = 200;
    expect(engine.getDuration()).toBe(200);
  });

  it("isPaused returns audio.paused", () => {
    mock.audio.paused = true;
    expect(engine.isPaused()).toBe(true);
    mock.audio.paused = false;
    expect(engine.isPaused()).toBe(false);
  });

  it("calls onTimeUpdate callback on timeupdate event", () => {
    const cb = vi.fn();
    engine.onTimeUpdate(cb);
    mock.audio.currentTime = 15;
    mock.audio.duration = 120;
    mock.emit("timeupdate");
    expect(cb).toHaveBeenCalledWith(15, 120);
  });

  it("calls onEnded callback on ended event", () => {
    const cb = vi.fn();
    engine.onEnded(cb);
    mock.emit("ended");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("calls onLoaded callback on loadedmetadata event", () => {
    const cb = vi.fn();
    engine.onLoaded(cb);
    mock.audio.duration = 180;
    mock.emit("loadedmetadata");
    expect(cb).toHaveBeenCalledWith(180);
  });

  it("destroy pauses, clears src, and clears callbacks", () => {
    const timeCb = vi.fn();
    const endedCb = vi.fn();
    const loadedCb = vi.fn();
    engine.onTimeUpdate(timeCb);
    engine.onEnded(endedCb);
    engine.onLoaded(loadedCb);
    engine.load("https://example.com/music.mp3");

    engine.destroy();

    expect(mock.audio.pause).toHaveBeenCalledTimes(1);
    expect(mock.audio.src).toBe("");
  });

  it("events do not fire after destroy (callbacks cleared)", () => {
    const timeCb = vi.fn();
    engine.onTimeUpdate(timeCb);
    engine.destroy();
    mock.emit("timeupdate");
    expect(timeCb).not.toHaveBeenCalled();
  });
});

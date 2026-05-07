import { describe, it, expect, beforeEach, vi } from "vitest";
import * as NativeMedia from "$lib/player/NativeMedia";

function mockBridge(methods?: Record<string, ReturnType<typeof vi.fn>>) {
  const bridge = {
    setPlaying: vi.fn(),
    setPaused: vi.fn(),
    hide: vi.fn(),
    ...methods,
  };
  Object.defineProperty(window, "NativeMedia", {
    value: bridge,
    writable: true,
    configurable: true,
  });
  return bridge;
}

function clearBridge() {
  delete (window as any).NativeMedia;
}

describe("NativeMedia", () => {
  beforeEach(() => {
    clearBridge();
    vi.restoreAllMocks();
  });

  describe("isNativeAvailable", () => {
    it("returns false when window.NativeMedia is absent", () => {
      expect(NativeMedia.isNativeAvailable()).toBe(false);
    });

    it("returns true when window.NativeMedia exists", () => {
      mockBridge();
      expect(NativeMedia.isNativeAvailable()).toBe(true);
    });
  });

  describe("showPlaying", () => {
    it("calls bridge.setPlaying with title and artist", () => {
      const bridge = mockBridge();
      NativeMedia.showPlaying("Song", "Artist");
      expect(bridge.setPlaying).toHaveBeenCalledWith("Song", "Artist");
    });

    it("passes artwork URL when provided", () => {
      const bridge = mockBridge();
      NativeMedia.showPlaying("Song", "Artist", "https://img.example/cover.jpg");
      expect(bridge.setPlaying).toHaveBeenCalledWith(
        "Song",
        "Artist",
        "https://img.example/cover.jpg",
      );
    });

    it("does not throw when bridge is absent", () => {
      expect(() => NativeMedia.showPlaying("Song", "Artist")).not.toThrow();
    });
  });

  describe("showPaused", () => {
    it("calls bridge.setPaused with title and artist", () => {
      const bridge = mockBridge();
      NativeMedia.showPaused("Song", "Artist");
      expect(bridge.setPaused).toHaveBeenCalledWith("Song", "Artist");
    });

    it("passes artwork URL when provided", () => {
      const bridge = mockBridge();
      NativeMedia.showPaused("Song", "Artist", "https://img.example/cover.jpg");
      expect(bridge.setPaused).toHaveBeenCalledWith(
        "Song",
        "Artist",
        "https://img.example/cover.jpg",
      );
    });
  });

  describe("hide", () => {
    it("calls bridge.hide", () => {
      const bridge = mockBridge();
      NativeMedia.hide();
      expect(bridge.hide).toHaveBeenCalled();
    });
  });

  describe("listen", () => {
    it("calls onPlay when native-mediasession event fires with 'play'", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "play" }),
      );
      expect(callbacks.onPlay).toHaveBeenCalledTimes(1);
    });

    it("calls onPause when event fires with 'pause'", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "pause" }),
      );
      expect(callbacks.onPause).toHaveBeenCalledTimes(1);
    });

    it("calls onNext when event fires with 'next'", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "next" }),
      );
      expect(callbacks.onNext).toHaveBeenCalledTimes(1);
    });

    it("calls onPrev when event fires with 'prev'", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "prev" }),
      );
      expect(callbacks.onPrev).toHaveBeenCalledTimes(1);
    });

    it("calls onStop when event fires with 'stop'", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "stop" }),
      );
      expect(callbacks.onStop).toHaveBeenCalledTimes(1);
    });

    it("returns a cleanup function that removes the listener", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      const cleanup = NativeMedia.listen(callbacks);

      cleanup();
      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "play" }),
      );
      expect(callbacks.onPlay).not.toHaveBeenCalled();
    });

    it("ignores unknown action types", () => {
      const callbacks = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onNext: vi.fn(),
        onPrev: vi.fn(),
        onStop: vi.fn(),
      };
      NativeMedia.listen(callbacks);

      document.dispatchEvent(
        new CustomEvent("native-mediasession", { detail: "unknown" }),
      );
      expect(callbacks.onPlay).not.toHaveBeenCalled();
      expect(callbacks.onPause).not.toHaveBeenCalled();
    });
  });
});

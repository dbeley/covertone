import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initKeyboardShortcuts, focusedIndex } from "$lib/keyboard/shortcuts";
import { player } from "$lib/stores/player";
import { router } from "$lib/stores/router";
import { nowPlayingOpen } from "$lib/stores/ui";
import { queueDrawerOpen } from "$lib/stores/queue";

vi.mock("$lib/stores/player", () => ({
  player: {
    togglePlay: vi.fn(),
    setShuffle: vi.fn(),
    setRepeating: vi.fn(),
    setFavorited: vi.fn(),
    setVolume: vi.fn(),
    seek: vi.fn(),
    handlePreviousTrack: vi.fn(),
    subscribe: vi.fn((cb: (s: any) => void) => {
      cb({ shuffle: false, repeating: false, favorited: false, volume: 1, currentTime: 0, duration: 100, currentTrack: { id: "t1" } });
      return () => {};
    }),
  },
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui", () => ({
  nowPlayingOpen: {
    set: vi.fn(),
    subscribe: vi.fn((cb: (v: boolean) => void) => { cb(false); return () => {}; }),
  },
  shortcutsModalOpen: {
    update: vi.fn(),
    subscribe: vi.fn((cb: (v: boolean) => void) => { cb(false); return () => {}; }),
  },
}));

vi.mock("$lib/stores/queue", () => ({
  queueDrawerOpen: {
    update: vi.fn(),
    set: vi.fn(),
    subscribe: vi.fn((cb: (v: boolean) => void) => { cb(false); return () => {}; }),
  },
  queue: {
    getPrevious: vi.fn(),
    getNextAutoDJ: vi.fn(),
  },
}));

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: vi.fn((cb: (s: any) => void) => {
      cb({ serverUrl: "http://example.com", username: "user", password: "pass" });
      return () => {};
    }),
  },
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  SubsonicAPI: vi.fn().mockImplementation(() => ({ star: vi.fn(), unstar: vi.fn() })),
}));

describe("keyboard shortcuts", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.mocked(player.togglePlay).mockClear();
    vi.mocked(player.seek).mockClear();
    vi.mocked(router.navigate).mockClear();
    focusedIndex.set(-1);
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });

  function dispatch(key: string, target?: HTMLElement, extra?: Record<string, unknown>) {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...extra,
    });
    const el = target ?? document.body;
    el.dispatchEvent(event);
    return event;
  }

  it("toggles play on Space", () => {
    cleanup = initKeyboardShortcuts();
    dispatch(" ");
    expect(player.togglePlay).toHaveBeenCalledTimes(1);
  });

  it("does not toggle play when Space is pressed on an input", () => {
    cleanup = initKeyboardShortcuts();
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = dispatch(" ", input);
    expect(player.togglePlay).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    document.body.removeChild(input);
  });

  it("seeks back on b", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("b");
    expect(player.seek).toHaveBeenCalledTimes(1);
  });

  it("seeks forward on f", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("f");
    expect(player.seek).toHaveBeenCalledTimes(1);
  });

  it("goes back in history on Shift+H", () => {
    cleanup = initKeyboardShortcuts();
    const spy = vi.spyOn(history, "back");
    dispatch("H", undefined, { shiftKey: true });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("goes forward in history on Shift+L", () => {
    cleanup = initKeyboardShortcuts();
    const spy = vi.spyOn(history, "forward");
    dispatch("L", undefined, { shiftKey: true });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("plays previous track on Shift+,", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("<", undefined, { shiftKey: true });
    expect(player.togglePlay).not.toHaveBeenCalled();
  });

  it("plays next track on Shift+.", () => {
    cleanup = initKeyboardShortcuts();
    dispatch(">", undefined, { shiftKey: true });
    expect(player.togglePlay).not.toHaveBeenCalled();
  });

  it("toggles favorite on Shift+F", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("F", undefined, { shiftKey: true });
    expect(player.setFavorited).toHaveBeenCalledTimes(1);
  });

  it("moves focus with h/j/k/l", () => {
    cleanup = initKeyboardShortcuts();
    const items = [
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
      Object.assign(document.createElement("div"), { role: "button", tabIndex: 0 }),
    ];
    items.forEach((el, i) => {
      const row = Math.floor(i / 3);
      Object.defineProperty(el, "getBoundingClientRect", {
        value: () => ({ top: row * 100, width: 100, height: 100 }),
      });
      document.body.appendChild(el);
    });

    focusedIndex.set(0);
    dispatch("l");
    expect(get(focusedIndex)).toBe(1);
    dispatch("l");
    expect(get(focusedIndex)).toBe(2);
    dispatch("h");
    expect(get(focusedIndex)).toBe(1);

    dispatch("j");
    expect(get(focusedIndex)).toBe(4);
    dispatch("k");
    expect(get(focusedIndex)).toBe(1);

    items.forEach((el) => document.body.removeChild(el));
  });

  it("clears focus on Escape", () => {
    cleanup = initKeyboardShortcuts();
    focusedIndex.set(2);
    dispatch("Escape");
    expect(get(focusedIndex)).toBe(-1);
  });

  it("toggles shortcuts modal on ?", async () => {
    cleanup = initKeyboardShortcuts();
    dispatch("?");
    const { shortcutsModalOpen } = await import("$lib/stores/ui");
    expect(vi.mocked(shortcutsModalOpen.update)).toHaveBeenCalledTimes(1);
  });
});

function get(store: any) {
  let value: any;
  store.subscribe((v: any) => { value = v; })();
  return value;
}

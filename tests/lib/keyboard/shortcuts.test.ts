import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initKeyboardShortcuts } from "$lib/keyboard/shortcuts";
import { player } from "$lib/stores/player";
import { router } from "$lib/stores/router";

vi.mock("$lib/stores/player", () => ({
  player: {
    togglePlay: vi.fn(),
  },
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

describe("keyboard shortcuts", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.mocked(player.togglePlay).mockClear();
    vi.mocked(router.navigate).mockClear();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });

  function dispatch(code: string, target?: HTMLElement) {
    const event = new KeyboardEvent("keydown", {
      code,
      bubbles: true,
      cancelable: true,
    });
    const el = target ?? document.body;
    el.dispatchEvent(event);
    return event;
  }

  it("toggles play on Space", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("Space");
    expect(player.togglePlay).toHaveBeenCalledTimes(1);
  });

  it("does not toggle play when Space is pressed on an input", () => {
    cleanup = initKeyboardShortcuts();
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = dispatch("Space", input);
    expect(player.togglePlay).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    document.body.removeChild(input);
  });

  it("does not toggle play when Space is pressed on a textarea", () => {
    cleanup = initKeyboardShortcuts();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    dispatch("Space", textarea);
    expect(player.togglePlay).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("does not toggle play when Space is pressed on a contenteditable", () => {
    cleanup = initKeyboardShortcuts();
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    dispatch("Space", div);
    expect(player.togglePlay).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("ignores unrelated keys", () => {
    cleanup = initKeyboardShortcuts();
    dispatch("KeyA");
    dispatch("Enter");
    dispatch("Escape");
    expect(player.togglePlay).not.toHaveBeenCalled();
  });

  it("prevents default on Space", () => {
    cleanup = initKeyboardShortcuts();
    const event = dispatch("Space");
    expect(event.defaultPrevented).toBe(true);
  });

  it("navigates to search on Ctrl+K", () => {
    cleanup = initKeyboardShortcuts();
    const event = new KeyboardEvent("keydown", {
      code: "KeyK",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(router.navigate).toHaveBeenCalledWith("/search");
    expect(event.defaultPrevented).toBe(true);
  });

  it("navigates to search on Meta+K", () => {
    cleanup = initKeyboardShortcuts();
    const event = new KeyboardEvent("keydown", {
      code: "KeyK",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(router.navigate).toHaveBeenCalledWith("/search");
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not navigate to search on K without modifier", () => {
    cleanup = initKeyboardShortcuts();
    const event = new KeyboardEvent("keydown", {
      code: "KeyK",
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("does not navigate to search when Ctrl+K is pressed in an input", () => {
    cleanup = initKeyboardShortcuts();
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", {
      code: "KeyK",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    expect(router.navigate).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});

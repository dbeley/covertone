import { describe, it, expect, vi } from "vitest";
import { handleNativeBackButton } from "$lib/navigation/nativeBack";

describe("handleNativeBackButton", () => {
  it("closes queue drawer before navigating back", () => {
    const closeQueueDrawer = vi.fn();
    const goBack = vi.fn();
    const exitApp = vi.fn();

    handleNativeBackButton({
      canGoBack: true,
      isQueueDrawerOpen: true,
      isNowPlayingOpen: false,
      closeQueueDrawer,
      closeNowPlaying: vi.fn(),
      goBack,
      exitApp,
    });

    expect(closeQueueDrawer).toHaveBeenCalledTimes(1);
    expect(goBack).not.toHaveBeenCalled();
    expect(exitApp).not.toHaveBeenCalled();
  });

  it("navigates back when queue drawer is closed and history is available", () => {
    const closeQueueDrawer = vi.fn();
    const goBack = vi.fn();
    const exitApp = vi.fn();

    handleNativeBackButton({
      canGoBack: true,
      isQueueDrawerOpen: false,
      isNowPlayingOpen: false,
      closeQueueDrawer,
      closeNowPlaying: vi.fn(),
      goBack,
      exitApp,
    });

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(closeQueueDrawer).not.toHaveBeenCalled();
    expect(exitApp).not.toHaveBeenCalled();
  });

  it("exits app when queue drawer is closed and history is unavailable", () => {
    const closeQueueDrawer = vi.fn();
    const goBack = vi.fn();
    const exitApp = vi.fn();

    handleNativeBackButton({
      canGoBack: false,
      isQueueDrawerOpen: false,
      isNowPlayingOpen: false,
      closeQueueDrawer,
      closeNowPlaying: vi.fn(),
      goBack,
      exitApp,
    });

    expect(exitApp).toHaveBeenCalledTimes(1);
    expect(closeQueueDrawer).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });

  it("closes now playing before navigating back", () => {
    const closeQueueDrawer = vi.fn();
    const closeNowPlaying = vi.fn();
    const goBack = vi.fn();
    const exitApp = vi.fn();

    handleNativeBackButton({
      canGoBack: true,
      isQueueDrawerOpen: false,
      isNowPlayingOpen: true,
      closeQueueDrawer,
      closeNowPlaying,
      goBack,
      exitApp,
    });

    expect(closeNowPlaying).toHaveBeenCalledTimes(1);
    expect(closeQueueDrawer).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
    expect(exitApp).not.toHaveBeenCalled();
  });
});

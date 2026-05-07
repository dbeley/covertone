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
      closeQueueDrawer,
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
      closeQueueDrawer,
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
      closeQueueDrawer,
      goBack,
      exitApp,
    });

    expect(exitApp).toHaveBeenCalledTimes(1);
    expect(closeQueueDrawer).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });
});

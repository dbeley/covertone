/**
 * Fullscreen utility for jukebox mode.
 *
 * On native (Capacitor): uses @capacitor/status-bar to hide the OS status bar.
 * On web: uses the Fullscreen API with a CSS class fallback.
 */

let _isFullscreen = false;

function isCapacitorNative(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return !!(
      window as typeof window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function getNavigationBar(): { hide: () => void; show: () => void } | null {
  if (typeof window === "undefined") return null;
  const nb = (window as unknown as Record<string, unknown>).NavigationBar;
  if (
    nb &&
    typeof nb === "object" &&
    "hide" in nb &&
    "show" in nb &&
    typeof (nb as { hide: () => void }).hide === "function" &&
    typeof (nb as { show: () => void }).show === "function"
  ) {
    return nb as { hide: () => void; show: () => void };
  }
  return null;
}

export async function enterFullscreen(): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.hide();
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.warn("Failed to hide status bar via Capacitor:", e);
    }

    // Hide Android navigation bar (gesture hint) via native bridge
    try {
      getNavigationBar()?.hide();
    } catch {
      // bridge not available
    }
  }

  // Web Fullscreen API as secondary strategy
  if (!isCapacitorNative()) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen API not available or denied — CSS class fallback still works
    }
  }

  document.documentElement.classList.add("is-fullscreen");
  _isFullscreen = true;
}

export async function exitFullscreen(): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.show();
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn("Failed to show status bar via Capacitor:", e);
    }

    // Restore Android navigation bar
    try {
      getNavigationBar()?.show();
    } catch {
      // bridge not available
    }
  }

  if (!isCapacitorNative()) {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }

  document.documentElement.classList.remove("is-fullscreen");
  _isFullscreen = false;
}

export async function toggleFullscreen(): Promise<void> {
  if (_isFullscreen) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}

export function getIsFullscreen(): boolean {
  return _isFullscreen;
}

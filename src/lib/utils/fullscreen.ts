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

export async function enterFullscreen(): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.hide();
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.warn("Failed to hide status bar via Capacitor:", e);
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

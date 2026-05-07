export interface NativeBackButtonContext {
  canGoBack: boolean;
  isQueueDrawerOpen: boolean;
  isNowPlayingOpen: boolean;
  closeQueueDrawer: () => void;
  closeNowPlaying: () => void;
  goBack: () => void;
  exitApp: () => void;
}

export function handleNativeBackButton({
  canGoBack,
  isQueueDrawerOpen,
  isNowPlayingOpen,
  closeQueueDrawer,
  closeNowPlaying,
  goBack,
  exitApp,
}: NativeBackButtonContext): void {
  if (isQueueDrawerOpen) {
    closeQueueDrawer();
    return;
  }

  if (isNowPlayingOpen) {
    closeNowPlaying();
    return;
  }

  if (canGoBack) {
    goBack();
    return;
  }

  exitApp();
}

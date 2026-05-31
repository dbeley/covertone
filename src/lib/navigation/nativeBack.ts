export interface NativeBackButtonContext {
  canGoBack: boolean;
  isQueueDrawerOpen: boolean;
  isNowPlayingOpen: boolean;
  isDiscoveryDrawerOpen: boolean;
  isShortcutsModalOpen: boolean;
  closeQueueDrawer: () => void;
  closeNowPlaying: () => void;
  closeDiscoveryDrawer: () => void;
  closeShortcutsModal: () => void;
  goBack: () => void;
  exitApp: () => void;
}

export function handleNativeBackButton({
  canGoBack,
  isQueueDrawerOpen,
  isNowPlayingOpen,
  isDiscoveryDrawerOpen,
  isShortcutsModalOpen,
  closeQueueDrawer,
  closeNowPlaying,
  closeDiscoveryDrawer,
  closeShortcutsModal,
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

  if (isDiscoveryDrawerOpen) {
    closeDiscoveryDrawer();
    return;
  }

  if (isShortcutsModalOpen) {
    closeShortcutsModal();
    return;
  }

  if (canGoBack) {
    goBack();
    return;
  }

  exitApp();
}

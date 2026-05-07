export interface NativeBackButtonContext {
  canGoBack: boolean;
  isQueueDrawerOpen: boolean;
  closeQueueDrawer: () => void;
  goBack: () => void;
  exitApp: () => void;
}

export function handleNativeBackButton({
  canGoBack,
  isQueueDrawerOpen,
  closeQueueDrawer,
  goBack,
  exitApp,
}: NativeBackButtonContext): void {
  if (isQueueDrawerOpen) {
    closeQueueDrawer();
    return;
  }

  if (canGoBack) {
    goBack();
    return;
  }

  exitApp();
}

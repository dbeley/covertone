<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import { nowPlayingOpen, shortcutsModalOpen } from '$lib/stores/ui';
  import { discoveryDrawerOpen } from '$lib/stores/discovery';
  import { getStreamBaseUrl } from '$lib/api/SubsonicAPI';
  import { createApi } from '$lib/api/createApi';
  import { AutoDJ } from '$lib/player/AutoDJ';
  import { isNativeAvailable } from '$lib/player/NativeMedia';
  import { initKeyboardShortcuts } from '$lib/keyboard/shortcuts';
  import { handleNativeBackButton } from '$lib/navigation/nativeBack';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import AppShell from '$lib/components/AppShell.svelte';

  onMount(() => {
    router.reset();

    const removeKeyboardShortcuts = initKeyboardShortcuts();

    let removeBackListener: (() => void) | undefined;

    if (isNativeAvailable()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', ({ canGoBack }) => {
          handleNativeBackButton({
            canGoBack,
            isQueueDrawerOpen: get(queueDrawerOpen),
            isNowPlayingOpen: get(nowPlayingOpen),
            isDiscoveryDrawerOpen: get(discoveryDrawerOpen),
            isShortcutsModalOpen: get(shortcutsModalOpen),
            closeQueueDrawer: () => queueDrawerOpen.set(false),
            closeNowPlaying: () => nowPlayingOpen.set(false),
            closeDiscoveryDrawer: () => discoveryDrawerOpen.set(false),
            closeShortcutsModal: () => shortcutsModalOpen.set(false),
            goBack: () => window.history.back(),
            exitApp: () => App.exitApp(),
          });
        }).then((handle) => {
          removeBackListener = () => handle.remove();
        });
      }).catch(() => {});
    }

    return () => {
      removeKeyboardShortcuts();
      if (removeBackListener) removeBackListener();
    };
  });

  $effect(() => {
    const theme = $settings.appliedTheme;
    const html = document.documentElement;
    html.classList.remove('dark', 'amoled', 'light');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'amoled') {
      html.classList.add('dark', 'amoled');
    } else {
      html.classList.add('light');
    }
  });

  let configServerUrl = $derived($settings.serverUrl);
  let configUsername = $derived($settings.username);
  let configPassword = $derived($settings.password);
  let configAutoDJ = $derived($settings.autoDJ);
  let configIsConfigured = $derived($settings.isConfigured);

  $effect(() => {
    const srv = configServerUrl;
    const usr = configUsername;
    const pwd = configPassword;
    const autoDJEnabled = configAutoDJ;
    if (!configIsConfigured) return;

    const baseUrl = getStreamBaseUrl({ server: srv, username: usr, password: pwd });
    player.setStreamBase(baseUrl);
    player.setApiConfig({ server: srv, username: usr, password: pwd });

    const api = createApi({ server: srv, username: usr, password: pwd });
    queue.setAutoDJInstance(new AutoDJ(api));
    queue.setAutoDJ(autoDJEnabled);
  });
</script>

<ErrorBoundary>
  <AppShell />
</ErrorBoundary>

<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import { nowPlayingOpen } from '$lib/stores/ui';
  import { getStreamBaseUrl } from '$lib/api/SubsonicAPI';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import { AutoDJ } from '$lib/player/AutoDJ';
  import { isNativeAvailable } from '$lib/player/NativeMedia';
  import { initKeyboardShortcuts } from '$lib/keyboard/shortcuts';
  import { handleNativeBackButton } from '$lib/navigation/nativeBack';
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
            closeQueueDrawer: () => queueDrawerOpen.set(false),
            closeNowPlaying: () => nowPlayingOpen.set(false),
            goBack: () => window.history.back(),
            exitApp: () => App.exitApp(),
          });
        }).then((handle) => {
          removeBackListener = () => handle.remove();
        });
      });
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

  $effect(() => {
    if ($settings.isConfigured) {
      const baseUrl = getStreamBaseUrl({
        server: $settings.serverUrl,
        username: $settings.username,
        password: $settings.password,
      });
      player.setStreamBase(baseUrl);
      player.setApiConfig({
        server: $settings.serverUrl,
        username: $settings.username,
        password: $settings.password,
      });

      const api = new SubsonicAPI({
        server: $settings.serverUrl,
        username: $settings.username,
        password: $settings.password,
      });
      queue.setAutoDJInstance(new AutoDJ(api));
    }
  });
</script>

<AppShell />

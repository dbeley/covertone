<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { player } from '$lib/stores/player';
  import { getStreamBaseUrl } from '$lib/api/SubsonicAPI';
  import AppShell from '$lib/components/AppShell.svelte';

  onMount(() => { router.reset(); });

  $effect(() => {
    const theme = $settings.appliedTheme;
    const html = document.documentElement;
    html.classList.remove('dark', 'amoled');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'amoled') {
      html.classList.add('dark', 'amoled');
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
    }
  });
</script>

<AppShell />

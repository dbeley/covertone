<script lang="ts">
  import { onMount } from 'svelte';
  import { library } from '$lib/stores/library';
  import { settings } from '$lib/stores/settings';
  import { router } from '$lib/stores/router';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import AlbumGrid from '$lib/components/AlbumGrid.svelte';
  import type { Album } from '$lib/api/types';

  let configured = $derived($settings.isConfigured);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let libInitialized = $derived($library.initialized);

  let recentAlbums = $state<Album[]>([]);
  let newestAlbums = $state<Album[]>([]);
  let randomAlbums = $state<Album[]>([]);
  let frequentAlbums = $state<Album[]>([]);
  let loading = $state(true);

  async function fetchSection(api: SubsonicAPI, type: string): Promise<Album[]> {
    try {
      const result = await api.getAlbumList({ type, size: 12 });
      return result.albumList2.album;
    } catch {
      return [];
    }
  }

  onMount(async () => {
    if (!configured) { loading = false; return; }

    if (!libInitialized) {
      library.init({ server: serverUrl, username, password });
    }

    const api = new SubsonicAPI({ server: serverUrl, username, password });

    const [recent, newest, random, frequent] = await Promise.all([
      fetchSection(api, 'recent'),
      fetchSection(api, 'newest'),
      fetchSection(api, 'random'),
      fetchSection(api, 'frequent'),
    ]);

    recentAlbums = recent;
    newestAlbums = newest;
    randomAlbums = random;
    frequentAlbums = frequent;
    loading = false;
  });
</script>

<div class="p-6">
  {#if !configured}
    <div class="text-center py-20">
      <h1 class="text-3xl font-bold mb-4 tracking-tight">Welcome to Covertone</h1>
      <p class="text-text-dim mb-8">Connect to your Subsonic server to get started</p>
      <button
        class="px-6 py-3 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
        onclick={() => router.navigate('/settings')}
      >
        Configure Server
      </button>
    </div>
  {:else if loading}
    <p class="text-text-dim">Loading...</p>
  {:else}
    {#if recentAlbums.length > 0}
      <section class="mb-10">
        <h2 class="text-xl font-bold mb-4 tracking-tight">Recently Played</h2>
        <AlbumGrid albums={recentAlbums} {serverUrl} {username} {password} />
      </section>
    {/if}
    {#if newestAlbums.length > 0}
      <section class="mb-10">
        <h2 class="text-xl font-bold mb-4 tracking-tight">Recently Added</h2>
        <AlbumGrid albums={newestAlbums} {serverUrl} {username} {password} />
      </section>
    {/if}
    {#if randomAlbums.length > 0}
      <section class="mb-10">
        <h2 class="text-xl font-bold mb-4 tracking-tight">Random Albums</h2>
        <AlbumGrid albums={randomAlbums} {serverUrl} {username} {password} />
      </section>
    {/if}
    {#if frequentAlbums.length > 0}
      <section class="mb-10">
        <h2 class="text-xl font-bold mb-4 tracking-tight">Most Played</h2>
        <AlbumGrid albums={frequentAlbums} {serverUrl} {username} {password} />
      </section>
    {/if}
    {#if recentAlbums.length === 0 && newestAlbums.length === 0 && randomAlbums.length === 0 && frequentAlbums.length === 0}
      <p class="text-text-dim text-center py-16">No albums found</p>
    {/if}
  {/if}
</div>

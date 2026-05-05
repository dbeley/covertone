<script lang="ts">
  import { onMount } from 'svelte';
  import { library } from '$lib/stores/library';
  import { settings } from '$lib/stores/settings';
  import AlbumGrid from '$lib/components/AlbumGrid.svelte';
  import type { AlbumListType } from '../stores/library';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);
  let libInitialized = $derived($library.initialized);

  let albums = $derived($library.albums);
  let loading = $derived($library.loading);
  let hasMore = $derived($library.hasMore);

  let activeTab = $state<AlbumListType>('random');
  let sentinelEl = $state<HTMLDivElement | null>(null);

  const tabs: { label: string; type: AlbumListType }[] = [
    { label: 'Random', type: 'random' },
    { label: 'A-Z', type: 'alphabeticalByName' },
    { label: 'Newest', type: 'newest' },
    { label: 'Most Played', type: 'frequent' },
  ];

  function switchTab(type: AlbumListType) {
    activeTab = type;
    library.fetchAlbums({ type, offset: 0 });
  }

  function loadMore() {
    if (loading || !hasMore) return;
    library.fetchAlbums({ type: activeTab, offset: albums.length });
  }

  onMount(() => {
    if (!configured) return;
    if (!libInitialized) {
      library.init({ server: serverUrl, username, password });
    }
    library.fetchAlbums({ type: 'random', offset: 0 });

    if (!sentinelEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelEl);

    return () => observer.disconnect();
  });
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-6 tracking-tight">Albums</h2>

  <div class="flex gap-2 mb-6">
    {#each tabs as tab (tab.type)}
      <button
        class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border border-border
               {activeTab === tab.type ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20' : 'text-text-dim hover:text-text hover:border-accent/30'}"
        onclick={() => switchTab(tab.type)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if albums.length > 0}
    <AlbumGrid {albums} {serverUrl} {username} {password} />
  {:else if !loading}
    <p class="text-text-dim">No albums found</p>
  {/if}

  {#if loading && albums.length === 0}
    <p class="text-text-dim">Loading...</p>
  {/if}

  <div bind:this={sentinelEl} class="h-8 mt-4 flex items-center justify-center">
    {#if loading && albums.length > 0}
      <div class="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    {/if}
  </div>
</div>

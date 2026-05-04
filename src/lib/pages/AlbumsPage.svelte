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

  let albums = $derived($library.albums);
  let loading = $derived($library.loading);

  let activeTab = $state<string>('alphabeticalByName');

  const tabs: { label: string; type: AlbumListType }[] = [
    { label: 'All', type: 'alphabeticalByName' },
    { label: 'Newest', type: 'newest' },
    { label: 'Most Played', type: 'frequent' },
    { label: 'Random', type: 'random' },
  ];

  function switchTab(type: AlbumListType) {
    activeTab = type;
    library.fetchAlbums({ type, offset: 0 });
  }

  onMount(() => {
    if (configured) {
      library.fetchAlbums({ type: 'alphabeticalByName', offset: 0 });
    }
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

  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if albums.length > 0}
    <AlbumGrid {albums} {serverUrl} {username} {password} />
  {:else}
    <p class="text-text-dim">No albums found</p>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { library } from '$lib/stores/library';
  import { settings } from '$lib/stores/settings';
  import { router } from '$lib/stores/router';
  import type { Artist } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let configured = $derived($settings.isConfigured);
  let libInitialized = $derived($library.initialized);

  let artists = $derived($library.artists);
  let loading = $derived($library.loading);

  function artistCoverUrl(artist: Artist): string {
    if (!artist.coverArt) return '';
    return `${serverUrl.replace(/\/$/, '')}/rest/getCoverArt?id=${artist.coverArt}&size=200&u=${username}`;
  }

  onMount(() => {
    if (!configured) return;
    if (!libInitialized) {
      library.init({ server: serverUrl, username, password: $settings.password });
    }
    library.fetchArtists();
  });
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-4">Artists</h2>

  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if artists.length > 0}
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      {#each artists as artist}
        <div
          class="cursor-pointer group flex flex-col items-center gap-2 text-center"
          onclick={() => router.navigate(`artist/${artist.id}`)}
          role="button"
          tabindex="0"
        >
          <div class="w-24 h-24 rounded-full overflow-hidden">
            <img
              src={artistCoverUrl(artist)}
              alt={artist.name}
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <p class="text-sm font-medium truncate w-24">{artist.name}</p>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-text-dim">No artists found</p>
  {/if}
</div>

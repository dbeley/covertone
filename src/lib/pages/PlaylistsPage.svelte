<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import type { Playlist } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);

  let playlists = $state<Playlist[]>([]);
  let loading = $state(true);
  let error = $state('');

  function coverUrl(playlist: Playlist): string {
    if (!playlist.coverArt) return '';
    return getCoverArtUrl({ server: serverUrl, username, password, id: playlist.coverArt, size: 256 });
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  onMount(async () => {
    if (!configured) { loading = false; return; }

    try {
      const api = new SubsonicAPI({ server: serverUrl, username, password });
      const result = await api.getPlaylists();
      playlists = result.playlists.playlist ?? [];
    } catch (e) {
      error = (e as Error).message;
    }

    loading = false;
  });
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-6 tracking-tight">Playlists</h2>

  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if playlists.length === 0}
    <p class="text-text-dim">No playlists found</p>
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
      {#each playlists as playlist (playlist.id)}
        <div
          class="cursor-pointer group rounded-xl border border-border bg-surface hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 overflow-hidden active:scale-[0.98]"
          onclick={() => router.navigate(`playlist/${playlist.id}`)}
          role="button"
          tabindex="0"
        >
          <div class="aspect-square overflow-hidden bg-surface">
            {#if playlist.coverArt}
              <LazyImage
                src={coverUrl(playlist)}
                alt={playlist.name}
                loading="lazy"
                decoding="async"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-text-dim">
                <svg viewBox="0 0 24 24" class="w-12 h-12 opacity-40">
                  <path d="M3 22v-20l18 10-18 10z" fill="currentColor"/>
                </svg>
              </div>
            {/if}
          </div>
          <div class="p-2.5">
            <p class="text-sm font-medium truncate text-text">{playlist.name}</p>
            <p class="text-xs text-text-dim truncate mt-0.5">{playlist.songCount} tracks · {formatDuration(playlist.duration)}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

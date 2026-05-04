<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import TrackList from '$lib/components/TrackList.svelte';
  import type { Song, Album } from '$lib/api/types';

  let albumId = $derived($router.params.id);

  let album = $state<Album | null>(null);
  let songs = $state<Song[]>([]);
  let loading = $state(true);
  let error = $state('');

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let coverArtUrl = $derived(
    album?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: album.coverArt, size: 192 })
      : ''
  );

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onMount(async () => {
    if (!$settings.isConfigured) { loading = false; return; }
    try {
      const api = new SubsonicAPI({ server: $settings.serverUrl, username: $settings.username, password: $settings.password });
      const data = await api.getAlbum({ id: albumId });
      songs = data.directory.child;
    } catch (e) {
      error = (e as Error).message;
    }
    loading = false;
  });
</script>

<div class="p-6">
  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if songs.length > 0}
    <div class="flex items-start gap-6 mb-8">
      <img src={coverArtUrl} alt="" class="w-48 h-48 rounded-xl object-cover shadow-lg" />
      <div class="flex flex-col justify-center gap-2">
        <p class="text-xs text-text-dim uppercase tracking-wide">Album</p>
        <h1 class="text-2xl font-bold">{songs[0].album}</h1>
        <p class="text-sm text-text-dim">
          {songs[0].artist}
          {#if songs[0].year} · {songs[0].year}{/if}
          {#if songs[0].genre} · {songs[0].genre}{/if}
          · {songs.length} tracks
          · {formatDuration(songs.reduce((acc, s) => acc + s.duration, 0))}
        </p>
        <button
          class="mt-2 px-4 py-2 bg-accent text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity self-start"
          onclick={() => { queue.replaceAll(songs); player.playTrack(songs[0]); }}
        >
          Play All
        </button>
      </div>
    </div>
    <TrackList {songs} />
  {:else}
    <p class="text-text-dim">No tracks found</p>
  {/if}
</div>

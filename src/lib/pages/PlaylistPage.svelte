<script lang="ts">
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import type { Song, Playlist } from '$lib/api/types';

  let playlistId = $derived($router.extractParams('/playlist/:id').id);

  let playlist = $state<Playlist | null>(null);
  let songs = $state<Song[]>([]);
  let loading = $state(true);
  let error = $state('');

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let coverArtUrl = $derived(
    playlist?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: playlist.coverArt, size: 192 })
      : ''
  );

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
    return `${m}:${s}`;
  }

  $effect(() => {
    if (!$settings.isConfigured) { loading = false; return; }

    const id = playlistId;
    const srv = serverUrl;
    const usr = username;
    const pwd = password;

    loading = true;
    error = '';
    playlist = null;
    songs = [];

    let cancelled = false;

    (async () => {
      try {
        const api = new SubsonicAPI({ server: srv, username: usr, password: pwd });
        const data = await api.getPlaylist({ id });
        if (cancelled) return;
        playlist = {
          id: data.playlist.id,
          name: data.playlist.name,
          comment: data.playlist.comment,
          owner: data.playlist.owner,
          public: data.playlist.public,
          songCount: data.playlist.songCount,
          duration: data.playlist.duration,
          created: data.playlist.created,
          coverArt: data.playlist.coverArt,
        };
        songs = data.playlist.entry ?? [];
      } catch (e) {
        if (!cancelled) error = (e as Error).message;
      }
      if (!cancelled) loading = false;
    })();

    return () => { cancelled = true; };
  });
</script>

<div class="p-6">
  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if playlist && songs.length > 0}
    <div class="flex flex-col sm:flex-row items-start gap-6 mb-8">
      <div class="w-48 h-48 rounded-2xl overflow-hidden bg-surface shadow-xl shadow-black/10 ring-1 ring-border/50 flex items-center justify-center shrink-0">
        {#if coverArtUrl}
          <LazyImage src={coverArtUrl} alt="" loading="lazy" decoding="async" class="w-full h-full object-cover" />
        {:else}
          <svg viewBox="0 0 24 24" class="w-16 h-16 text-text-dim opacity-40">
            <path d="M3 22v-20l18 10-18 10z" fill="currentColor"/>
          </svg>
        {/if}
      </div>
      <div class="flex flex-col justify-center gap-2">
        <p class="text-xs text-text-dim uppercase tracking-widest font-medium">Playlist</p>
        <h1 class="text-2xl font-bold tracking-tight">{playlist.name}</h1>
        {#if playlist.comment}
          <p class="text-sm text-text-dim">{playlist.comment}</p>
        {/if}
        <p class="text-sm text-text-dim">
          {playlist.songCount} tracks
          · {formatDuration(playlist.duration)}
        </p>
        <div class="flex gap-2 mt-2 flex-wrap">
          <button
            class="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
            onclick={() => { queue.replaceAll(songs); player.playTrack(songs[0]); }}
          >
            Play All
          </button>
          <button
            class="px-5 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium hover:border-accent/30 active:scale-[0.98] transition-all duration-150"
            onclick={() => queue.addTracksToEnd(songs)}
          >
            Add to Queue
          </button>
          <button
            class="px-5 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium hover:border-accent/30 active:scale-[0.98] transition-all duration-150"
            onclick={() => {
              const shuffled = [...songs].sort(() => Math.random() - 0.5);
              queue.replaceAll(shuffled);
              player.playTrack(shuffled[0]);
            }}
          >
            Shuffle Play
          </button>
        </div>
      </div>
    </div>
    <TrackList {songs} showArtistLink={true} showPlaylistIndex={true} onPlay={(song, index) => { queue.replaceAll(songs); queue.playIndex(index); player.playTrack(song); }} />
  {:else}
    <p class="text-text-dim">Playlist not found or empty</p>
  {/if}
</div>

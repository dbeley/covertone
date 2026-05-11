<script lang="ts">
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import type { Album } from '$lib/api/types';

  let { album, coverArtUrl, serverUrl, username, password }: {
    album: Album;
    coverArtUrl: string;
    serverUrl: string;
    username: string;
    password: string;
  } = $props();

  let localStarred = $state(!!album.starred);

  function open() {
    router.navigate(`album/${album.id}`);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  }

  async function playAll(e: Event) {
    e.stopPropagation();
    const api = new SubsonicAPI({ server: serverUrl, username, password });
    try {
      const data = await api.getAlbum({ id: album.id });
      queue.replaceAll(data.album.song);
      player.playTrack(data.album.song[0]);
    } catch { /* fire-and-forget */ }
  }

  async function addToQueue(e: Event) {
    e.stopPropagation();
    const api = new SubsonicAPI({ server: serverUrl, username, password });
    try {
      const data = await api.getAlbum({ id: album.id });
      queue.addTracksToEnd(data.album.song);
    } catch { /* fire-and-forget */ }
  }

  async function toggleStar(e: Event) {
    e.stopPropagation();
    const newStarred = !localStarred;
    localStarred = newStarred;
    const api = new SubsonicAPI({ server: serverUrl, username, password });
    try {
      if (newStarred) {
        await api.star({ id: album.id });
      } else {
        await api.unstar({ id: album.id });
      }
    } catch {
      localStarred = !!album.starred;
    }
  }
</script>

<div
  class="cursor-pointer group rounded-xl border border-border bg-surface hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 overflow-hidden active:scale-[0.98]"
  onclick={open}
  onkeydown={onKeydown}
  role="button"
  tabindex="0"
  aria-label={`Open album ${album.name}`}
>
  <div class="aspect-square overflow-hidden relative">
    <LazyImage
      src={coverArtUrl}
      alt={album.name}
      loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div
      class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3 gap-2 pointer-events-none"
    >
      <button
        class="pointer-events-auto w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-accent/80 hover:scale-110 transition-all duration-150 active:scale-95"
        onclick={playAll}
        aria-label="Play all"
        title="Play all"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current ml-0.5">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </button>
      <button
        class="pointer-events-auto w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-accent/80 hover:scale-110 transition-all duration-150 active:scale-95"
        onclick={addToQueue}
        aria-label="Add to queue"
        title="Add to queue"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button
        class="pointer-events-auto w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-accent/80 hover:scale-110 transition-all duration-150 active:scale-95"
        onclick={toggleStar}
        aria-label={localStarred ? 'Remove from favorites' : 'Add to favorites'}
        title={localStarred ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 {localStarred ? 'fill-accent text-accent' : 'fill-none'} stroke-current stroke-[1.5] transition-colors duration-150">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
    </div>
  </div>
  <div class="p-2.5">
    <p class="text-sm font-medium truncate text-text">{album.name}</p>
    <p class="text-xs text-text-dim truncate mt-0.5">{album.artist}</p>
  </div>
</div>

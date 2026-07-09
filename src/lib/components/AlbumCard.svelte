<script lang="ts">
  import { untrack } from 'svelte';
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { library } from '$lib/stores/library';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import type { Album } from '$lib/api/types';

  let { album, coverArtUrl, onRemove }: {
    album: Album;
    coverArtUrl: string;
    serverUrl: string;
    username: string;
    password: string;
    onRemove?: () => void;
  } = $props();

  let localStarred = $state(untrack(() => !!album.starred));

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
    const api = library.getApi();
    if (!api) return;
    try {
      const data = await api.getAlbum({ id: album.id });
      queue.replaceAll(data.album.song);
      player.playTrack(data.album.song[0]);
    } catch { /* fire-and-forget */ }
  }

  async function addToQueue(e: Event) {
    e.stopPropagation();
    const api = library.getApi();
    if (!api) return;
    try {
      const data = await api.getAlbum({ id: album.id });
      queue.addTracksToEnd(data.album.song);
    } catch { /* fire-and-forget */ }
  }

  async function toggleStar(e: Event) {
    e.stopPropagation();
    const newStarred = !localStarred;
    localStarred = newStarred;
    const api = library.getApi();
    if (!api) { localStarred = !!album.starred; return; }
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
  class="cursor-pointer group glass overflow-hidden active:scale-[0.98] transition-all duration-200"
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
      loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
    <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-transparent"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
    <div class="absolute top-0 left-0 right-0 p-2.5">
      <p class="text-[11px] font-semibold truncate text-white drop-shadow-md">{album.name}</p>
      <p class="text-[10px] text-white/60 truncate drop-shadow-sm">{album.artist}</p>
    </div>
    <div
      class="absolute inset-0 flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity duration-200"
    >
      <button
        class="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg"
        onclick={playAll}
        aria-label="Play all"
        title="Play all"
        data-nav-ignore tabindex="-1"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current ml-0.5">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </button>
      <button
        class="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg"
        onclick={addToQueue}
        aria-label="Add to queue"
        title="Add to queue"
        data-nav-ignore tabindex="-1"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button
        class="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg"
        onclick={toggleStar}
        aria-label={localStarred ? 'Remove from favorites' : 'Add to favorites'}
        title={localStarred ? 'Remove from favorites' : 'Add to favorites'}
        data-nav-ignore tabindex="-1"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 {localStarred ? 'fill-accent text-accent' : 'fill-none'} stroke-current stroke-[1.5] transition-colors duration-150">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
      {#if onRemove}
        <button
          class="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg"
          onclick={onRemove}
          aria-label="Remove from listen later"
          title="Remove from listen later"
          data-nav-ignore tabindex="-1"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4 stroke-current stroke-[2] fill-none">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</div>

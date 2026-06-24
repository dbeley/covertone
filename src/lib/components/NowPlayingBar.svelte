<script lang="ts">
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import { settings } from '$lib/stores/settings';
  import { library } from '$lib/stores/library';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import LazyImage from '$lib/components/LazyImage.svelte';

  let { onExpand = () => {} }: { onExpand?: () => void } = $props();

  let touchStartY = $state(0);

  function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 40) onExpand();
  }

  let currentTrack = $derived($player.currentTrack);
  let status = $derived($player.status);
  let currentTime = $derived($player.currentTime);
  let duration = $derived($player.duration);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let favorited = $derived($player.favorited);
  let coverArtUrl = $derived(
    currentTrack?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: currentTrack.coverArt, size: 80 })
      : ''
  );

  async function toggleFavorite(e: MouseEvent) {
    e.stopPropagation();
    const newState = !favorited;
    player.setFavorited(newState);
    if (!currentTrack) return;
    try {
      const api = library.getApi();
      if (!api) return;
      if (newState) {
        await api.star({ id: currentTrack.id });
      } else {
        await api.unstar({ id: currentTrack.id });
      }
    } catch {
      // fire-and-forget
    }
  }

  function handlePrev(e: MouseEvent) {
    e.stopPropagation();
    player.handlePreviousTrack();
  }

  function handleTogglePlay(e: MouseEvent) {
    e.stopPropagation();
    player.togglePlay();
  }

  async function handleNext(e: MouseEvent) {
    e.stopPropagation();
    const next = await queue.getNextAutoDJ();
    if (next) player.playTrack(next);
  }

  function handleToggleQueue(e: MouseEvent) {
    e.stopPropagation();
    queueDrawerOpen.update(v => !v);
  }

  function handleSeek(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    player.seek(pct * duration);
  }

  function handleBarKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') onExpand();
  }

  function handleSeekKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') player.seek(Math.min(duration, currentTime + 5));
    else if (e.key === 'ArrowLeft') player.seek(Math.max(0, currentTime - 5));
  }

  function handleSeekMove(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    player.seek(pct * duration);
  }
</script>

{#if currentTrack}
  <div
    class="fixed left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border grid grid-cols-[1fr_auto_1fr] items-center px-4 gap-3 z-50 transition-shadow hover:shadow-lg hover:shadow-black/5 cursor-pointer"
    style="bottom: var(--safe-area-inset-bottom, 0px)"
    transition:slide={{ duration: 250, easing: quintOut }}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    onclick={onExpand}
    onkeydown={handleBarKeydown}
    role="button"
    tabindex="0"
    aria-label="Now playing bar - click to expand"
  >
    <button
      class="absolute top-0 left-0 right-0 h-2 cursor-pointer group block p-0 border-none bg-transparent"
      onclick={(e) => { if (e.detail > 0) handleSeek(e); }}
      ontouchmove={handleSeekMove}
      onkeydown={handleSeekKeydown}
      aria-label="Seek"
      style="touch-action: none"
    >
      <div class="h-full flex items-center">
        <div class="w-full h-1 bg-text-dim/15 rounded-full overflow-hidden">
          <div
            class="h-full bg-accent transition-[width] duration-200 ease-linear"
            style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
          ></div>
        </div>
      </div>
      <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
        style="left: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
      ></div>
    </button>
    <div
      class="flex items-center min-w-0 gap-3"
    >
      <LazyImage src={coverArtUrl} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/50" />
      <div class="min-w-0">
        <div class="text-sm font-medium truncate">{currentTrack.title}</div>
        <div class="text-xs text-text-dim truncate">{currentTrack.artist}</div>
      </div>
    </div>

    <div class="flex items-center gap-2 justify-center">
      <button
        class="p-2.5 rounded-2xl shadow-lg shadow-black/20 transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handlePrev}
        aria-label="Previous"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <polygon points="19,4 7,12 19,20" />
          <rect x="4" y="4" width="3" height="16" rx="1" />
        </svg>
      </button>

      <button
        class="p-2.5 rounded-2xl shadow-lg shadow-black/20 transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handleTogglePlay}
        aria-label={status === 'playing' ? 'Pause' : 'Play'}
      >
        {#if status === 'playing'}
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        {/if}
      </button>

      <button
        class="p-2.5 rounded-2xl shadow-lg shadow-black/20 transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handleNext}
        aria-label="Next"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <polygon points="5,4 17,12 5,20" />
          <rect x="17" y="4" width="3" height="16" rx="1" />
        </svg>
      </button>
    </div>

    <div class="flex items-center justify-end gap-1">
      <button
        class="p-2.5 rounded-2xl shadow-lg shadow-black/20 transition-all duration-150 active:scale-90 {favorited ? 'text-accent' : 'text-text-dim hover:text-text hover:bg-white/5'}"
        onclick={toggleFavorite}
        aria-label="Favorite"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
      <button
        class="p-2.5 rounded-2xl shadow-lg shadow-black/20 transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handleToggleQueue}
        aria-label="Toggle queue"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <rect x="4" y="5" width="16" height="2" rx="1" />
          <rect x="4" y="11" width="16" height="2" rx="1" />
          <rect x="4" y="17" width="16" height="2" rx="1" />
        </svg>
      </button>
    </div>
  </div>
{/if}

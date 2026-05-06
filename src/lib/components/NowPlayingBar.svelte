<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import { settings } from '$lib/stores/settings';
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
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let coverArtUrl = $derived(
    currentTrack?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: currentTrack.coverArt, size: 80 })
      : ''
  );

  function handlePrev(e: MouseEvent) {
    e.stopPropagation();
    const prev = queue.getPrevious();
    if (prev) player.playTrack(prev);
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
</script>

{#if currentTrack}
  <div
    class="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border flex items-center px-4 gap-3 z-50 transition-shadow hover:shadow-lg hover:shadow-black/5"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="presentation"
  >
    <div
      class="flex items-center flex-1 min-w-0 gap-3 cursor-pointer"
      onclick={onExpand}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
      role="button"
      tabindex="0"
      aria-label="Now playing bar"
    >
      <LazyImage src={coverArtUrl} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/50" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{currentTrack.title}</div>
        <div class="text-xs text-text-dim truncate">{currentTrack.artist}</div>
      </div>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <button
        class="p-2 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handlePrev}
        aria-label="Previous"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <polygon points="19,4 7,12 19,20" />
          <rect x="4" y="4" width="3" height="16" rx="1" />
        </svg>
      </button>

      <button
        class="p-2 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
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
        class="p-2 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={handleNext}
        aria-label="Next"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <polygon points="5,4 17,12 5,20" />
          <rect x="17" y="4" width="3" height="16" rx="1" />
        </svg>
      </button>

      <button
        class="p-2 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
        onclick={(e) => { e.stopPropagation(); queueDrawerOpen.set(true); }}
        aria-label="Queue"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
{/if}

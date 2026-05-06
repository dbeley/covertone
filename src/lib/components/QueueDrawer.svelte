
<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import type { QueuedItem } from '$lib/stores/queue';

  let items = $derived($queue.items);
  let currentIndex = $derived($queue.currentIndex);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleTrackClick(item: QueuedItem, index: number) {
    queue.playIndex(index);
    player.playTrack(item.track);
  }

  function handleRemove(index: number, e: MouseEvent) {
    e.stopPropagation();
    queue.removeTrack(index);
  }

  // Mobile swipe
  let dragY = $state(0);
  let dragging = $state(false);
  let startY = $state(0);
  let dragThresholdMet = $state(false);
  const DRAG_THRESHOLD = 10;
  const CLOSE_THRESHOLD = 100;

  function onTouchStart(e: TouchEvent) {
    dragging = true;
    dragThresholdMet = false;
    startY = e.touches[0].clientY;
    dragY = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - startY;
    if (delta < 0) return;
    if (!dragThresholdMet && delta < DRAG_THRESHOLD) return;
    dragThresholdMet = true;
    dragY = Math.min(delta, window.innerHeight / 2);
  }

  function onTouchEnd() {
    dragging = false;
    if (dragThresholdMet && dragY > CLOSE_THRESHOLD) {
      queueDrawerOpen.set(false);
    }
    dragY = 0;
    dragThresholdMet = false;
  }
</script>

<!-- Desktop side panel -->
<aside
  class="hidden md:flex flex-col border-l border-border bg-surface overflow-hidden transition-all duration-300 ease-out shrink-0"
  class:w-80={$queueDrawerOpen}
  class:w-0={!$queueDrawerOpen}
>
  {#if $queueDrawerOpen}
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <h2 class="text-base font-bold">Queue</h2>
      <div class="flex items-center gap-1">
        {#if items.length > 0}
          <button
            class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-red-400 transition-all duration-150 active:scale-90"
            onclick={() => queue.clear()}
            aria-label="Clear queue"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
              <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        {/if}
        <button class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90" onclick={() => queueDrawerOpen.set(false)} aria-label="Close queue">
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
    <div class="overflow-y-auto flex-1 min-w-0 pb-16">
      {#if items.length === 0}
        <p class="text-sm text-text-dim text-center py-8">Queue is empty</p>
      {:else}
        {#each items as item, index (item.key)}
          <div
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0 {index === currentIndex ? 'bg-accent/5' : ''}"
            onclick={() => handleTrackClick(item, index)}
            role="button"
            tabindex="0"
          >
            <span class="w-5 text-center text-xs text-text-dim shrink-0">
              {#if index === currentIndex}
                ▶
              {:else}
                {index + 1}
              {/if}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{item.track.title}</div>
              <div class="text-xs text-text-dim truncate">{item.track.artist}</div>
            </div>
            <span class="text-xs text-text-dim w-10 text-right shrink-0">{formatDuration(item.track.duration)}</span>
            <button
              class="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 shrink-0"
              onclick={(e) => handleRemove(index, e)}
              aria-label="Remove from queue"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
                <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</aside>

<!-- Mobile bottom sheet -->
{#if $queueDrawerOpen}
  <div class="fixed inset-0 z-50 flex items-end justify-center animate-fade-in md:hidden">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={() => queueDrawerOpen.set(false)}></div>
    <div
      class="relative w-full max-w-lg bg-surface border border-border border-b-0 rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up shadow-2xl shadow-black/20"
      style="padding-bottom: env(safe-area-inset-bottom, 0px); transform: translateY({dragY}px); transition: {dragging ? 'none' : 'transform 0.3s ease-out'}"
      onclick={(e) => e.stopPropagation()}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
      onkeydown={(e) => { if (e.key === 'Escape') queueDrawerOpen.set(false); }}
      role="dialog"
      aria-label="Queue"
      tabindex="-1"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 class="text-lg font-bold">Queue</h2>
        <div class="flex items-center gap-1">
          {#if items.length > 0}
            <button
              class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-red-400 transition-all duration-150 active:scale-90"
              onclick={() => queue.clear()}
              aria-label="Clear queue"
            >
              <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
                <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          {/if}
          <button class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90" onclick={() => queueDrawerOpen.set(false)} aria-label="Close queue">
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div class="overflow-y-auto flex-1">
        {#if items.length === 0}
          <p class="text-sm text-text-dim text-center py-8">Queue is empty</p>
        {:else}
          {#each items as item, index (item.key)}
            <div
              class="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0 {index === currentIndex ? 'bg-accent/5' : ''}"
              onclick={() => handleTrackClick(item, index)}
              role="button"
              tabindex="0"
            >
              <span class="w-5 text-center text-xs text-text-dim shrink-0">
                {#if index === currentIndex}
                  ▶
                {:else}
                  {index + 1}
                {/if}
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{item.track.title}</div>
                <div class="text-xs text-text-dim truncate">{item.track.artist}</div>
              </div>
              <span class="text-xs text-text-dim w-10 text-right shrink-0">{formatDuration(item.track.duration)}</span>
              <button
                class="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 shrink-0"
                onclick={(e) => handleRemove(index, e)}
                aria-label="Remove from queue"
              >
                <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
                  <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

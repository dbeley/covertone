<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import type { Song } from '$lib/api/types';

  let { open = false, onClose = () => {} } = $props<{
    open?: boolean;
    onClose?: () => void;
  }>();

  let tracks = $derived($queue.tracks);
  let currentIndex = $derived($queue.currentIndex);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleTrackClick(track: Song) {
    player.playTrack(track);
  }

  function handleRemove(index: number, e: MouseEvent) {
    e.stopPropagation();
    queue.removeTrack(index);
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-end justify-center" onclick={onClose}>
    <div class="absolute inset-0 bg-black/50" onclick={onClose}></div>
    <div
      class="relative w-full max-w-lg bg-surface rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 class="text-lg font-bold">Queue</h2>
        <button class="p-1 hover:text-accent transition-colors" onclick={onClose} aria-label="Close queue">
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-1">
        {#if tracks.length === 0}
          <p class="text-sm text-text-dim text-center py-8">Queue is empty</p>
        {:else}
          {#each tracks as track, index}
            <div
              class="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors {index === currentIndex ? 'bg-accent/10' : ''}"
              onclick={() => handleTrackClick(track)}
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
                <div class="text-sm font-medium truncate">{track.title}</div>
                <div class="text-xs text-text-dim truncate">{track.artist}</div>
              </div>
              <span class="text-xs text-text-dim w-10 text-right shrink-0">{formatDuration(track.duration)}</span>
              <button
                class="p-1 hover:text-red-500 transition-colors shrink-0"
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

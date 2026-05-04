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
  <div class="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={onClose}></div>
    <div
      class="relative w-full max-w-lg bg-surface border border-border border-b-0 rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up shadow-2xl shadow-black/20"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 class="text-lg font-bold">Queue</h2>
        <button class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90" onclick={onClose} aria-label="Close queue">
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
          {#each tracks as track, index (track.id)}
            <div
              class="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0 {index === currentIndex ? 'bg-accent/5' : ''}"
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

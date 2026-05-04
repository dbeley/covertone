<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import type { Song } from '$lib/api/types';

  let { songs }: { songs: Song[] } = $props();

  let contextMenuIndex = $state<number | null>(null);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleRowClick(song: Song) {
    player.playTrack(song);
  }

  function handleContextMenu(e: MouseEvent, index: number) {
    e.stopPropagation();
    contextMenuIndex = contextMenuIndex === index ? null : index;
  }

  function handlePlayNext(song: Song) {
    queue.addNext(song);
    contextMenuIndex = null;
  }

  function handleAddToEnd(song: Song) {
    queue.addToEnd(song);
    contextMenuIndex = null;
  }

  function closeContextMenu() {
    contextMenuIndex = null;
  }

  function handleBackdropClick() {
    closeContextMenu();
  }
</script>

{#if contextMenuIndex !== null}
  <div class="fixed inset-0 z-40" onclick={handleBackdropClick} onkeydown={() => {}} role="presentation"></div>
{/if}

<div class="w-full">
  {#each songs as song, index}
    <div
      class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group relative"
      onclick={() => handleRowClick(song)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(song); }}
      role="button"
      tabindex="0"
    >
      <span class="w-6 text-center text-xs text-text-dim group-hover:hidden">
        {song.track ?? index + 1}
      </span>
      <span class="w-6 text-center hidden group-hover:block">
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current inline-block">
          <polygon points="6,4 18,12 6,20" />
        </svg>
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{song.title}</div>
        <div class="text-xs text-text-dim truncate">{song.artist}</div>
      </div>
      <span class="text-xs text-text-dim w-10 text-right">{formatDuration(song.duration)}</span>
      <button
        type="button"
        class="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent relative"
        onclick={(e) => handleContextMenu(e, index)}
        aria-label="Track options"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {#if contextMenuIndex === index}
        <div
          class="absolute right-0 top-full mt-1 bg-surface border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-36"
          onclick={(e) => e.stopPropagation()}
          onkeydown={() => {}}
          role="menu"
          tabindex="-1"
        >
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors"
            onclick={() => handlePlayNext(song)}
          >
            Play Next
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors"
            onclick={() => handleAddToEnd(song)}
          >
            Add to End
          </button>
        </div>
      {/if}
    </div>
  {/each}
</div>

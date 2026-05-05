<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import type { Song } from '$lib/api/types';

  let { songs, onPlay, showArtistLink = true }: { songs: Song[]; onPlay?: (song: Song, index: number) => void; showArtistLink?: boolean } = $props();

  let contextMenuIndex = $state<number | null>(null);
  let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleRowClick(song: Song, index: number) {
    if (onPlay) {
      onPlay(song, index);
    } else {
      player.playTrack(song);
    }
  }

  function handleContextMenu(e: MouseEvent, index: number) {
    e.stopPropagation();
    contextMenuIndex = contextMenuIndex === index ? null : index;
  }

  function handlePlayAfter(song: Song) {
    contextMenuIndex = null;
    queue.addNext(song);
  }

  function handleAddToQueue(song: Song) {
    contextMenuIndex = null;
    queue.addToEnd(song);
  }

  function closeContextMenu() {
    contextMenuIndex = null;
  }

  function handleBackdropClick() {
    closeContextMenu();
  }

  function startLongPress(index: number) {
    longPressTimer = setTimeout(() => {
      contextMenuIndex = index;
      longPressTimer = null;
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
</script>

{#if contextMenuIndex !== null}
  <div
    class="fixed inset-0 z-40 touch-none"
    onclick={handleBackdropClick}
    ontouchstart={handleBackdropClick}
    onkeydown={() => {}}
    role="presentation"
  ></div>
{/if}

<div class="w-full border border-border rounded-xl overflow-hidden bg-surface/50">
  {#each songs as song, index (song.id)}
    <div
      class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/[0.04] transition-colors group relative border-b border-border/50 last:border-b-0"
      onclick={() => handleRowClick(song, index)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(song, index); }}
      ontouchstart={() => startLongPress(index)}
      ontouchend={cancelLongPress}
      ontouchmove={cancelLongPress}
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
        {#if showArtistLink}
          <div class="text-xs text-text-dim truncate">
            <button class="hover:text-accent hover:underline transition-colors" onclick={(e) => { e.stopPropagation(); router.navigate(`artist/${song.artistId}`); }}>{song.artist}</button>
          </div>
        {:else}
          <div class="text-xs text-text-dim truncate">{song.artist}</div>
        {/if}
      </div>
      <span class="text-xs text-text-dim w-10 text-right">{formatDuration(song.duration)}</span>
      <button
        type="button"
        class="p-1 transition-opacity hover:text-accent relative text-text-dim"
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
          class="absolute right-2 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl shadow-black/10 z-50 py-1 min-w-36 animate-scale-in"
          onclick={(e) => e.stopPropagation()}
          ontouchstart={(e) => e.stopPropagation()}
          ontouchend={(e) => e.stopPropagation()}
          onkeydown={() => {}}
          role="menu"
          tabindex="-1"
        >
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent/5 transition-colors rounded-lg"
            onclick={() => handlePlayAfter(song)}
          >
            Play After
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-accent/5 transition-colors rounded-lg"
            onclick={() => handleAddToQueue(song)}
          >
            Add to Queue
          </button>
        </div>
      {/if}
    </div>
  {/each}
</div>

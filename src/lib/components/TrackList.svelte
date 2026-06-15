<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import { formatDuration } from '$lib/utils/format';
  import type { Song } from '$lib/api/types';

  let { songs, onPlay, showArtistLink = true, showPlaylistIndex = false }: { songs: Song[]; onPlay?: (song: Song, index: number) => void; showArtistLink?: boolean; showPlaylistIndex?: boolean } = $props();

  let contextMenuIndex = $state<number | null>(null);
  let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);

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

<div class="w-full glass rounded-xl overflow-hidden">
  {#each songs as song, index (song.id + '-' + index)}
    <div
      class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors group relative border-b border-border/30 last:border-b-0"
      onclick={() => handleRowClick(song, index)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(song, index); }}
      ontouchstart={() => startLongPress(index)}
      ontouchend={cancelLongPress}
      ontouchmove={cancelLongPress}
      role="button"
      tabindex="0"
    >
      <span class="w-6 text-center text-xs text-text-dim group-hover:hidden">
        {showPlaylistIndex ? index + 1 : (song.track ?? index + 1)}
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
            <button class="hover:text-accent hover:underline transition-colors" tabindex="-1" onclick={(e) => { e.stopPropagation(); router.navigate(`artist/${song.artistId}`); }}>{song.artist}</button>
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
        tabindex="-1"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {#if contextMenuIndex === index}
        <div
          class="absolute right-2 top-full mt-1 glass-raised rounded-xl z-50 py-1 min-w-36 animate-scale-in"
          onclick={(e) => e.stopPropagation()}
          ontouchstart={(e) => e.stopPropagation()}
          ontouchend={(e) => e.stopPropagation()}
          onkeydown={() => {}}
          role="menu"
          tabindex="-1"
        >
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors rounded-lg"
            onclick={() => handlePlayAfter(song)}
            tabindex="-1"
          >
            Play After
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors rounded-lg"
            onclick={() => handleAddToQueue(song)}
            tabindex="-1"
          >
            Add to Queue
          </button>
        </div>
      {/if}
    </div>
  {/each}
</div>

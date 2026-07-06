<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import { library } from '$lib/stores/library';
  import { formatDuration } from '$lib/utils/format';
  import type { Song } from '$lib/api/types';

  let { songs, onPlay, showArtistLink = true, showPlaylistIndex = false }: {
    songs: Song[];
    onPlay?: (song: Song, index: number) => void;
    showArtistLink?: boolean;
    showPlaylistIndex?: boolean;
  } = $props();

  let contextMenuIndex = $state<number | null>(null);
  let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);
  let menuStyle = $state<{ top: string; right: string }>({ top: '0', right: '0' });
  let menuEl = $state<HTMLElement | null>(null);

  /** Stored button position when the menu was opened — used for post-mount refinement. */
  let menuBtnRect = $state<{ top: number; bottom: number; right: number } | null>(null);

  /** Local optimistic starred state — keyed by song id */
  let starredMap = $state<Record<string, boolean>>({});

  /** Re-initialise local star state whenever the songs prop changes (e.g. after a re-fetch) */
  $effect(() => {
    const map: Record<string, boolean> = {};
    for (const s of songs) {
      map[s.id] = !!s.starred;
    }
    starredMap = map;
  });

  /** The song object of the currently open menu, derived from the index */
  let contextSong = $derived(contextMenuIndex !== null ? songs[contextMenuIndex] : null);

  function handleRowClick(song: Song, index: number) {
    if (onPlay) {
      onPlay(song, index);
    } else {
      player.playTrack(song);
    }
  }

  function positionMenuFromElement(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    menuBtnRect = { top: rect.top, bottom: rect.bottom, right: rect.right };

    // Initial estimate — close enough that the "below" case is exact
    // and the "above" case won't visibly jump when refined after mount.
    const estimatedMenuHeight = 120; // 3 items × ~36px + 8px padding
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const showAbove = spaceBelow < estimatedMenuHeight;
    const top = showAbove
      ? Math.max(8, rect.top - estimatedMenuHeight)
      : rect.bottom + 4;

    menuStyle = {
      top: `${top}px`,
      right: `${Math.max(8, window.innerWidth - rect.right + 8)}px`,
    };
  }

  /**
   * After the menu element is mounted, refine its position using the
   * actual measured height so the menu bottom exactly kisses the
   * button's top edge when flipped above.
   */
  $effect(() => {
    if (menuEl && contextMenuIndex !== null && menuBtnRect) {
      const actualHeight = menuEl.offsetHeight;
      const rect = menuBtnRect;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const showAbove = spaceBelow < actualHeight;
      const top = showAbove
        ? Math.max(8, rect.top - actualHeight - 4)
        : rect.bottom + 4;

      menuStyle = {
        top: `${top}px`,
        right: `${Math.max(8, window.innerWidth - rect.right + 8)}px`,
      };
    }
  });

  function handleContextMenu(e: MouseEvent, index: number) {
    e.stopPropagation();
    if (contextMenuIndex === index) {
      contextMenuIndex = null;
      return;
    }
    contextMenuIndex = index;
    positionMenuFromElement(e.currentTarget as HTMLElement);
  }

  function startLongPress(e: Event, index: number) {
    longPressTimer = setTimeout(() => {
      contextMenuIndex = index;
      longPressTimer = null;
      const row = e.currentTarget as HTMLElement;
      const button = row.querySelector<HTMLElement>('button[aria-label="Track options"]');
      if (button) positionMenuFromElement(button);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handlePlayAfter(song: Song) {
    contextMenuIndex = null;
    queue.addNext(song);
  }

  function handleAddToQueue(song: Song) {
    contextMenuIndex = null;
    queue.addToEnd(song);
  }

  async function toggleFavorite(song: Song) {
    const current = starredMap[song.id] ?? !!song.starred;
    const newVal = !current;

    // Close menu immediately
    contextMenuIndex = null;

    // Optimistic update
    starredMap = { ...starredMap, [song.id]: newVal };

    const api = library.getApi();
    if (!api) return;

    try {
      if (newVal) {
        await api.star({ id: song.id });
      } else {
        await api.unstar({ id: song.id });
      }
    } catch {
      // Revert on failure
      starredMap = { ...starredMap, [song.id]: current };
    }
  }

  function closeContextMenu() {
    contextMenuIndex = null;
  }

  function handleBackdropClick() {
    closeContextMenu();
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
      class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors group border-b border-border/30 last:border-b-0"
      onclick={() => handleRowClick(song, index)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(song, index); }}
      ontouchstart={(e) => startLongPress(e, index)}
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
    </div>
  {/each}
</div>

{#if contextSong}
  <div
    bind:this={menuEl}
    class="fixed z-50 py-1 min-w-36 glass-raised rounded-xl animate-scale-in"
    style="top: {menuStyle.top}; right: {menuStyle.right};"
    onclick={(e) => e.stopPropagation()}
    ontouchstart={(e) => e.stopPropagation()}
    ontouchend={(e) => e.stopPropagation()}
    onkeydown={() => {}}
    role="menu"
    tabindex="-1"
  >
    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors rounded-lg flex items-center gap-2"
      onclick={() => handlePlayAfter(contextSong)}
      tabindex="-1"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current shrink-0">
        <polygon points="4,2 20,12 4,22" />
        <line x1="4" y1="2" x2="4" y2="22" stroke="currentColor" stroke-width="2" />
      </svg>
      Play After
    </button>
    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors rounded-lg flex items-center gap-2"
      onclick={() => handleAddToQueue(contextSong)}
      tabindex="-1"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current shrink-0">
        <rect x="3" y="4" width="18" height="2" rx="1" />
        <rect x="3" y="10" width="18" height="2" rx="1" />
        <rect x="3" y="16" width="12" height="2" rx="1" />
        <line x1="18" y1="16" x2="18" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <line x1="15" y1="19" x2="21" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      Add to Queue
    </button>
    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors rounded-lg flex items-center gap-2"
      onclick={() => toggleFavorite(contextSong)}
      tabindex="-1"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 {starredMap[contextSong.id] ? 'fill-accent text-accent' : 'fill-none'} stroke-current stroke-[1.5] transition-colors duration-150">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      {starredMap[contextSong.id] ? 'Remove from Favorites' : 'Add to Favorites'}
    </button>
  </div>
{/if}

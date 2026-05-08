<script lang="ts">
  import { on } from 'svelte/events';
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import type { QueuedItem } from '$lib/stores/queue';
  import { formatDuration } from '$lib/utils/format';
  import { handleActivationKey } from '$lib/utils/keyboard';

  let items = $derived($queue.items);
  let currentIndex = $derived($queue.currentIndex);

  const DRAG_THRESHOLD = 10;
  const CLOSE_THRESHOLD = 100;
  const TOUCH_DRAG_HANDLE_SELECTOR = '[data-queue-drag-handle="true"]';
  let drawerBottomPadding = $derived(
    'var(--safe-area-inset-bottom)'
  );

  let dragY = $state(0);
  let dragging = $state(false);
  let startY = $state(0);
  let dragThresholdMet = $state(false);
  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);
  let touchDragActive = $state(false);
  let touchDragMoved = $state(false);
  let skipNextRowClick = $state(false);

  function handleTrackClick(item: QueuedItem, index: number) {
    queue.playIndex(index);
    player.playTrack(item.track);
  }

  function handleRemove(index: number, e: MouseEvent) {
    e.stopPropagation();
    queue.removeTrack(index);
  }

  function onTouchStart(e: globalThis.TouchEvent) {
    dragging = true;
    dragThresholdMet = false;
    startY = e.touches[0].clientY;
    dragY = 0;
  }

  function onTouchMove(e: globalThis.TouchEvent) {
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

  function handleDragStart(index: number, e: globalThis.DragEvent) {
    draggedIndex = index;
    dropTargetIndex = index;
    e.dataTransfer?.setData('text/plain', `${index}`);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragOver(index: number, e: globalThis.DragEvent) {
    e.preventDefault();
    if (dropTargetIndex !== index) {
      dropTargetIndex = index;
    }
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(index: number, e: globalThis.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) {
      clearDragState();
      return;
    }
    queue.moveTrack(draggedIndex, index);
    clearDragState();
  }

  function handleDragEnd() {
    clearDragState();
  }

  function clearDragState() {
    draggedIndex = null;
    dropTargetIndex = null;
  }

  function getRowIndexFromTouch(touch: globalThis.Touch) {
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!(target instanceof HTMLElement)) return null;
    const row = target.closest<HTMLElement>('[data-queue-index]');
    if (!row) return null;
    const rawIndex = row.dataset.queueIndex;
    if (rawIndex === undefined) return null;
    const parsed = Number(rawIndex);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function handleRowTouchStart(index: number, e: globalThis.TouchEvent) {
    e.stopPropagation();
    const target = e.target;
    if (!(target instanceof globalThis.Element) || !target.closest(TOUCH_DRAG_HANDLE_SELECTOR)) {
      touchDragActive = false;
      touchDragMoved = false;
      clearDragState();
      return;
    }
    if (e.cancelable) {
      e.preventDefault();
    }
    touchDragActive = true;
    touchDragMoved = false;
    draggedIndex = index;
    dropTargetIndex = index;
  }

  function handleRowTouchMove(e: globalThis.TouchEvent) {
    e.stopPropagation();
    if (!touchDragActive || e.touches.length === 0) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    touchDragMoved = true;
    const nextIndex = getRowIndexFromTouch(e.touches[0]);
    if (nextIndex !== null) {
      dropTargetIndex = nextIndex;
    }
  }

  function handleRowTouchEnd(e: globalThis.TouchEvent) {
    e.stopPropagation();
    if (
      touchDragActive &&
      touchDragMoved &&
      draggedIndex !== null &&
      dropTargetIndex !== null &&
      draggedIndex !== dropTargetIndex
    ) {
      queue.moveTrack(draggedIndex, dropTargetIndex);
      skipNextRowClick = true;
    }
    touchDragActive = false;
    touchDragMoved = false;
    clearDragState();
  }

  function handleRowTouchCancel(e: globalThis.TouchEvent) {
    e.stopPropagation();
    touchDragActive = false;
    touchDragMoved = false;
    clearDragState();
  }

  function getNodeQueueIndex(node: HTMLElement) {
    const rawIndex = node.dataset.queueIndex;
    if (rawIndex === undefined) return null;
    const parsed = Number(rawIndex);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function touchDragListeners(node: HTMLElement) {
    const offTouchStart = on(
      node,
      'touchstart',
      (e) => {
        const index = getNodeQueueIndex(node);
        if (index === null) return;
        handleRowTouchStart(index, e);
      },
      { passive: false }
    );
    const offTouchMove = on(node, 'touchmove', (e) => handleRowTouchMove(e), {
      passive: false
    });
    const offTouchEnd = on(node, 'touchend', (e) => handleRowTouchEnd(e));
    const offTouchCancel = on(node, 'touchcancel', (e) => handleRowTouchCancel(e));

    return {
      destroy() {
        offTouchStart();
        offTouchMove();
        offTouchEnd();
        offTouchCancel();
      }
    };
  }

  function handleRowClick(item: QueuedItem, index: number) {
    if (skipNextRowClick) {
      skipNextRowClick = false;
      return;
    }
    handleTrackClick(item, index);
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
      </div>
    </div>
    <div class="overflow-y-auto flex-1 min-w-0 pb-16">
      {#if items.length === 0}
        <p class="text-sm text-text-dim text-center py-8">Queue is empty</p>
      {:else}
        {#each items as item, index (item.key)}
          <div
            class="flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0 {index === currentIndex ? 'bg-accent/5' : ''} {draggedIndex === index ? 'opacity-60 bg-accent/10' : ''} {dropTargetIndex === index && draggedIndex !== index ? 'ring-1 ring-inset ring-accent/40 bg-accent/10' : ''}"
            draggable="true"
            onclick={() => handleRowClick(item, index)}
            onkeydown={(e) => handleActivationKey(e, () => handleTrackClick(item, index))}
            ondragstart={(e) => handleDragStart(index, e)}
            ondragover={(e) => handleDragOver(index, e)}
            ondrop={(e) => handleDrop(index, e)}
            ondragend={handleDragEnd}
            role="button"
            tabindex="0"
            aria-label={`Play ${item.track.title} by ${item.track.artist}`}
          >
            <span class="w-5 text-center text-xs text-text-dim shrink-0">
              {#if index === currentIndex}
                ▶
              {:else}
                {index + 1}
              {/if}
            </span>
            <span
              aria-hidden="true"
              data-queue-drag-handle="true"
              class="text-text-dim opacity-60 shrink-0"
              style="touch-action: none;"
            >
              <svg viewBox="0 0 12 12" class="w-3 h-3 fill-current">
                <circle cx="3" cy="2.5" r="1" />
                <circle cx="3" cy="6" r="1" />
                <circle cx="3" cy="9.5" r="1" />
                <circle cx="9" cy="2.5" r="1" />
                <circle cx="9" cy="6" r="1" />
                <circle cx="9" cy="9.5" r="1" />
              </svg>
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
  <div class="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in md:hidden">
    <button
      type="button"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      aria-label="Close queue"
      onclick={() => queueDrawerOpen.set(false)}
    ></button>
    <div
      class="relative w-full max-w-lg bg-surface border border-border border-b-0 rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up shadow-2xl shadow-black/20"
      style="padding-bottom: {drawerBottomPadding}; transform: translateY({dragY}px); transition: {dragging ? 'none' : 'transform 0.3s ease-out'}"
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
        </div>
      </div>

      <div class="overflow-y-auto flex-1 pb-16">
        {#if items.length === 0}
          <p class="text-sm text-text-dim text-center py-8">Queue is empty</p>
        {:else}
          {#each items as item, index (item.key)}
            <div
              class="flex items-center gap-2.5 sm:gap-3 px-5 py-3 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0 {index === currentIndex ? 'bg-accent/5' : ''} {draggedIndex === index ? 'opacity-60 bg-accent/10' : ''} {dropTargetIndex === index && draggedIndex !== index ? 'ring-1 ring-inset ring-accent/40 bg-accent/10' : ''}"
              data-queue-index={index}
              draggable="true"
              onclick={() => handleRowClick(item, index)}
              onkeydown={(e) => handleActivationKey(e, () => handleTrackClick(item, index))}
              ondragstart={(e) => handleDragStart(index, e)}
              ondragover={(e) => handleDragOver(index, e)}
              ondrop={(e) => handleDrop(index, e)}
              ondragend={handleDragEnd}
              use:touchDragListeners
              role="button"
              tabindex="0"
              aria-label={`Play ${item.track.title} by ${item.track.artist}`}
            >
              <span class="w-5 text-center text-xs text-text-dim shrink-0">
                {#if index === currentIndex}
                  ▶
                {:else}
                  {index + 1}
                {/if}
              </span>
              <span
                aria-hidden="true"
                data-queue-drag-handle="true"
                class="text-text-dim opacity-60 shrink-0"
                style="touch-action: none;"
              >
                <svg viewBox="0 0 12 12" class="w-3 h-3 fill-current">
                  <circle cx="3" cy="2.5" r="1" />
                  <circle cx="3" cy="6" r="1" />
                  <circle cx="3" cy="9.5" r="1" />
                  <circle cx="9" cy="2.5" r="1" />
                  <circle cx="9" cy="6" r="1" />
                  <circle cx="9" cy="9.5" r="1" />
                </svg>
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

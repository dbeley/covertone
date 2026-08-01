<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue, queueDrawerOpen } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { library } from '$lib/stores/library';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import { toggleFullscreen } from '$lib/utils/fullscreen';
  import LazyImage from '$lib/components/LazyImage.svelte';

  let { onClose = () => {} } = $props<{
    onClose?: () => void;
  }>();

  let status = $derived($player.status);
  let currentTrack = $derived($player.currentTrack);
  let currentTime = $derived($player.currentTime);
  let duration = $derived($player.duration);
  let shuffle = $derived($player.shuffle);
  let favorited = $derived($player.favorited);
  let fullscreen = $derived($settings.fullscreen);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let coverArtUrl = $derived(
    currentTrack?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: currentTrack.coverArt, size: 512 })
      : ''
  );

  let currentMinutes = $derived(Math.floor(currentTime / 60));
  let currentSeconds = $derived(Math.floor(currentTime % 60).toString().padStart(2, '0'));
  let durationMinutes = $derived(Math.floor(duration / 60));
  let durationSeconds = $derived(Math.floor(duration % 60).toString().padStart(2, '0'));

  let dragY = $state(0);
  let dragging = $state(false);
  let startY = $state(0);
  let isPlaying = $derived(status === 'playing');

  function onTouchStart(e: TouchEvent) {
    dragging = true;
    startY = e.touches[0].clientY;
    dragY = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - startY;
    if (delta < 0) return;
    dragY = Math.min(delta, window.innerHeight);
  }

  function onTouchEnd() {
    dragging = false;
    if (dragY > 120) {
      onClose();
    }
    dragY = 0;
  }

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    player.seek(time);
  }

  function handlePrev() {
    player.handlePreviousTrack();
  }

  async function handleNext() {
    const next = await queue.getNextAutoDJ();
    if (next) player.playTrack(next);
  }

  function toggleShuffle() {
    player.setShuffle(!shuffle);
  }

  async function toggleFavorite() {
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

  async function handleToggleFullscreen() {
    await toggleFullscreen();
  }
</script>

<!-- Full-screen overlay -->
<div
  class="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-xl {fullscreen ? 'h-dvh overflow-hidden' : ''}"
  style="transform: translateY({dragY}px); transition: {dragging ? 'none' : 'transform 0.3s ease-out'}"
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  aria-label="Now Playing"
  tabindex="0"
>
  {#if currentTrack?.coverArt}
    {#key currentTrack.coverArt}
      <div class="absolute inset-0 overflow-hidden animate-fade-slow">
        <LazyImage src={coverArtUrl} alt="" class="w-full h-full object-cover blur-[100px] scale-150 opacity-60" />
      </div>
    {/key}
    <div class="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/60 to-bg/95"></div>
  {/if}

  <div class="relative z-10 flex flex-col h-full" style="padding-top: var(--safe-area-inset-top)">
    <!-- Header: close + fullscreen toggle -->
    <div class="flex items-center justify-between px-3 pt-2 pb-0">
      <button
        class="p-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90"
        onclick={onClose}
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
          <polyline points="6,9 12,15 18,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        class="p-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90"
        onclick={handleToggleFullscreen}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {#if fullscreen}
          <!-- Fullscreen exit icon -->
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {:else}
          <!-- Fullscreen enter icon -->
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m10 0h3a2 2 0 002-2v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/if}
      </button>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center px-6 gap-5 overflow-y-auto pb-4">
      {#if currentTrack}
        <!-- Large album art with vinyl effect -->
        <div class="relative">
          <div
            class="w-64 h-64 md:w-72 md:h-72 rounded-full p-[3px] shadow-2xl shadow-black/30"
            class:animate-spin-slow={isPlaying}
            style="animation-play-state: {isPlaying ? 'running' : 'paused'}; background: conic-gradient(from 0deg, var(--accent), var(--text-dim), var(--accent), var(--text-dim), var(--accent));"
          >
            <div class="w-full h-full rounded-full overflow-hidden border-[3px] border-surface">
              <LazyImage
                src={coverArtUrl}
                alt={currentTrack.title}
                class="w-full h-full object-cover"
              />
            </div>
          </div>

          <!-- Center spindle -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md border border-border shadow-lg"></div>
          </div>

          <!-- Outer glow -->
          <div
            class="absolute -inset-6 rounded-full opacity-30 blur-2xl pointer-events-none"
            style="background: radial-gradient(circle, var(--accent) 0%, transparent 70%)"
            class:animate-pulse-slow={isPlaying}
          ></div>
        </div>

        <!-- Track info -->
        <div class="text-center max-w-xs">
          <h1 class="text-xl md:text-2xl font-bold tracking-tight leading-tight">{currentTrack.title}</h1>
          <p class="text-sm md:text-base text-text-dim mt-1.5">
            <button
              class="font-medium hover:text-accent hover:underline transition-colors"
              onclick={(e) => { e.stopPropagation(); router.navigate(`artist/${currentTrack.artistId}`); onClose(); }}
            >
              {currentTrack.artist}
            </button>
            {#if currentTrack.album}
               <span class="mx-1 opacity-50">·</span>
              <button
                class="hover:text-accent hover:underline transition-colors"
                onclick={(e) => { e.stopPropagation(); router.navigate(`album/${currentTrack.albumId}`); onClose(); }}
              >
                {currentTrack.album}
              </button>
            {/if}
          </p>
        </div>

        <!-- Seek bar -->
        <div class="w-full max-w-sm flex flex-col gap-1.5">
          <div class="relative">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              oninput={handleSeek}
              class="jukebox-seek w-full h-1.5 appearance-none rounded-full cursor-pointer"
              style="
                background: linear-gradient(to right, var(--accent) {(duration > 0 ? (currentTime / duration) * 100 : 0)}%, var(--border) {(duration > 0 ? (currentTime / duration) * 100 : 0)}%);
              "
            />
          </div>
          <div class="flex justify-between text-xs text-text-dim/80 font-medium tracking-wide">
            <span>{currentMinutes}:{currentSeconds}</span>
            <span>{durationMinutes}:{durationSeconds}</span>
          </div>
        </div>

        <!-- Main controls -->
        <div class="flex items-center gap-5">
          <button
            class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
            onclick={handlePrev}
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
              <polygon points="19,4 7,12 19,20" />
              <rect x="4" y="4" width="3" height="16" rx="1" />
            </svg>
          </button>

          <button
            class="p-5 bg-accent text-white rounded-full hover:scale-105 active:scale-95 transition-all duration-150 shadow-xl shadow-accent/30"
            onclick={() => player.togglePlay()}
            aria-label={status === 'playing' ? 'Pause' : 'Play'}
          >
            {#if status === 'playing'}
              <svg viewBox="0 0 24 24" class="w-8 h-8 fill-current">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" class="w-8 h-8 fill-current ml-0.5">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            {/if}
          </button>

          <button
            class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
            onclick={handleNext}
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
              <polygon points="5,4 17,12 5,20" />
              <rect x="17" y="4" width="3" height="16" rx="1" />
            </svg>
          </button>
        </div>

        <!-- Secondary controls -->
        <div class="flex items-center gap-5">
          <button
            class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 {shuffle ? 'bg-accent/15 text-accent shadow-sm shadow-accent/10' : 'text-text-dim hover:text-text hover:bg-white/5'}"
            onclick={toggleShuffle}
            aria-label="Shuffle"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
              <path d="M16 3h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 20l16-16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M4 4l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <button
            class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 {favorited ? 'text-accent' : 'text-text-dim hover:text-text hover:bg-white/5'}"
            onclick={toggleFavorite}
            aria-label="Favorite"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          <button
            class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
            onclick={() => { onClose(); queueDrawerOpen.set(true); }}
            aria-label="Queue"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
              <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      {:else}
        <p class="text-text-dim text-lg">Nothing playing</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .jukebox-seek::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 50%, transparent);
    transition: transform 0.15s ease;
  }

  .jukebox-seek::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .jukebox-seek::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 50%, transparent);
  }

  .jukebox-seek::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: transparent;
  }

  .jukebox-seek::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: transparent;
  }
</style>

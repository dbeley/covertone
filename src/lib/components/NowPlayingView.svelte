<script lang="ts">
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';

  let { onClose = () => {}, onQueueOpen = () => {} } = $props<{
    onClose?: () => void;
    onQueueOpen?: () => void;
  }>();

  let status = $derived($player.status);
  let currentTrack = $derived($player.currentTrack);
  let currentTime = $derived($player.currentTime);
  let duration = $derived($player.duration);
  let repeating = $derived($player.repeating);
  let shuffle = $derived($player.shuffle);
  let favorited = $derived($player.favorited);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let coverArtUrl = $derived(
    currentTrack?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: currentTrack.coverArt, size: 256 })
      : ''
  );

  let currentMinutes = $derived(Math.floor(currentTime / 60));
  let currentSeconds = $derived(Math.floor(currentTime % 60).toString().padStart(2, '0'));
  let durationMinutes = $derived(Math.floor(duration / 60));
  let durationSeconds = $derived(Math.floor(duration % 60).toString().padStart(2, '0'));

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    player.seek(time);
  }

  async function handlePrev() {
    const prev = queue.getPrevious();
    if (prev) player.playTrack(prev);
  }

  async function handleNext() {
    const next = await queue.getNextAutoDJ();
    if (next) player.playTrack(next);
  }

  function toggleShuffle() {
    player.setShuffle(!shuffle);
  }

  function toggleRepeat() {
    player.setRepeating(!repeating);
  }

  function toggleFavorite() {
    player.setFavorited(!favorited);
  }
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-xl">
  {#if currentTrack?.coverArt}
    <div class="absolute inset-0 overflow-hidden">
      <img src={coverArtUrl} alt="" class="w-full h-full object-cover blur-3xl scale-150 opacity-30" />
    </div>
    <div class="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg"></div>
  {/if}
  <div class="relative z-10 flex flex-col h-full">
    <button class="p-4 self-start rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90" onclick={onClose} aria-label="Close">
    <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
      <polyline points="6,15 12,9 18,15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <div class="flex-1 flex flex-col items-center justify-center px-6 gap-6 overflow-y-auto">
    {#if currentTrack}
      <img
        src={coverArtUrl}
        alt={currentTrack.title}
        class="w-64 h-64 rounded-2xl object-cover shadow-2xl shadow-black/20 ring-1 ring-border/50"
      />

      <div class="text-center">
        <h1 class="text-xl font-bold">{currentTrack.title}</h1>
        <p class="text-sm text-text-dim mt-1">
          <button class="hover:text-accent hover:underline transition-colors" onclick={(e) => { e.stopPropagation(); router.navigate(`artist/${currentTrack.artistId}`); }}>{currentTrack.artist}</button>
          {#if currentTrack.album}
             · 
            <button class="hover:text-accent hover:underline transition-colors" onclick={(e) => { e.stopPropagation(); router.navigate(`album/${currentTrack.albumId}`); }}>{currentTrack.album}</button>
          {/if}
        </p>
      </div>

      <div class="w-full max-w-md flex flex-col gap-2">
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          oninput={handleSeek}
          class="w-full h-1 appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <div class="flex justify-between text-xs text-text-dim">
          <span>{currentMinutes}:{currentSeconds}</span>
          <span>{durationMinutes}:{durationSeconds}</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 {shuffle ? 'bg-accent/10 text-accent' : 'text-text-dim hover:text-text hover:bg-white/5'}"
          onclick={toggleShuffle}
          aria-label="Shuffle"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <polyline points="17 1 21 5 17 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <polyline points="7 23 3 19 7 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>

        <button
          class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
          onclick={handlePrev}
          aria-label="Previous"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <polygon points="19,4 7,12 19,20" />
            <rect x="4" y="4" width="3" height="16" rx="1" />
          </svg>
        </button>

        <button
          class="p-4 bg-text text-bg rounded-full hover:scale-105 active:scale-95 transition-all duration-150 shadow-lg shadow-black/10"
          onclick={() => player.togglePlay()}
          aria-label={status === 'playing' ? 'Pause' : 'Play'}
        >
          {#if status === 'playing'}
            <svg viewBox="0 0 24 24" class="w-8 h-8 fill-current">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" class="w-8 h-8 fill-current">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          {/if}
        </button>

        <button
          class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 text-text-dim hover:text-text hover:bg-white/5"
          onclick={handleNext}
          aria-label="Next"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <polygon points="5,4 17,12 5,20" />
            <rect x="17" y="4" width="3" height="16" rx="1" />
          </svg>
        </button>

        <button
          class="p-2.5 rounded-xl transition-all duration-150 active:scale-90 {repeating ? 'bg-accent/10 text-accent' : 'text-text-dim hover:text-text hover:bg-white/5'}"
          onclick={toggleRepeat}
          aria-label="Repeat"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <polyline points="17 1 21 5 17 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <polyline points="7 23 3 19 7 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-6">
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
          onclick={onQueueOpen}
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
      <p class="text-text-dim">Nothing playing</p>
    {/if}
    </div>
  </div>
</div>

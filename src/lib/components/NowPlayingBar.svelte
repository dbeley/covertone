<script lang="ts">
  import { player } from '$lib/stores/player';
  import { router } from '$lib/stores/router';
  import { settings } from '$lib/stores/settings';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';

  let { onExpand = () => {}, onQueueOpen = () => {} } = $props<{
    onExpand?: () => void;
    onQueueOpen?: () => void;
  }>();

  let status = $derived($player.status);
  let currentTrack = $derived($player.currentTrack);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let coverArtUrl = $derived(
    currentTrack?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: currentTrack.coverArt, size: 80 })
      : ''
  );
</script>

<div
  class="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border flex items-center px-4 gap-3 cursor-pointer z-50 transition-shadow hover:shadow-lg hover:shadow-black/5"
  onclick={onExpand}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
  role="button"
  tabindex="0"
>
  {#if status !== 'idle' && currentTrack}
    <img src={coverArtUrl} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/50" />
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium truncate">{currentTrack.title}</div>
      <div class="text-xs text-text-dim truncate">
        <button class="hover:text-accent hover:underline transition-colors" onclick={(e) => { e.stopPropagation(); router.navigate(`artist/${currentTrack.artistId}`); }}>{currentTrack.artist}</button>
      </div>
    </div>
    <button
      class="p-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-text active:scale-90 transition-all duration-150 shrink-0"
      onclick={(e) => { e.stopPropagation(); player.togglePlay(); }}
      aria-label={status === 'playing' ? 'Pause' : 'Play'}
    >
      {#if status === 'playing'}
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <polygon points="6,4 20,12 6,20" />
        </svg>
      {/if}
    </button>
    <button
      class="p-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-text active:scale-90 transition-all duration-150 shrink-0"
      onclick={(e) => { e.stopPropagation(); onQueueOpen(); }}
      aria-label="Queue"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
        <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  {:else}
    <span class="text-sm text-text-dim">Nothing playing</span>
  {/if}
</div>

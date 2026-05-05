<script lang="ts">
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';

  let { onExpand = () => {} }: { onExpand?: () => void } = $props();

  let touchStartY = $state(0);

  function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 40) onExpand();
  }

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

{#if currentTrack}
  <div
    class="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border flex items-center px-4 gap-3 cursor-pointer z-50 transition-shadow hover:shadow-lg hover:shadow-black/5"
    onclick={onExpand}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="button"
    tabindex="0"
  >
    <img src={coverArtUrl} alt="" class="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/50" />
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium truncate">{currentTrack.title}</div>
      <div class="text-xs text-text-dim truncate">{currentTrack.artist}</div>
    </div>
  </div>
{/if}

<script lang="ts">
  import { router } from '$lib/stores/router';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import type { Album } from '$lib/api/types';

  let { album, coverArtUrl }: { album: Album; coverArtUrl: string } = $props();

  function open() {
    router.navigate(`album/${album.id}`);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  }
</script>

<div
  class="cursor-pointer group rounded-xl border border-border bg-surface hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 overflow-hidden active:scale-[0.98]"
  onclick={open}
  onkeydown={onKeydown}
  role="button"
  tabindex="0"
  aria-label={`Open album ${album.name}`}
>
  <div class="aspect-square overflow-hidden">
    <LazyImage
      src={coverArtUrl}
      alt={album.name}
      loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  </div>
  <div class="p-2.5">
    <p class="text-sm font-medium truncate text-text">{album.name}</p>
    <p class="text-xs text-text-dim truncate mt-0.5">{album.artist}</p>
  </div>
</div>

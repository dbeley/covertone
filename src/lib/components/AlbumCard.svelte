<script lang="ts">
  import { router } from '$lib/stores/router';
  import type { Album } from '$lib/api/types';

  let { album, coverArtUrl }: { album: Album; coverArtUrl: string } = $props();
</script>

<div
  class="cursor-pointer group rounded-xl border border-border bg-surface hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 overflow-hidden active:scale-[0.98]"
  onclick={() => router.navigate(`album/${album.id}`)}
  role="button"
  tabindex="0"
>
  <div class="aspect-square overflow-hidden">
    <img
      src={coverArtUrl}
      alt={album.name}
      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  </div>
  <div class="p-2.5">
    <p class="text-sm font-medium truncate text-text">{album.name}</p>
    <p class="text-xs text-text-dim truncate mt-0.5">{album.artist}</p>
  </div>
</div>

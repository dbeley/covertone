<script lang="ts">
  import { router } from '$lib/stores/router';
  import type { Album } from '$lib/api/types';

  let { album, coverArtUrl }: { album: Album; coverArtUrl: string } = $props();
</script>

<div
  class="cursor-pointer group"
  onclick={() => router.navigate(`album/${album.id}`)}
  role="button"
  tabindex="0"
>
  <div class="aspect-square rounded-lg overflow-hidden mb-2">
    <img
      src={coverArtUrl}
      alt={album.name}
      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  </div>
  <div class="px-1">
    <p class="text-sm font-medium truncate">{album.name}</p>
    <p class="text-xs text-text-dim truncate">{album.artist}</p>
  </div>
</div>

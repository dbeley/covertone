<script lang="ts">
  import { router } from '$lib/stores/router';
  import type { Artist } from '$lib/api/types';

  let { artist, coverArtUrl }: { artist: Artist; coverArtUrl: string } = $props();
</script>

<div
  class="cursor-pointer group flex flex-col items-center gap-2 text-center transition-all duration-200 active:scale-95"
  onclick={() => router.navigate(`artist/${artist.id}`)}
  role="button"
  tabindex="0"
>
  <div class="w-24 h-24 rounded-full overflow-hidden ring-1 ring-border group-hover:ring-accent/30 transition-all duration-300">
    <img
      src={coverArtUrl}
      alt={artist.name}
      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  </div>
  <p class="text-sm font-medium truncate w-24 text-text group-hover:text-accent transition-colors">{artist.name}</p>
</div>

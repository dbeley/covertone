<script lang="ts">
  import { router } from '$lib/stores/router';
  import type { Artist } from '$lib/api/types';

  let { artist, coverArtUrl }: { artist: Artist; coverArtUrl: string } = $props();
</script>

<div
  class="cursor-pointer group flex flex-col items-center gap-2 text-center"
  onclick={() => router.navigate(`artist/${artist.id}`)}
  role="button"
  tabindex="0"
>
  <div class="w-24 h-24 rounded-full overflow-hidden">
    <img
      src={coverArtUrl}
      alt={artist.name}
      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  </div>
  <p class="text-sm font-medium truncate w-24">{artist.name}</p>
</div>

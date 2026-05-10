<script lang="ts">
  import AlbumCard from './AlbumCard.svelte';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import type { Album } from '$lib/api/types';

  let { albums, serverUrl, username, password }: {
    albums: Album[];
    serverUrl: string;
    username: string;
    password: string;
  } = $props();

  function coverUrl(album: Album): string {
    if (!album.coverArt) return '';
    return getCoverArtUrl({ server: serverUrl, username, password, id: album.coverArt, size: 256 });
  }
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
  {#each albums as album, i (album.id + i)}
    <AlbumCard album={album} coverArtUrl={coverUrl(album)} {serverUrl} {username} {password} />
  {/each}
</div>

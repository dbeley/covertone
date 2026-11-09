<script lang="ts">
  import AlbumCard from './AlbumCard.svelte';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import type { Album } from '$lib/api/types';

  let { albums, serverUrl, username, password, maxRows }: {
    albums: Album[];
    serverUrl: string;
    username: string;
    password: string;
    /** When set, only render enough albums to fill this many rows. */
    maxRows?: number;
  } = $props();

  let gridEl = $state<HTMLDivElement>();
  let columnCount = $state(0);

  // Measure the grid's own track count instead of mirroring the Tailwind
  // breakpoints by hand: the CSS stays the single source of truth.
  $effect(() => {
    const el = gridEl;
    if (!el || !maxRows) return;

    const measure = () => {
      const n = window
        .getComputedStyle(el)
        .gridTemplateColumns.split(' ')
        .filter(Boolean).length;
      columnCount = n > 0 ? n : 1;
    };

    measure();
    if (typeof window.ResizeObserver === 'undefined') return;
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  let visibleAlbums = $derived(
    maxRows && columnCount > 0 ? albums.slice(0, columnCount * maxRows) : albums,
  );

  function coverUrl(album: Album): string {
    if (!album.coverArt) return '';
    return getCoverArtUrl({ server: serverUrl, username, password, id: album.coverArt, size: 256 });
  }
</script>

<div
  class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3"
  bind:this={gridEl}
>
  {#each visibleAlbums as album (album.id)}
    <AlbumCard album={album} coverArtUrl={coverUrl(album)} {serverUrl} {username} {password} />
  {/each}
</div>

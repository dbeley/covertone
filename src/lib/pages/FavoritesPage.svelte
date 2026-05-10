<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '$lib/stores/settings';
  import { player } from '$lib/stores/player';
  import { queue } from '$lib/stores/queue';
  import { router } from '$lib/stores/router';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import AlbumGrid from '$lib/components/AlbumGrid.svelte';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import type { Artist, Album, Song } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);

  let artists = $state<Artist[]>([]);
  let albums = $state<Album[]>([]);
  let songs = $state<Song[]>([]);
  let loading = $state(true);

  onMount(async () => {
    if (!configured) { loading = false; return; }
    try {
      const api = new SubsonicAPI({ server: serverUrl, username, password });
      const result = await api.getStarred();
      artists = result.starred?.artist ?? [];
      albums = result.starred?.album ?? [];
      songs = result.starred?.song ?? [];
    } catch {
      // silent
    }
    loading = false;
  });

  function playSong(song: Song) {
    queue.replaceAll(songs);
    queue.playIndex(songs.indexOf(song));
    player.playTrack(song);
  }

  function artistImageUrl(artist: Artist): string {
    if (artist.artistImageUrl) return artist.artistImageUrl;
    if (artist.coverArt) return getCoverArtUrl({ server: serverUrl, username, password, id: artist.coverArt, size: 200 });
    return '';
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-6 tracking-tight">Favorites</h2>

  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if artists.length === 0 && albums.length === 0 && songs.length === 0}
    <p class="text-text-dim text-center py-16">No starred items yet. Star albums, artists, or songs to see them here.</p>
  {:else}
    {#if artists.length > 0}
      <section class="mb-8">
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Artists</h3>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {#each artists as artist (artist.id)}
            <div
              class="cursor-pointer group flex flex-col items-center gap-1.5 text-center transition-all duration-200 active:scale-95"
              onclick={() => router.navigate(`artist/${artist.id}`)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.navigate(`artist/${artist.id}`); }}}
              role="button"
              tabindex="0"
              aria-label={`Open artist ${artist.name}`}
            >
              <div class="w-20 h-20 rounded-full overflow-hidden ring-1 ring-border group-hover:ring-accent/30 transition-all duration-300 bg-surface">
                <LazyImage
                  src={artistImageUrl(artist)}
                  alt={artist.name}
                  loading="lazy"
                  decoding="async"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p class="text-xs font-medium truncate w-20 text-text group-hover:text-accent transition-colors leading-tight">{artist.name}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if albums.length > 0}
      <section class="mb-8">
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Albums</h3>
        <AlbumGrid {albums} {serverUrl} {username} {password} />
      </section>
    {/if}

    {#if songs.length > 0}
      <section>
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Songs</h3>
        <div class="border border-border rounded-xl overflow-hidden bg-surface/50">
          {#each songs as song (song.id)}
            <div
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/[0.04] transition-colors group border-b border-border/50 last:border-b-0"
              onclick={() => playSong(song)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playSong(song); }}}
              role="button"
              tabindex="0"
              aria-label={`Play ${song.title}`}
            >
              <LazyImage
                src={song.coverArt ? getCoverArtUrl({ server: serverUrl, username, password, id: song.coverArt, size: 40 }) : ''}
                alt=""
                loading="lazy"
                decoding="async"
                class="w-8 h-8 rounded object-cover shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{song.title}</div>
                <div class="text-xs text-text-dim truncate">{song.artist} · {song.album}</div>
              </div>
              <span class="text-xs text-text-dim">{formatDuration(song.duration)}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

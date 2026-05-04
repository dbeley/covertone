<script lang="ts">
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import type { Artist, Album, Song } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let query = $state('');
  let artists = $state<Artist[]>([]);
  let albums = $state<Album[]>([]);
  let songs = $state<Song[]>([]);
  let searching = $state(false);
  let hasSearched = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout>;

  function coverUrl(id: string, size: number): string {
    if (!id) return '';
    return getCoverArtUrl({ server: serverUrl, username, password, id, size });
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    query = value;
    clearTimeout(debounceTimer);

    if (value.length < 2) {
      artists = [];
      albums = [];
      songs = [];
      hasSearched = false;
      return;
    }

    debounceTimer = setTimeout(() => performSearch(value), 300);
  }

  async function performSearch(q: string) {
    searching = true;
    hasSearched = true;

    try {
      const api = new SubsonicAPI({ server: serverUrl, username, password });
      const result = await api.search3({ query: q, artistCount: 10, albumCount: 10, songCount: 20 });
      artists = result.searchResult3.artist ?? [];
      albums = result.searchResult3.album ?? [];
      songs = result.searchResult3.song ?? [];
    } catch {
      artists = [];
      albums = [];
      songs = [];
    }

    searching = false;
  }

  function playSong(song: Song) {
    player.playTrack(song);
  }
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-6 tracking-tight">Search</h2>

  <input
    type="text"
    placeholder="Search albums, artists, songs..."
    oninput={handleInput}
    class="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all duration-150 mb-6"
  />

  {#if searching}
    <p class="text-text-dim">Searching...</p>
  {:else if hasSearched && artists.length === 0 && albums.length === 0 && songs.length === 0}
    <p class="text-text-dim">No results for "{query}"</p>
  {:else}
    {#if artists.length > 0}
      <section class="mb-8">
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Artists</h3>
        <div class="flex gap-4 overflow-x-auto pb-2">
          {#each artists as artist (artist.id)}
            <div
              class="cursor-pointer group flex flex-col items-center gap-2 text-center shrink-0"
              onclick={() => router.navigate(`artist/${artist.id}`)}
              role="button"
              tabindex="0"
            >
              <div class="w-20 h-20 rounded-full overflow-hidden">
                <img
                  src={coverUrl(artist.coverArt ?? '', 128)}
                  alt={artist.name}
                  loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p class="text-xs font-medium truncate w-20">{artist.name}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if albums.length > 0}
      <section class="mb-8">
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Albums</h3>
        <div class="flex gap-4 overflow-x-auto pb-2">
          {#each albums as album (album.id)}
            <div
              class="cursor-pointer group shrink-0"
              onclick={() => router.navigate(`album/${album.id}`)}
              role="button"
              tabindex="0"
            >
              <div class="w-32 h-32 rounded-lg overflow-hidden mb-1">
                <img
                  src={coverUrl(album.coverArt, 192)}
                  alt={album.name}
                  loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p class="text-xs font-medium truncate w-32">{album.name}</p>
              <p class="text-xs text-text-dim truncate w-32">{album.artist}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if songs.length > 0}
      <section>
        <h3 class="text-lg font-semibold mb-3 tracking-tight">Songs</h3>
        <div class="space-y-1">
          {#each songs as song (song.id)}
            <div
              class="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
              onclick={() => playSong(song)}
              role="button"
              tabindex="0"
            >
              <img
                src={coverUrl(song.coverArt ?? '', 40)}
                alt=""
                loading="lazy" decoding="async" class="w-8 h-8 rounded object-cover shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{song.title}</div>
                <div class="text-xs text-text-dim truncate">{song.artist} · {song.album}</div>
              </div>
              <span class="text-xs text-text-dim shrink-0">{formatDuration(song.duration)}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

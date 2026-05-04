<script lang="ts">
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import AlbumGrid from '$lib/components/AlbumGrid.svelte';
  import type { Song, Artist, Album } from '$lib/api/types';

  let artistId = $derived($router.params.id);

  let artist = $state<Artist | null>(null);
  let topSongs = $state<Song[]>([]);
  let biography = $state('');
  let albums = $state<Album[]>([]);
  let similarArtists = $state<Artist[]>([]);
  let loading = $state(true);
  let error = $state('');

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let coverArtUrl = $derived(
    artist?.coverArt
      ? getCoverArtUrl({ server: serverUrl, username, password, id: artist.coverArt, size: 192 })
      : ''
  );

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  $effect(() => {
    if (!$settings.isConfigured) { loading = false; return; }

    const id = artistId;
    const srv = serverUrl;
    const usr = username;
    const pwd = password;

    loading = true;
    error = '';
    artist = null;
    topSongs = [];
    biography = '';
    albums = [];
    similarArtists = [];

    let cancelled = false;

    (async () => {
      const api = new SubsonicAPI({ server: srv, username: usr, password: pwd });

      try {
        const artistData = await api.getArtist({ id });
        if (cancelled) return;
        artist = {
          id: artistData.artist.id,
          name: artistData.artist.name,
          coverArt: artistData.artist.album?.[0]?.coverArt,
          albumCount: artistData.artist.album?.length ?? 0,
        };
        albums = artistData.artist.album.map(a => ({
          ...a,
          artistId: id,
          artist: artistData.artist.name,
          songCount: 0,
          duration: 0,
        }));
      } catch (e) {
        if (!cancelled) error = (e as Error).message;
      }

      try {
        const topData = await api.getTopSongs({ artist: artist?.name ?? '' });
        if (!cancelled) topSongs = topData.topSongs.song.slice(0, 10);
      } catch { /* ignore */ }

      try {
        const infoData = await api.getArtistInfo({ id });
        if (!cancelled) {
          biography = infoData.artistInfo2.biography ?? '';
          similarArtists = (infoData.artistInfo2.similarArtist ?? []).map(s => ({
            id: s.id,
            name: s.name,
            artistImageUrl: s.artistImageUrl,
          }));
        }
      } catch { /* ignore */ }

      if (!cancelled) loading = false;
    })();

    return () => { cancelled = true; };
  });
</script>

<div class="p-6">
  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error && !artist}
    <p class="text-red-500">{error}</p>
  {:else if artist}
    <div class="flex flex-col sm:flex-row items-start gap-6 mb-8">
      <img src={coverArtUrl} alt="" loading="lazy" decoding="async" class="w-48 h-48 rounded-full object-cover shadow-xl shadow-black/10 ring-1 ring-border/50" />
      <div class="flex flex-col justify-center gap-1">
        <p class="text-xs text-text-dim uppercase tracking-widest font-medium">Artist</p>
        <h1 class="text-2xl font-bold tracking-tight">{artist.name}</h1>
        {#if artist.albumCount}
          <p class="text-sm text-text-dim">{artist.albumCount} albums</p>
        {/if}
      </div>
    </div>

    {#if biography}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 tracking-tight">Biography</h2>
        <p class="text-sm text-text-dim leading-relaxed whitespace-pre-line bg-surface/50 border border-border rounded-xl p-4">
          {biography.slice(0, 1000)}{biography.length > 1000 ? '...' : ''}
        </p>
      </div>
    {/if}

    {#if topSongs.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 tracking-tight">Top Tracks</h2>
        <div class="border border-border rounded-xl overflow-hidden bg-surface/50">
          {#each topSongs as song, index (song.id)}
            <div
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/[0.04] transition-colors border-b border-border/50 last:border-b-0"
              onclick={() => player.playTrack(song)}
              role="button"
              tabindex="0"
            >
              <span class="w-6 text-center text-xs text-text-dim">{index + 1}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{song.title}</div>
                <div class="text-xs text-text-dim truncate">{song.artist}</div>
              </div>
              <span class="text-xs text-text-dim">{formatDuration(song.duration)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if albums.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 tracking-tight">Albums</h2>
        <AlbumGrid {albums} {serverUrl} {username} {password} />
      </div>
    {/if}

    {#if similarArtists.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 tracking-tight">Similar Artists</h2>
        <div class="flex gap-4 overflow-x-auto pb-2">
          {#each similarArtists as sArtist (sArtist.id)}
            <a
              href="#artist/{encodeURIComponent(sArtist.id)}"
              class="cursor-pointer group flex flex-col items-center gap-1.5 text-center shrink-0 no-underline transition-all duration-200 active:scale-95"
            >
              <div class="w-24 h-24 rounded-full overflow-hidden ring-1 ring-border group-hover:ring-accent/30 transition-all duration-300 bg-surface">
                <img
                  src={sArtist.artistImageUrl ?? ''}
                  alt={sArtist.name}
                  loading="lazy"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <span class="text-sm font-medium truncate w-24 text-text group-hover:text-accent transition-colors">{sArtist.name}</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <p class="text-text-dim">Artist not found</p>
  {/if}
</div>

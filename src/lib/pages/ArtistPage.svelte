<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '$lib/stores/router';
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import AlbumGrid from '$lib/components/AlbumGrid.svelte';
  import ArtistCard from '$lib/components/ArtistCard.svelte';
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
      ? `${serverUrl.replace(/\/$/, '')}/rest/getCoverArt?id=${artist.coverArt}&size=192&u=${username}`
      : ''
  );

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onMount(async () => {
    if (!$settings.isConfigured) { loading = false; return; }

    const api = new SubsonicAPI({ server: $settings.serverUrl, username: $settings.username, password: $settings.password });

    try {
      const artistData = await api.getArtist({ id: artistId });
      artist = {
        id: artistData.artist.id,
        name: artistData.artist.name,
        coverArt: artistData.artist.album?.[0]?.coverArt,
        albumCount: artistData.artist.album?.length ?? 0,
      };
      albums = artistData.artist.album.map(a => ({
        ...a,
        artistId: artistId,
        artist: artistData.artist.name,
        songCount: 0,
        duration: 0,
      }));
    } catch (e) {
      error = (e as Error).message;
    }

    try {
      const topData = await api.getTopSongs({ artist: artist?.name ?? '' });
      topSongs = topData.topSongs.song.slice(0, 10);
    } catch { /* ignore */ }

    try {
      const infoData = await api.getArtistInfo({ id: artistId });
      biography = infoData.artistInfo2.biography ?? '';
      similarArtists = (infoData.artistInfo2.similarArtist ?? []).map(s => ({
        id: s.id,
        name: s.name,
        artistImageUrl: s.artistImageUrl,
      }));
    } catch { /* ignore */ }

    loading = false;
  });
</script>

<div class="p-6">
  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error && !artist}
    <p class="text-red-500">{error}</p>
  {:else if artist}
    <div class="flex items-start gap-6 mb-8">
      <img src={coverArtUrl} alt="" class="w-48 h-48 rounded-full object-cover shadow-lg" />
      <div class="flex flex-col justify-center gap-1">
        <p class="text-xs text-text-dim uppercase tracking-wide">Artist</p>
        <h1 class="text-2xl font-bold">{artist.name}</h1>
        {#if artist.albumCount}
          <p class="text-sm text-text-dim">{artist.albumCount} albums</p>
        {/if}
      </div>
    </div>

    {#if biography}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-2">Biography</h2>
        <p class="text-sm text-text-dim leading-relaxed whitespace-pre-line">
          {biography.slice(0, 1000)}{biography.length > 1000 ? '...' : ''}
        </p>
      </div>
    {/if}

    {#if topSongs.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3">Top Tracks</h2>
        <div class="space-y-1">
          {#each topSongs as song, index}
            <div
              class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
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
        <h2 class="text-lg font-semibold mb-3">Albums</h2>
        <AlbumGrid {albums} {serverUrl} {username} {password} />
      </div>
    {/if}

    {#if similarArtists.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3">Similar Artists</h2>
        <div class="flex gap-4 overflow-x-auto pb-2">
          {#each similarArtists as sArtist}
            <ArtistCard
              artist={{
                id: sArtist.id,
                name: sArtist.name,
                coverArt: sArtist.artistImageUrl,
              }}
              coverArtUrl={sArtist.artistImageUrl
                ? `${serverUrl.replace(/\/$/, '')}/rest/getCoverArt?id=${sArtist.artistImageUrl}&size=128&u=${username}`
                : ''}
            />
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <p class="text-text-dim">Artist not found</p>
  {/if}
</div>

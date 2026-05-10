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

  type Tab = 'albums' | 'artists' | 'songs';
  type SortMode = 'last-starred' | 'a-z' | 'z-a' | 'random';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);

  let allAlbums = $state<Album[]>([]);
  let allArtists = $state<Artist[]>([]);
  let allSongs = $state<Song[]>([]);
  let loading = $state(true);

  let activeTab = $state<Tab>('albums');
  let sortMode = $state<SortMode>('last-starred');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'albums', label: 'Albums' },
    { key: 'artists', label: 'Artists' },
    { key: 'songs', label: 'Songs' },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: 'last-starred', label: 'Last Starred' },
    { key: 'a-z', label: 'A-Z' },
    { key: 'z-a', label: 'Z-A' },
    { key: 'random', label: 'Random' },
  ];

  onMount(async () => {
    if (!configured) { loading = false; return; }
    try {
      const api = new SubsonicAPI({ server: serverUrl, username, password });
      const result = await api.getStarred();
      allAlbums = result.starred?.album ?? [];
      allArtists = result.starred?.artist ?? [];
      allSongs = result.starred?.song ?? [];
    } catch {
      // silent
    }
    loading = false;
  });

  function switchTab(tab: Tab) {
    activeTab = tab;
  }

  function changeSort(e: Event) {
    sortMode = (e.target as HTMLInputElement).value as SortMode;
  }

  function sortBy<T>(
    items: T[],
    getName: (item: T) => string,
    getStarred: (item: T) => string | undefined,
    mode: SortMode,
  ): T[] {
    const sorted = [...items];
    switch (mode) {
      case 'last-starred':
        return sorted.sort((a, b) => new Date(getStarred(b) ?? 0).getTime() - new Date(getStarred(a) ?? 0).getTime());
      case 'a-z':
        return sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
      case 'z-a':
        return sorted.sort((a, b) => getName(b).localeCompare(getName(a)));
      case 'random':
        return sorted.sort(() => Math.random() - 0.5);
    }
  }

  let sortedAlbums = $derived(sortBy(allAlbums, a => a.name, a => a.starred, sortMode));
  let sortedArtists = $derived(sortBy(allArtists, a => a.name, a => a.starred, sortMode));
  let sortedSongs = $derived(sortBy(allSongs, s => s.title, s => s.starred, sortMode));

  function playSong(song: Song) {
    queue.replaceAll(allSongs);
    queue.playIndex(allSongs.indexOf(song));
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
  {:else}
    <div class="flex flex-wrap items-center gap-2 mb-6">
      {#each tabs as tab (tab.key)}
        <button
          class="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border border-border
                 {activeTab === tab.key ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20' : 'text-text-dim hover:text-text hover:border-accent/30'}"
          onclick={() => switchTab(tab.key)}
        >
          {tab.label}
        </button>
      {/each}

      <select
        class="ml-auto px-3 py-2 rounded-xl text-sm bg-surface border border-border text-text-dim hover:text-text hover:border-accent/30 transition-all duration-150 outline-none"
        onchange={changeSort}
        aria-label="Sort order"
      >
        {#each sortOptions as opt (opt.key)}
          <option value={opt.key} selected={sortMode === opt.key}>{opt.label}</option>
        {/each}
      </select>
    </div>

    {#if activeTab === 'albums'}
      {#if allAlbums.length > 0}
        <AlbumGrid albums={sortedAlbums} {serverUrl} {username} {password} />
      {:else if !loading}
        <p class="text-text-dim text-center py-16">No starred albums yet.</p>
      {/if}
    {:else if activeTab === 'artists'}
      {#if allArtists.length > 0}
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {#each sortedArtists as artist (artist.id)}
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
      {:else if !loading}
        <p class="text-text-dim text-center py-16">No starred artists yet.</p>
      {/if}
    {:else if activeTab === 'songs'}
      {#if allSongs.length > 0}
        <div class="border border-border rounded-xl overflow-hidden bg-surface/50">
          {#each sortedSongs as song (song.id)}
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
      {:else if !loading}
        <p class="text-text-dim text-center py-16">No starred songs yet.</p>
      {/if}
    {/if}

  {/if}
</div>

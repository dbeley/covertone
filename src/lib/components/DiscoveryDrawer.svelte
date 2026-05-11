<script lang="ts">
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { discoveryDrawerOpen } from '$lib/stores/discovery';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import { SvelteSet } from 'svelte/reactivity';
  import { fetchSongContext } from '$lib/api/ai';
  import { router } from '$lib/stores/router';
  import AlbumCard from '$lib/components/AlbumCard.svelte';
  import type { Album } from '$lib/api/types';

  let activeTab = $state<'discover' | 'context'>('discover');
  let dragY = $state(0);
  let dragging = $state(false);
  let startY = $state(0);

  let similarAlbums = $state<Album[]>([]);
  let genreAlbums = $state<Album[]>([]);
  let discoverLoading = $state(false);

  let aiContext = $state<string | null>(null);
  let aiLoading = $state(false);
  let aiError = $state<string | null>(null);
  let lastSongId = $state<string | null>(null);

  let currentTrack = $derived($player.currentTrack);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let aiEndpoint = $derived($settings.aiEndpoint);
  let aiKey = $derived($settings.aiKey);
  let aiModel = $derived($settings.aiModel);

  let drawerBottomPadding = $derived('var(--safe-area-inset-bottom)');

  const DRAG_THRESHOLD = 10;
  const CLOSE_THRESHOLD = 100;

  function close() {
    discoveryDrawerOpen.set(false);
  }

  function onTouchStart(e: TouchEvent) {
    dragging = true;
    startY = e.touches[0].clientY;
    dragY = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - startY;
    if (delta < 0) return;
    if (delta < DRAG_THRESHOLD) return;
    dragY = Math.min(delta, window.innerHeight / 2);
  }

  function onTouchEnd() {
    dragging = false;
    if (dragY > CLOSE_THRESHOLD) {
      close();
    }
    dragY = 0;
  }

  $effect(() => {
    if (!$discoveryDrawerOpen) {
      activeTab = 'discover';
    }
  });

  $effect(() => {
    const track = currentTrack;
    if (!track || !$discoveryDrawerOpen || activeTab !== 'discover') return;

    const api = new SubsonicAPI({ server: serverUrl, username, password });
    let cancelled = false;
    discoverLoading = true;

    const promises: Promise<void>[] = [];

    if (track.artistId) {
      promises.push(
        fetchSimilarArtistAlbums(api, track.artistId)
          .then((albums) => {
            if (!cancelled) similarAlbums = albums;
          })
          .catch(() => {
            if (!cancelled) similarAlbums = [];
          })
      );
    } else {
      similarAlbums = [];
    }

    if (track.genre) {
      promises.push(
        fetchGenreAlbums(api, track.genre, track.albumId)
          .then((albums) => {
            if (!cancelled) genreAlbums = albums;
          })
          .catch(() => {
            if (!cancelled) genreAlbums = [];
          })
      );
    } else {
      genreAlbums = [];
    }

    Promise.all(promises).finally(() => {
      if (!cancelled) discoverLoading = false;
    });

    return () => {
      cancelled = true;
    };
  });

  async function fetchSimilarArtistAlbums(api: SubsonicAPI, artistId: string): Promise<Album[]> {
    const info = await api.getArtistInfo({ id: artistId, count: 3 });
    const similarArtists = info.artistInfo2?.similarArtist?.slice(0, 3) ?? [];
    if (similarArtists.length === 0) return [];

    const artists = await Promise.all(similarArtists.map((a) => api.getArtist({ id: a.id })));

    const seen = new SvelteSet<string>();
    const albums: Album[] = [];
    for (const a of artists) {
      for (const album of a.artist.album ?? []) {
        if (!seen.has(album.id)) {
          seen.add(album.id);
          albums.push(album);
        }
      }
      if (albums.length >= 6) break;
    }

    return albums.slice(0, 4);
  }

  async function fetchGenreAlbums(api: SubsonicAPI, genre: string, currentAlbumId: string): Promise<Album[]> {
    const result = await api.getAlbumList({ type: 'byGenre', genre, size: 6 });
    const albums = result.albumList2?.album ?? [];
    return albums.filter((a) => a.id !== currentAlbumId).slice(0, 4);
  }

  function coverUrl(id: string, size = 256): string {
    return getCoverArtUrl({ server: serverUrl, username, password, id, size });
  }

  async function loadAiContext() {
    const track = currentTrack;
    if (!track) return;
    if (!aiKey) {
      aiError = 'No API key configured. Add one in Settings.';
      return;
    }

    const songId = track.id;
    if (songId === lastSongId && aiContext) return;

    aiLoading = true;
    aiError = null;
    aiContext = null;

    try {
      const text = await fetchSongContext(aiEndpoint, aiKey, aiModel, {
        title: track.title,
        artist: track.artist,
        album: track.album,
        year: track.year,
        genre: track.genre,
        track: track.track,
        discNumber: track.discNumber,
        duration: track.duration,
      });
      if (songId === currentTrack?.id) {
        aiContext = text;
        lastSongId = songId;
      }
    } catch (e) {
      if (songId === currentTrack?.id) {
        aiError = e instanceof Error ? e.message : 'Failed to load context';
      }
    } finally {
      if (songId === currentTrack?.id) {
        aiLoading = false;
      }
    }
  }

  $effect(() => {
    if (!$discoveryDrawerOpen || activeTab !== 'context') return;
    if (aiKey) {
      loadAiContext();
    } else {
      aiError = 'No API key configured. Add one in Settings.';
      aiContext = null;
      lastSongId = null;
    }
  });
</script>

<!-- Mobile bottom sheet -->
{#if $discoveryDrawerOpen}
  <div class="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in md:hidden">
    <button
      type="button"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      aria-label="Close"
      onclick={close}
    ></button>
    <div
      class="relative w-full max-w-lg bg-surface border border-border border-b-0 rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl shadow-black/20"
      style="padding-bottom: {drawerBottomPadding}; transform: translateY({dragY}px); transition: {dragging ? 'none' : 'transform 0.3s ease-out'}"
      onclick={(e) => e.stopPropagation()}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
      onkeydown={(e) => { if (e.key === 'Escape') close(); }}
      role="dialog"
      aria-label="Discover"
      tabindex="-1"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div class="flex gap-1">
          <button
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 {activeTab === 'discover' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}"
            onclick={() => activeTab = 'discover'}
          >
            Discover
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 {activeTab === 'context' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}"
            onclick={() => activeTab = 'context'}
          >
            Context
          </button>
        </div>
        <button
          class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90"
          onclick={close}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-1 pb-8">
        {#if !currentTrack}
          <p class="text-sm text-text-dim text-center py-8">No song playing</p>
        {:else if activeTab === 'discover'}
          <div class="px-5 py-4 space-y-6">
            {#if discoverLoading}
              <div class="grid grid-cols-2 gap-2">
              {#each [0, 1, 2] as _i (_i)}
                <div class="animate-pulse">
                  <div class="aspect-square w-full rounded-lg bg-white/5"></div>
                  <div class="h-3 w-32 mt-2 rounded bg-white/5"></div>
                  <div class="h-2.5 w-24 mt-1 rounded bg-white/5"></div>
                </div>
              {/each}
            </div>
            {:else if similarAlbums.length === 0 && genreAlbums.length === 0}
              <p class="text-sm text-text-dim">No recommendations found for this track.</p>
            {:else}
              {#if similarAlbums.length > 0}
                <div>
                  <h4 class="text-sm font-semibold text-text-dim mb-3">From similar artists</h4>
                  <div class="grid grid-cols-2 gap-2">
                    {#each similarAlbums as album (album.id)}
                      <div class="shrink-0 w-40">
                        <AlbumCard {album} coverArtUrl={album.coverArt ? coverUrl(album.coverArt) : ''} {serverUrl} {username} {password} />
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if genreAlbums.length > 0}
                <div>
                  <h4 class="text-sm font-semibold text-text-dim mb-3">Same genre</h4>
                  <div class="grid grid-cols-2 gap-2">
                    {#each genreAlbums as album (album.id)}
                      <div class="shrink-0 w-40">
                        <AlbumCard {album} coverArtUrl={album.coverArt ? coverUrl(album.coverArt) : ''} {serverUrl} {username} {password} />
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="px-5 py-4 space-y-4">
            {#if aiKey && currentTrack}
              <div class="flex justify-end">
                <button
                  class="p-1.5 rounded-lg hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90 disabled:opacity-50"
                  onclick={loadAiContext}
                  disabled={aiLoading}
                  aria-label="Refresh context"
                >
                  <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current {aiLoading ? 'animate-spin' : ''}">
                    <path d="M1 4v6h6M23 20v-6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M20.49 8.49A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15.51" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            {/if}

            {#if !aiKey}
              <p class="text-sm text-text-dim">
                No API key configured.
                <button
                  class="text-accent hover:underline"
                  onclick={() => { close(); router.navigate('/settings'); }}
                >Add one in Settings</button>
              </p>
            {:else if aiLoading}
              <div class="space-y-2 animate-pulse">
                <div class="h-3 w-full rounded bg-white/5"></div>
                <div class="h-3 w-5/6 rounded bg-white/5"></div>
                <div class="h-3 w-4/6 rounded bg-white/5"></div>
              </div>
            {:else if aiError}
              <div class="flex items-start gap-2">
                <p class="text-sm text-red-400">{aiError}</p>
                <button
                  class="text-accent text-sm hover:underline shrink-0"
                  onclick={loadAiContext}
                >Retry</button>
              </div>
            {:else if aiContext}
              <p class="text-sm leading-relaxed text-text">{aiContext}</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Desktop side panel -->
<aside
  class="hidden md:flex flex-col border-l border-border bg-surface overflow-hidden transition-all duration-300 ease-out shrink-0"
  class:w-96={$discoveryDrawerOpen}
  class:w-0={!$discoveryDrawerOpen}
>
  {#if $discoveryDrawerOpen}
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div class="flex gap-1">
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 {activeTab === 'discover' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}"
          onclick={() => activeTab = 'discover'}
        >
          Discover
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 {activeTab === 'context' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}"
          onclick={() => activeTab = 'context'}
        >
          Context
        </button>
      </div>
      <button
        class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90"
        onclick={close}
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="overflow-y-auto flex-1 min-w-0 pb-16">
      {#if !currentTrack}
        <p class="text-sm text-text-dim text-center py-8">No song playing</p>
      {:else if activeTab === 'discover'}
        <div class="px-4 py-4 space-y-6">
          {#if discoverLoading}
            <div class="grid grid-cols-2 gap-2">
              {#each [0, 1, 2] as _i (_i)}
                <div class="animate-pulse">
                  <div class="aspect-square w-full rounded-lg bg-white/5"></div>
                  <div class="h-3 w-32 mt-2 rounded bg-white/5"></div>
                  <div class="h-2.5 w-24 mt-1 rounded bg-white/5"></div>
                </div>
              {/each}
            </div>
          {:else if similarAlbums.length === 0 && genreAlbums.length === 0}
            <p class="text-sm text-text-dim">No recommendations found for this track.</p>
          {:else}
            {#if similarAlbums.length > 0}
              <div>
                <h4 class="text-sm font-semibold text-text-dim mb-3">From similar artists</h4>
                <div class="grid grid-cols-2 gap-2">
                  {#each similarAlbums as album (album.id)}
                    <div class="shrink-0 w-40">
                      <AlbumCard {album} coverArtUrl={album.coverArt ? coverUrl(album.coverArt) : ''} {serverUrl} {username} {password} />
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if genreAlbums.length > 0}
              <div>
                <h4 class="text-sm font-semibold text-text-dim mb-3">Same genre</h4>
                <div class="grid grid-cols-2 gap-2">
                  {#each genreAlbums as album (album.id)}
                    <div class="shrink-0 w-40">
                      <AlbumCard {album} coverArtUrl={album.coverArt ? coverUrl(album.coverArt) : ''} {serverUrl} {username} {password} />
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}
        </div>
      {:else}
        <div class="px-4 py-4 space-y-4">
          {#if aiKey && currentTrack}
            <div class="flex justify-end">
              <button
                class="p-1.5 rounded-lg hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90 disabled:opacity-50"
                onclick={loadAiContext}
                disabled={aiLoading}
                aria-label="Refresh context"
              >
                <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current {aiLoading ? 'animate-spin' : ''}">
                  <path d="M1 4v6h6M23 20v-6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M20.49 8.49A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15.51" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          {/if}

          {#if !aiKey}
            <p class="text-sm text-text-dim">
              No API key configured.
              <button
                class="text-accent hover:underline"
                onclick={() => { close(); router.navigate('/settings'); }}
              >Add one in Settings</button>
            </p>
          {:else if aiLoading}
            <div class="space-y-2 animate-pulse">
              <div class="h-3 w-full rounded bg-white/5"></div>
              <div class="h-3 w-5/6 rounded bg-white/5"></div>
              <div class="h-3 w-4/6 rounded bg-white/5"></div>
            </div>
          {:else if aiError}
            <div class="flex items-start gap-2">
              <p class="text-sm text-red-400">{aiError}</p>
              <button
                class="text-accent text-sm hover:underline shrink-0"
                onclick={loadAiContext}
              >Retry</button>
            </div>
          {:else if aiContext}
            <p class="text-sm leading-relaxed text-text">{aiContext}</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</aside>



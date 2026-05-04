<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { library } from '$lib/stores/library';
  import { settings } from '$lib/stores/settings';
  import { router } from '$lib/stores/router';
  import { getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import type { Artist } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);
  let libInitialized = $derived($library.initialized);

  let artistIndex = $derived($library.artistIndex);
  let loading = $derived($library.loading);

  let searchQuery = $state('');
  let debouncedQuery = $state('');
  let visibleCount = $state(6);

  let debounceTimer: ReturnType<typeof setTimeout>;
  let observer: IntersectionObserver | null = null;
  let destroyed = false;

  function artistImageUrl(artist: Artist): string {
    if (artist.artistImageUrl) return artist.artistImageUrl;
    if (artist.coverArt) return getCoverArtUrl({ server: serverUrl, username, password, id: artist.coverArt, size: 200 });
    return '';
  }

  let availableLetters = $derived(artistIndex.map(g => g.letter));

  let filteredIndex = $derived.by(() => {
    if (!debouncedQuery.trim()) return artistIndex;
    const q = debouncedQuery.toLowerCase();
    return artistIndex
      .map(group => ({
        letter: group.letter,
        artists: group.artists.filter(a => a.name.toLowerCase().includes(q)),
      }))
      .filter(group => group.artists.length > 0);
  });

  let isSearching = $derived(debouncedQuery.trim().length > 0);
  let totalSections = $derived(filteredIndex.length);

  let visibleSections = $derived.by(() => {
    if (isSearching) return filteredIndex;
    return filteredIndex.slice(0, visibleCount);
  });

  let hasMore = $derived(!isSearching && visibleCount < totalSections);

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    searchQuery = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { debouncedQuery = value; }, 150);
  }

  function scrollToLetter(letter: string) {
    searchQuery = '';
    debouncedQuery = '';
    const idx = artistIndex.findIndex(g => g.letter === letter);
    if (idx >= 0 && idx >= visibleCount) {
      visibleCount = idx + 4;
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(`letter-${letter}`);
      if (el) {
        el.scrollIntoView({ block: 'start' });
      }
    });
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    const sentinel = document.getElementById('artist-sentinel');
    if (!sentinel) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !destroyed) {
          visibleCount = Math.min(visibleCount + 4, totalSections);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
  }

  $effect(() => {
    if (artistIndex.length > 0 && !isSearching) {
      requestAnimationFrame(() => setupObserver());
    }
  });

  onMount(() => {
    if (!configured) return;
    if (!libInitialized) {
      library.init({ server: serverUrl, username, password });
    }
    if ($library.artistIndex.length === 0) {
      library.fetchArtists();
    }
  });

  onDestroy(() => {
    destroyed = true;
    if (observer) observer.disconnect();
    observer = null;
  });
</script>

<div class="p-6 h-full flex flex-col">
  <h2 class="text-2xl font-bold mb-4 tracking-tight shrink-0">Artists</h2>

  <input
    type="text"
    placeholder="Filter artists..."
    oninput={handleSearchInput}
    value={searchQuery}
    class="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all duration-150 mb-4 shrink-0"
  />

  {#if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if filteredIndex.length > 0}
    <div class="flex-1 flex min-h-0">
      <div class="flex-1 overflow-y-auto pr-2" id="artist-scroll-container">
        {#each visibleSections as group (group.letter)}
          <div id="letter-{group.letter}" class="mb-8" style="content-visibility: auto; contain-intrinsic-size: auto 320px">
            <h3 class="text-lg font-semibold mb-3 tracking-tight text-accent sticky top-0 bg-bg/90 backdrop-blur-sm py-1 z-10">{group.letter}</h3>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {#each group.artists as artist (artist.id)}
                <div
                  class="cursor-pointer group flex flex-col items-center gap-1.5 text-center transition-all duration-200 active:scale-95"
                  onclick={() => router.navigate(`artist/${artist.id}`)}
                  role="button"
                  tabindex="0"
                >
                  <div class="w-20 h-20 rounded-full overflow-hidden ring-1 ring-border group-hover:ring-accent/30 transition-all duration-300 bg-surface">
                    <img
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
          </div>
        {/each}

        {#if hasMore}
          <div id="artist-sentinel" class="h-20 flex items-center justify-center">
            <p class="text-xs text-text-dim">Scroll for more...</p>
          </div>
        {/if}
      </div>

      {#if availableLetters.length > 1}
        <nav class="hidden md:flex flex-col gap-0.5 items-center px-1.5 py-1 overflow-y-auto shrink-0 text-[11px] font-medium text-text-dim">
          {#each availableLetters as letter (letter)}
            <button
              class="w-6 h-5 flex items-center justify-center rounded hover:bg-accent/10 hover:text-accent transition-colors"
              onclick={() => scrollToLetter(letter)}
            >
              {letter}
            </button>
          {/each}
        </nav>
      {/if}
    </div>
  {:else}
    <p class="text-text-dim">{debouncedQuery ? 'No artists match your search' : 'No artists found'}</p>
  {/if}
</div>

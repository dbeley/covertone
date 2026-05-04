<script lang="ts">
  import NavBar from './NavBar.svelte';
  import NowPlayingBar from './NowPlayingBar.svelte';
  import NowPlayingView from './NowPlayingView.svelte';
  import QueueDrawer from './QueueDrawer.svelte';
  import { router } from '$lib/stores/router';

  import Home from '$lib/pages/Home.svelte';
  import AlbumsPage from '$lib/pages/AlbumsPage.svelte';
  import ArtistsPage from '$lib/pages/ArtistsPage.svelte';
  import AlbumPage from '$lib/pages/AlbumPage.svelte';
  import ArtistPage from '$lib/pages/ArtistPage.svelte';
  import SearchPage from '$lib/pages/SearchPage.svelte';
  import GamePage from '$lib/pages/GamePage.svelte';
  import SettingsPage from '$lib/pages/SettingsPage.svelte';

  let route = $derived($router);

  let nowPlayingOpen = $state(false);
  let queueOpen = $state(false);
  let menuOpen = $state(false);

  function closeMenu() {
    menuOpen = false;
  }
</script>

<div class="h-dvh w-full flex flex-col">
  <div class="flex-1 flex min-h-0">
    <div
      class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden"
      class:opacity-0={!menuOpen}
      class:pointer-events-none={!menuOpen}
      class:opacity-100={menuOpen}
      onclick={closeMenu}
      role="presentation"
    ></div>
    <NavBar mobileOpen={menuOpen} onNavigate={closeMenu} />
    <main class="flex-1 overflow-y-auto pt-12 md:pt-0">
      <button
        class="md:hidden fixed top-3 left-3 z-30 p-2.5 rounded-xl bg-surface/90 backdrop-blur border border-border shadow-lg hover:border-accent/30 transition-all duration-150 active:scale-95"
        onclick={() => { menuOpen = !menuOpen; }}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
          <rect y="4" width="24" height="2" rx="1" />
          <rect y="11" width="24" height="2" rx="1" />
          <rect y="18" width="24" height="2" rx="1" />
        </svg>
      </button>
      {#if route.matches('/')}
        <Home />
      {:else if route.matches('/albums')}
        <AlbumsPage />
      {:else if route.matches('/artists')}
        <ArtistsPage />
      {:else if route.matches('/album/:id')}
        <AlbumPage />
      {:else if route.matches('/artist/:id')}
        <ArtistPage />
      {:else if route.matches('/search')}
        <SearchPage />
      {:else if route.matches('/game')}
        <GamePage />
      {:else if route.matches('/settings')}
        <SettingsPage />
      {:else}
        <div class="p-6"><h2 class="text-2xl font-bold">Not Found</h2></div>
      {/if}
    </main>
  </div>

  <NowPlayingBar
    onExpand={() => { nowPlayingOpen = true; }}
    onQueueOpen={() => { queueOpen = true; }}
  />

  {#if nowPlayingOpen}
    <NowPlayingView
      onClose={() => { nowPlayingOpen = false; }}
      onQueueOpen={() => { queueOpen = true; }}
    />
  {/if}

  <QueueDrawer open={queueOpen} onClose={() => { queueOpen = false; }} />
</div>

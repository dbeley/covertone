<script lang="ts">
  import NavBar from './NavBar.svelte';
  import NowPlayingBar from './NowPlayingBar.svelte';
  import NowPlayingView from './NowPlayingView.svelte';
  import QueueDrawer from './QueueDrawer.svelte';
  import { router } from '$lib/stores/router';
  import { nowPlayingOpen } from '$lib/stores/ui';
  import { player } from '$lib/stores/player';
  import TabBar from './TabBar.svelte';
  import { tabsStore } from '$lib/stores/tabs';
  import { get } from 'svelte/store';
  import { tick } from 'svelte';

  import Home from '$lib/pages/Home.svelte';
  import AlbumsPage from '$lib/pages/AlbumsPage.svelte';
  import ArtistsPage from '$lib/pages/ArtistsPage.svelte';
  import PlaylistsPage from '$lib/pages/PlaylistsPage.svelte';
  import AlbumPage from '$lib/pages/AlbumPage.svelte';
  import ArtistPage from '$lib/pages/ArtistPage.svelte';
  import PlaylistPage from '$lib/pages/PlaylistPage.svelte';
  import SearchPage from '$lib/pages/SearchPage.svelte';
  import GamePage from '$lib/pages/GamePage.svelte';
  import SettingsPage from '$lib/pages/SettingsPage.svelte';

  let route = $derived($router);

  let menuOpen = $state(false);

  let swipeX = $state(0);
  let swiping = $state(false);
  let swipeStartX = $state(0);
  const SWIPE_EDGE = 30;
  const SWIPE_THRESHOLD = 80;

  function onSwipeStart(e: TouchEvent) {
    const x = e.touches[0].clientX;
    if (x > SWIPE_EDGE) return;
    swiping = true;
    swipeStartX = x;
    swipeX = 0;
  }

  function onSwipeMove(e: TouchEvent) {
    if (!swiping) return;
    const delta = e.touches[0].clientX - swipeStartX;
    if (delta < 0) { swipeX = 0; return; }
    swipeX = Math.min(delta, 192);
  }

  function onSwipeEnd() {
    swiping = false;
    if (swipeX > SWIPE_THRESHOLD) {
      menuOpen = true;
    }
    swipeX = 0;
  }

  function closeMenu() {
    menuOpen = false;
  }
  function openNowPlaying() {
    nowPlayingOpen.set(true);
  }
  function closeNowPlaying() {
    nowPlayingOpen.set(false);
  }

  let tabsState = $derived($tabsStore);
  let activeTabId = $derived(tabsState.activeTabId);
  let hasTabs = $derived(tabsState.tabs.length > 0);

  let mainBottomPadding = $derived($player.currentTrack ? '4rem' : '0px');

  let prevActiveTabId: string | null = null;
  let isTabSwitch = false;

  $effect(() => {
    const id = activeTabId;
    if (id === null) { prevActiveTabId = null; return; }

    const state = get(tabsStore);
    const prev = prevActiveTabId;

    if (prev !== null && prev !== id) {
      tabsStore.saveScroll(prev, window.scrollY);
      isTabSwitch = true;
    }

    const tab = state.tabs.find((t) => t.id === id);
    if (tab) {
      window.location.hash = '#' + tab.route;
    }

    prevActiveTabId = id;
  });

  $effect(() => {
    const path = $router.path;
    const state = get(tabsStore);
    if (!state.activeTabId || state.tabs.length === 0) return;

    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab && activeTab.route !== path) {
      tabsStore.updateRoute(state.activeTabId, path);
    }

    if (isTabSwitch) {
      isTabSwitch = false;
      if (activeTab && activeTab.scrollY > 0) {
        tick().then(() => window.scrollTo(0, activeTab.scrollY));
      }
    }
  });
</script>

  <div class="h-dvh w-full flex flex-col" style="padding-top: var(--safe-area-inset-top); padding-bottom: var(--safe-area-inset-bottom)">
{#if hasTabs}
  <TabBar />
{/if}
  <div class="flex-1 flex min-h-0"
    ontouchstart={onSwipeStart}
    ontouchmove={onSwipeMove}
    ontouchend={onSwipeEnd}
    role="presentation"
  >
    <div
      class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden"
      class:opacity-0={!menuOpen && !swiping}
      class:pointer-events-none={!menuOpen}
      class:opacity-100={menuOpen}
      style:opacity={swiping && !menuOpen ? Math.min(swipeX / 192, 1) * 0.5 : undefined}
      onclick={closeMenu}
      role="presentation"
    ></div>
    <NavBar mobileOpen={menuOpen} onNavigate={closeMenu} swipeOffset={swipeX} />
    <main
      class="flex-1 overflow-y-auto pt-12 md:pt-0"
      style:padding-bottom={mainBottomPadding}
    >
      <button
        class="md:hidden fixed left-3 z-30 p-2.5 rounded-xl bg-surface/90 backdrop-blur border border-border shadow-lg hover:border-accent/30 transition-all duration-150 active:scale-95"
        style="top: calc(0.75rem + {hasTabs ? '2.5rem' : '0rem'} + var(--safe-area-inset-top))"
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
      {:else if route.matches('/playlists')}
        <PlaylistsPage />
      {:else if route.matches('/album/:id')}
        <AlbumPage />
      {:else if route.matches('/artist/:id')}
        <ArtistPage />
      {:else if route.matches('/playlist/:id')}
        <PlaylistPage />
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
    <QueueDrawer />
  </div>

  <NowPlayingBar
    onExpand={openNowPlaying}
  />

  {#if $nowPlayingOpen}
    <NowPlayingView
      onClose={closeNowPlaying}
    />
  {/if}

</div>

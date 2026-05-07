<script lang="ts">
  import NavBar from './NavBar.svelte';
  import NowPlayingBar from './NowPlayingBar.svelte';
  import NowPlayingView from './NowPlayingView.svelte';
  import QueueDrawer from './QueueDrawer.svelte';
  import { router } from '$lib/stores/router';

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

  let nowPlayingOpen = $state(false);
  let menuOpen = $state(false);

  let swipeX = $state(0);
  let swiping = $state(false);
  let swipeStartX = $state(0);
  const SWIPE_EDGE = 30;
  const SWIPE_THRESHOLD = 80;
  const PULL_MAX_DISTANCE = 96;
  const PULL_TRIGGER_THRESHOLD = 64;
  const PULL_DIRECTION_TOLERANCE = 6;

  let mainContentEl: HTMLElement | null = null;
  let pullDistance = $state(0);
  let refreshing = $state(false);
  let pullTracking = $state(false);
  let pullEligible = $state(false);
  let pullStartX = $state(0);
  let pullStartY = $state(0);

  let pullReady = $derived(pullDistance >= PULL_TRIGGER_THRESHOLD);
  let pullIndicatorVisible = $derived(pullDistance > 0 || refreshing);
  let pullLabel = $derived(
    refreshing
      ? 'Refreshing...'
      : pullReady
        ? 'Release to refresh'
        : 'Pull to refresh'
  );

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

  function onPullStart(e: TouchEvent) {
    if (refreshing) return;
    const touch = e.touches[0];
    if (!touch) return;

    pullTracking = true;
    pullStartX = touch.clientX;
    pullStartY = touch.clientY;
    pullDistance = 0;

    pullEligible =
      touch.clientX > SWIPE_EDGE &&
      !!mainContentEl &&
      mainContentEl.scrollTop <= 0;
  }

  function onPullMove(e: TouchEvent) {
    if (!pullTracking || !pullEligible || refreshing) return;
    const touch = e.touches[0];
    if (!touch) return;

    if (mainContentEl && mainContentEl.scrollTop > 0) {
      pullEligible = false;
      pullDistance = 0;
      return;
    }

    const deltaX = touch.clientX - pullStartX;
    const deltaY = touch.clientY - pullStartY;

    if (deltaY <= 0) {
      pullDistance = 0;
      return;
    }

    if (Math.abs(deltaY) < PULL_DIRECTION_TOLERANCE) return;

    if (Math.abs(deltaY) <= Math.abs(deltaX)) {
      pullEligible = false;
      pullDistance = 0;
      return;
    }

    pullDistance = Math.min(deltaY * 0.6, PULL_MAX_DISTANCE);
  }

  function onPullEnd() {
    if (!pullTracking) return;

    const shouldRefresh =
      pullEligible &&
      !refreshing &&
      pullDistance >= PULL_TRIGGER_THRESHOLD;

    pullTracking = false;
    pullEligible = false;

    if (shouldRefresh) {
      refreshing = true;
      pullDistance = PULL_TRIGGER_THRESHOLD;
      window.location.reload();
      return;
    }

    pullDistance = 0;
  }

  function onPullCancel() {
    pullTracking = false;
    pullEligible = false;
    if (!refreshing) {
      pullDistance = 0;
    }
  }

  function captureMain(node: HTMLElement) {
    mainContentEl = node;
    return {
      destroy() {
        if (mainContentEl === node) {
          mainContentEl = null;
        }
      }
    };
  }

  function closeMenu() {
    menuOpen = false;
  }
  function openNowPlaying() {
    nowPlayingOpen = true;
  }
  function closeNowPlaying() {
    nowPlayingOpen = false;
  }
</script>

  <div class="h-dvh w-full flex flex-col" style="padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px)); padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))">
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
      use:captureMain
      ontouchstart={onPullStart}
      ontouchmove={onPullMove}
      ontouchend={onPullEnd}
      ontouchcancel={onPullCancel}
    >
      <div
        class="pointer-events-none sticky top-0 z-20 flex justify-center overflow-hidden transition-[height,opacity] duration-150"
        class:opacity-0={!pullIndicatorVisible}
        class:opacity-100={pullIndicatorVisible}
        style:height={`${pullIndicatorVisible ? (refreshing ? PULL_TRIGGER_THRESHOLD : pullDistance) : 0}px`}
      >
        <div role="status" aria-live="polite" class="mt-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/85 px-3 py-1 text-xs shadow-sm backdrop-blur">
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 transition-transform duration-150"
            class:animate-spin={refreshing}
            class:rotate-180={!refreshing && pullReady}
            aria-hidden="true"
          >
            <path
              d="M12 4a8 8 0 1 1-6.32 3.1"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              d="m5 4 .7 3.7L9.4 7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{pullLabel}</span>
        </div>
      </div>
      <button
        class="md:hidden fixed left-3 z-30 p-2.5 rounded-xl bg-surface/90 backdrop-blur border border-border shadow-lg hover:border-accent/30 transition-all duration-150 active:scale-95"
        style="top: calc(0.75rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))"
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

  {#if nowPlayingOpen}
    <NowPlayingView
      onClose={closeNowPlaying}
    />
  {/if}

</div>

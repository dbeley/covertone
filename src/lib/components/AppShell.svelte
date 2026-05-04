<script lang="ts">
  import NavBar from './NavBar.svelte';
  import { router } from '$lib/stores/router';

  import Home from '$lib/pages/Home.svelte';
  import AlbumsPage from '$lib/pages/AlbumsPage.svelte';
  import ArtistsPage from '$lib/pages/ArtistsPage.svelte';
  import SearchPage from '$lib/pages/SearchPage.svelte';
  import GamePage from '$lib/pages/GamePage.svelte';
  import SettingsPage from '$lib/pages/SettingsPage.svelte';

  let route = $derived($router);
</script>

<div class="h-dvh w-full flex">
  <NavBar />
  <main class="flex-1 overflow-y-auto">
    {#if route.matches('/')}
      <Home />
    {:else if route.matches('/albums')}
      <AlbumsPage />
    {:else if route.matches('/artists')}
      <ArtistsPage />
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

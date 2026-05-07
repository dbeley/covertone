<script lang="ts">
  import { router } from '$lib/stores/router';
  import { tabsStore } from '$lib/stores/tabs';

  let { mobileOpen = false, onNavigate = () => {}, swipeOffset = 0 }: { mobileOpen?: boolean; onNavigate?: () => void; swipeOffset?: number } = $props();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/albums', label: 'Albums' },
    { path: '/artists', label: 'Artists' },
    { path: '/playlists', label: 'Playlists' },
    { path: '/search', label: 'Search' },
    { path: '/game', label: 'Game' },
    { path: '/settings', label: 'Settings' },
  ];

  let state = $derived($tabsStore);
  let currentPath = $derived($router.path);
  let atMax = $derived(state.tabs.length >= 10);

  function handleClick(itemPath: string) {
    router.navigate(itemPath);
    onNavigate();
  }
</script>

<nav
  class="h-full flex flex-col gap-0.5 p-3 bg-surface border-r border-border w-48
         fixed md:relative inset-y-0 left-0 z-40
         transition-transform duration-300 ease-in-out
         {mobileOpen && !swipeOffset ? 'translate-x-0' : (!mobileOpen && !swipeOffset ? '-translate-x-full md:translate-x-0' : '')}"
  style="padding-top: calc(0.75rem + env(safe-area-inset-top, 0px)); {swipeOffset ? `transform: translateX(${swipeOffset - 192}px)` : ''}"
>
  <h1 class="text-lg font-bold px-3 py-2.5 mb-4 text-accent tracking-tight">Covertone</h1>
  {#each navItems as item (item.path)}
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
             {currentPath === item.path ? 'bg-accent/10 text-accent ring-1 ring-accent/20' : 'text-text-dim hover:text-text hover:bg-white/5'}"
      onclick={() => handleClick(item.path)}
    >
      {item.label}
    </button>
  {/each}
  <div class="mt-auto pt-2 border-t border-border">
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-text hover:bg-white/5 transition-all duration-150 flex items-center gap-2"
      onclick={() => { if (!atMax) tabsStore.createTab($router.path); }}
      title={atMax ? 'Maximum 10 tabs' : ''}
    >
      <svg viewBox="0 0 16 16" class="w-4 h-4 shrink-0">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
      Create a new tab
    </button>
  </div>
</nav>

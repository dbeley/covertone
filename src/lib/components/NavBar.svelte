<script lang="ts">
  import { router } from '$lib/stores/router';
  import { tabsStore } from '$lib/stores/tabs';
  import { player } from '$lib/stores/player';
  import { discoveryDrawerOpen } from '$lib/stores/discovery';
  import { shortcutsModalOpen } from '$lib/stores/ui';

  let { mobileOpen = false, onNavigate = () => {}, swipeOffset = 0 }: { mobileOpen?: boolean; onNavigate?: () => void; swipeOffset?: number } = $props();

  let currentTrack = $derived($player.currentTrack);
  let navBottomPad = $derived(
    currentTrack
      ? `calc(0.75rem + 4rem + var(--safe-area-inset-bottom))`
      : `calc(0.75rem + var(--safe-area-inset-bottom))`
  );

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/albums', label: 'Albums' },
    { path: '/artists', label: 'Artists' },
    { path: '/playlists', label: 'Playlists' },
    { path: '/favorites', label: 'Favorites' },
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
  class="h-full flex flex-col gap-0.5 p-3 w-48
         fixed md:relative inset-y-0 left-0 z-40
         transition-transform duration-300 ease-in-out
         {mobileOpen && !swipeOffset ? 'translate-x-0' : (!mobileOpen && !swipeOffset ? '-translate-x-full md:translate-x-0' : '')}"
  style="padding-top: calc(0.75rem + var(--safe-area-inset-top)); padding-bottom: {navBottomPad}; {swipeOffset ? `transform: translateX(${swipeOffset - 192}px)` : ''};
         background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
         border-right: 1px solid var(--border-color);"
>
  <h1 class="text-lg font-bold px-3 py-2.5 mb-4 font-display tracking-tight" style="background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Covertone</h1>
  {#each navItems as item (item.path)}
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
             {currentPath === item.path ? 'text-accent font-semibold' : 'text-text-dim hover:text-text'}"
      style={currentPath === item.path ? `background: color-mix(in srgb, var(--accent) 12%, transparent);` : ''}
      onclick={() => handleClick(item.path)}
    >
      {item.label}
    </button>
  {/each}
  <div class="mt-auto pt-2 border-t border-border space-y-0.5">
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-text hover:bg-white/5 transition-all duration-150 flex items-center gap-2"
      onclick={() => shortcutsModalOpen.update(v => !v)}
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" />
      </svg>
      Shortcuts
    </button>
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-text hover:bg-white/5 transition-all duration-150 flex items-center gap-2"
      onclick={() => discoveryDrawerOpen.update(v => !v)}
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      Discover
    </button>
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

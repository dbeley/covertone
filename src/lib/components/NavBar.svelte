<script lang="ts">
  import { router } from '$lib/stores/router';

  let { mobileOpen = false, onNavigate = () => {} }: { mobileOpen?: boolean; onNavigate?: () => void } = $props();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/albums', label: 'Albums' },
    { path: '/artists', label: 'Artists' },
    { path: '/search', label: 'Search' },
    { path: '/game', label: 'Game' },
    { path: '/settings', label: 'Settings' },
  ];

  let currentPath = $derived($router.path);

  function handleClick(itemPath: string) {
    router.navigate(itemPath);
    onNavigate();
  }
</script>

<nav
  class="h-full flex flex-col gap-0.5 p-3 bg-surface border-r border-border w-48
         fixed md:relative inset-y-0 left-0 z-40
         transition-transform duration-300 ease-in-out
         {mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}"
>
  <h1 class="text-lg font-bold px-3 py-2.5 mb-4 text-accent tracking-tight">Covertone</h1>
  {#each navItems as item}
    <button
      class="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
             {currentPath === item.path ? 'bg-accent/10 text-accent ring-1 ring-accent/20' : 'text-text-dim hover:text-text hover:bg-white/5'}"
      onclick={() => handleClick(item.path)}
    >
      {item.label}
    </button>
  {/each}
</nav>

<script lang="ts">
  import { router } from '$lib/stores/router';

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/albums', label: 'Albums' },
    { path: '/artists', label: 'Artists' },
    { path: '/search', label: 'Search' },
    { path: '/game', label: 'Game' },
    { path: '/settings', label: 'Settings' },
  ];

  let currentPath = $derived($router.path);
</script>

<nav class="h-full flex flex-col gap-1 p-3 bg-surface border-r border-white/5 w-48">
  <h1 class="text-lg font-bold px-3 py-2 mb-4 text-accent">Covertone</h1>
  {#each navItems as item}
    <button
      class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
             {currentPath === item.path ? 'bg-accent/20 text-accent' : 'text-text-dim hover:text-text hover:bg-white/5'}"
      onclick={() => router.navigate(item.path)}
    >
      {item.label}
    </button>
  {/each}
</nav>

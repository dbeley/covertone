<script lang="ts">
  import { tabsStore } from "$lib/stores/tabs";

  let state = $derived($tabsStore);
  let tabs = $derived(state.tabs);
  let activeTabId = $derived(state.activeTabId);

  function handleTabClick(id: string) {
    tabsStore.activateTab(id);
  }

  function handleTabClose(e: Event, id: string) {
    e.stopPropagation();
    tabsStore.closeTab(id);
  }

  function handleNewTab() {
    tabsStore.createTab();
  }
</script>

{#if tabs.length > 0}
  <div
    class="flex items-center gap-0.5 h-10 px-2 bg-surface border-b border-border overflow-x-auto"
    style="scrollbar-width: none;"
  >
    {#each tabs as tab (tab.id)}
      <button
        class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150 shrink-0 max-w-[140px]
               {tab.id === activeTabId
                 ? "bg-accent/10 text-accent ring-1 ring-accent/20 font-medium"
                 : "text-text-dim hover:text-text hover:bg-white/5"}"
        onclick={() => handleTabClick(tab.id)}
      >
        <span class="truncate">{tab.title}</span>
        <svg
          viewBox="0 0 16 16"
          class="w-3.5 h-3.5 shrink-0 opacity-50 hover:opacity-100"
          onclick={(e) => handleTabClose(e, tab.id)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabClose(e, tab.id); }}
          role="button"
          tabindex="-1"
          aria-label="Close tab"
        >
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none" />
        </svg>
      </button>
    {/each}
    <button
      class="shrink-0 p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-white/5 transition-colors"
      onclick={handleNewTab}
      aria-label="Create new tab"
    >
      <svg viewBox="0 0 16 16" class="w-4 h-4">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </button>
  </div>
{/if}

<script lang="ts">
  import { tabsStore } from "$lib/stores/tabs";

  let state = $derived($tabsStore);
  let tabs = $derived(state.tabs);
  let activeTabId = $derived(state.activeTabId);

  function handleTabAction(e: MouseEvent | KeyboardEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-tab-close]')) {
      tabsStore.closeTab(id);
    } else {
      tabsStore.activateTab(id);
    }
  }
</script>

{#if tabs.length > 0}
  <div
    class="flex items-center gap-0.5 h-10 px-2 bg-nav backdrop-blur-xl border-b border-surface overflow-x-auto"
    style="scrollbar-width: none;"
  >
    {#each tabs as tab (tab.id)}
      <button
        class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150 shrink-0 max-w-[140px]
               {tab.id === activeTabId
                 ? "bg-accent/10 text-accent border border-accent/10 font-medium"
                 : "text-text-dim hover:text-text hover:bg-white/[0.03]"}"
        onclick={(e) => handleTabAction(e, tab.id)}
      >
        <span class="truncate">{tab.title}</span>
        <span
          data-tab-close
          role="button"
          tabindex="0"
          data-nav-ignore
          class="flex items-center justify-center w-4 h-4 rounded hover:bg-white/[0.06] cursor-pointer"
          aria-label="Close tab"
          onclick={(e) => { e.stopPropagation(); tabsStore.closeTab(tab.id); }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); tabsStore.closeTab(tab.id); } }}
        >
          <svg viewBox="0 0 16 16" class="w-3 h-3">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none" />
          </svg>
        </span>
      </button>
    {/each}
  </div>
{/if}

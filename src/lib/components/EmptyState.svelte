<script lang="ts">
  let {
    icon = "default",
    title = "",
    message = "",
    action = undefined as { label: string; onclick: () => void } | undefined,
  } = $props();
</script>

<div class="flex flex-col items-center justify-center py-20 text-center px-6 animate-fade-in">
  {#if icon === "empty"}
    <svg viewBox="0 0 24 24" class="w-14 h-14 text-text-dim/40 mb-4 fill-current">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M3 9h18" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  {:else if icon === "error"}
    <svg viewBox="0 0 24 24" class="w-14 h-14 text-text-dim/40 mb-4 fill-current">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 8v4M12 16h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  {:else if icon === "loading"}
    <svg viewBox="0 0 24 24" class="w-14 h-14 text-text-dim/40 mb-4 fill-current">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4" stroke-linecap="round" class="animate-spin"/>
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" class="w-14 h-14 text-text-dim/40 mb-4 fill-current">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  {/if}
  {#if title}
    <h3 class="text-lg font-semibold mb-1.5 text-text-dim">{title}</h3>
  {/if}
  {#if message}
    <p class="text-sm text-text-dim/70 max-w-xs">{message}</p>
  {/if}
  {#if action}
    <button
      class="mt-6 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
      onclick={action.onclick}
    >
      {action.label}
    </button>
  {/if}
</div>

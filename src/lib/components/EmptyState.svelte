<script lang="ts">
  import { fadeIn } from "$lib/utils/transitions";

  let {
    icon = "default",
    title = "",
    message = "",
    action = undefined as { label: string; onclick: () => void } | undefined,
  } = $props();

  // Simple SVG icons
  const icons: Record<string, string> = {
    default: `<svg viewBox="0 0 24 24" class="w-12 h-12 fill-current" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    empty: `<svg viewBox="0 0 24 24" class="w-12 h-12 fill-current" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 8h16" stroke="currentColor" stroke-width="1.5"/></svg>`,
    error: `<svg viewBox="0 0 24 24" class="w-12 h-12 fill-current" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4M12 16h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    loading: `<svg viewBox="0 0 24 24" class="w-12 h-12 fill-current animate-spin" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>`,
  };
</script>

{#key title}
<div
  class="flex flex-col items-center justify-center py-20 text-center px-6"
  transition:fadeIn
>
  <div
    class="mb-4 text-text-dim/50"
    role="img"
    aria-label={title || message || "status"}
  >
    {@html icons[icon] || icons.default}
  </div>
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
{/key}

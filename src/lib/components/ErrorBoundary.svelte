<script lang="ts">
  import { onMount } from "svelte";

  let { children }: { children?: import("svelte").Snippet } = $props();

  let hasError = $state(false);
  let errorMessage = $state("");

  onMount(() => {
    const handler = (event: Event) => {
      const errEvent = event as ErrorEvent;
      hasError = true;
      errorMessage = errEvent.message || "An unexpected error occurred";
      event.preventDefault();
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  });
</script>

{#if hasError}
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center p-12 text-center bg-bg">
    <svg viewBox="0 0 24 24" class="w-14 h-14 text-text-dim mb-5 fill-current">
      <path d="M12 2L1 21h22L12 2zm0 3.5l7.5 13h-15l7.5-13zM11 14h2v2h-2v-2zm0-5h2v4h-2V9z"/>
    </svg>
    <h2 class="text-xl font-bold mb-2">Something went wrong</h2>
    <p class="text-sm text-text-dim mb-6 max-w-md">{errorMessage}</p>
    <button
      class="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all"
      onclick={() => window.location.reload()}
    >
      Reload page
    </button>
  </div>
{:else}
  {@render children?.()}
{/if}

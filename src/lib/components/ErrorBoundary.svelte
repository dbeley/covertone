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
  <div class="flex flex-col items-center justify-center p-12 text-center">
    <svg viewBox="0 0 24 24" class="w-12 h-12 text-text-dim mb-4 fill-current">
      <path d="M12 2L1 21h22L12 2zm0 3.5l7.5 13h-15l7.5-13zM11 14h2v2h-2v-2zm0-5h2v4h-2V9z"/>
    </svg>
    <h2 class="text-xl font-bold mb-2">Something went wrong</h2>
    <p class="text-sm text-text-dim mb-4">{errorMessage}</p>
    <button
      class="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all"
      onclick={() => {
        hasError = false;
        errorMessage = "";
        window.location.reload();
      }}
    >
      Reload page
    </button>
  </div>
{:else}
  {@render children?.()}
{/if}

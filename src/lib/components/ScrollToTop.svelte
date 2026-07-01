<script lang="ts">
  let visible = $state(false);

  $effect(() => {
    const handler = () => {
      visible = window.scrollY > 600;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  });

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
</script>

{#if visible}
  <button
    class="fixed bottom-20 right-4 z-40 p-3 rounded-full surface-glass shadow-xl shadow-black/10 hover:border-accent/30 active:scale-90 transition-all duration-200 text-text-dim hover:text-text"
    onclick={scrollToTop}
    aria-label="Scroll to top"
  >
    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-none stroke-current" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  </button>
{/if}

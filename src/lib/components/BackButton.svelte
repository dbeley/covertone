<script lang="ts">
  function goBack() {
    window.history.back();
  }
</script>

<button
  class="inline-flex items-center gap-1.5 px-2 py-1.5 -ml-2 rounded-xl text-text-dim hover:text-text hover:bg-white/5 active:scale-95 transition-all duration-150"
  onclick={goBack}
  aria-label="Go back"
>
  <svg viewBox="0 0 24 24" class="w-5 h-5 stroke-current" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
  <span class="text-sm font-medium">Back</span>
</button>

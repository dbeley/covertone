<script lang="ts">
  let { onclick, label = 'Clear', disabled = false } = $props<{
    onclick: () => void;
    label?: string;
    disabled?: boolean;
  }>();
</script>

<button
  type="button"
  class="p-1.5 rounded-full text-text-dim hover:text-text hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
  aria-label={label}
  title={label}
  onclick={onclick}
  disabled={disabled}
>
  <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
    <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
  </svg>
</button>
<script lang="ts">
  import { onDestroy } from 'svelte';

  interface Props {
    src: string;
    alt?: string;
    class?: string;
    loading?: 'eager' | 'lazy';
    decoding?: 'async' | 'auto' | 'sync';
  }

  let { src, alt = '', class: className = '', loading, decoding }: Props = $props();

  let imgEl = $state<HTMLImageElement | null>(null);

  onDestroy(() => {
    if (imgEl) {
      imgEl.src = '';
      imgEl.srcset = '';
    }
  });
</script>

<img bind:this={imgEl} {src} {alt} class={className} {loading} {decoding} />

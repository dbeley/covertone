<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '$lib/stores/router';
  import AppShell from '$lib/components/AppShell.svelte';

  onMount(() => { router.reset(); });
</script>

<AppShell />

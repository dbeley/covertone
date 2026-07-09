<script lang="ts">
  import { listenLater } from "$lib/stores/listenLater";
  import { settings } from "$lib/stores/settings";
  import AlbumGrid from "$lib/components/AlbumGrid.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";

  let entries = $derived($listenLater);
  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);

  let albums = $derived(
    [...entries]
      .sort(
        (a, b) =>
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
      )
      .map((e) => e.album),
  );

  function remove(id: string) {
    listenLater.remove(id);
  }

  function clearAll() {
    listenLater.clear();
  }
</script>

<div class="p-4">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold tracking-tight">Listen Later</h2>
    {#if albums.length > 0}
      <button
        class="text-sm text-text-dim hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
        onclick={clearAll}
      >
        Clear all
      </button>
    {/if}
  </div>

  {#if albums.length > 0}
    <AlbumGrid {albums} {serverUrl} {username} {password} onRemove={remove} />
  {:else}
    <EmptyState
      icon="empty"
      title="Nothing saved yet"
      message="Add albums from their page to listen to them later"
    />
  {/if}
</div>

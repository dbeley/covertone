<script lang="ts">
  import { listenLater } from "$lib/stores/listenLater";
  import { settings } from "$lib/stores/settings";
  import {
    offlineProgress,
    getOfflineSummary,
    getStorageEstimate,
    type StorageEstimate,
    type OfflineSummary,
  } from "$lib/offline/downloads";
  import { formatBytes } from "$lib/utils/format";
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

  let summary = $state<OfflineSummary>({
    ready: 0,
    downloading: 0,
    failed: 0,
  });
  let storage = $state<StorageEstimate | null>(null);

  let unsub: (() => void) | undefined;
  $effect(() => {
    const refresh = async () => {
      summary = await getOfflineSummary();
      const estimate = await getStorageEstimate();
      if (estimate) storage = estimate;
    };
    void refresh();
    unsub = offlineProgress.subscribe(() => {
      void refresh();
    });
    return () => {
      unsub?.();
    };
  });

  function clearAll() {
    listenLater.clear();
  }
</script>

<div class="p-4">
  <div class="flex items-center justify-between mb-1">
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

  <p class="text-xs text-text-dim {albums.length > 0 ? 'mb-4' : 'mb-6'}">
    {#if albums.length > 0}
      <span class="font-semibold text-text">
        {summary.downloading > 0
          ? `${summary.downloading} downloading`
          : `${summary.ready} saved offline`}
      </span>
      {#if summary.failed > 0}<span class="text-red-400"> · {summary.failed} failed (tap to retry)</span>{/if}
      {#if storage}
        <span> · {formatBytes(storage.usage)} used</span>
      {/if}
    {:else}
      Saved albums are downloaded automatically so you can listen without a connection.
    {/if}
  </p>

  {#if albums.length > 0}
    <AlbumGrid {albums} {serverUrl} {username} {password} />
  {:else}
    <EmptyState
      icon="empty"
      title="Nothing saved yet"
      message="Add albums from their page to listen to them later"
    />
  {/if}
</div>

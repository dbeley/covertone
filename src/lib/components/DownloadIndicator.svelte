<script lang="ts">
  import type { Album } from "$lib/api/types";
  import { createApiFromSettings } from "$lib/api/createApi";
  import {
    offlineProgress,
    downloadAlbum,
    isAlbumReady,
  } from "$lib/offline/downloads";

  let { album }: { album: Album } = $props();

  let ready = $state(false);

  // Re-evaluate persisted readiness when this album's progress changes.
  let unsub: (() => void) | undefined;
  $effect(() => {
    let cancelled = false;
    const check = async () => {
      const done = await isAlbumReady(album.id);
      if (!cancelled) ready = done;
    };
    void check();
    unsub = offlineProgress.subscribe(() => {
      void check();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  });

  const progress = $derived($offlineProgress[album.id]);

  async function retry(e: Event) {
    e.stopPropagation();
    const api = createApiFromSettings();
    if (!api) return;
    await downloadAlbum(api, album);
  }
</script>

{#if progress?.status === "downloading"}
  <div
    class="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white ring-1 ring-white/15"
    title="Downloading…"
  >
    <svg viewBox="0 0 24 24" class="w-3 h-3 animate-spin text-accent" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    {progress.downloadedSongs}/{progress.totalSongs}
  </div>
{:else if progress?.status === "failed"}
  <button
    class="rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-400/40 hover:bg-black/80"
    onclick={retry}
    title="Download failed — tap to retry"
  >
    Retry
  </button>
{:else if ready}
  <div
    class="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white/70 ring-1 ring-white/10"
    title="Saved for offline"
  >
    <svg viewBox="0 0 24 24" class="w-3 h-3 fill-none stroke-current stroke-[2.4]" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    Offline
  </div>
{/if}

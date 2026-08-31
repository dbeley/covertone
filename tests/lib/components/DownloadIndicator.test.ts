import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import DownloadIndicator from "$lib/components/DownloadIndicator.svelte";
import { offlineProgress } from "$lib/offline/downloads";
import { clearAll, putMeta } from "$lib/offline/db";
import { clearResolveUrls } from "$lib/offline/resolve";
import type { Album } from "$lib/api/types";

const album: Album = {
  id: "a1",
  name: "Album One",
  artist: "Artist",
  artistId: "ar1",
  coverArt: "ca1",
  songCount: 2,
  duration: 400,
};

beforeEach(async () => {
  await clearAll();
  clearResolveUrls();
  offlineProgress.set({});
});

describe("DownloadIndicator", () => {
  it("renders nothing when the album is neither downloading nor cached", () => {
    render(DownloadIndicator, { album });
    expect(screen.queryByText("Offline")).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });

  it("shows download progress while downloading", () => {
    offlineProgress.set({
      a1: { status: "downloading", downloadedSongs: 1, totalSongs: 2 },
    });
    render(DownloadIndicator, { album });
    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("shows a retry action when the download failed", () => {
    offlineProgress.set({
      a1: { status: "failed", downloadedSongs: 0, totalSongs: 2 },
    });
    render(DownloadIndicator, { album });
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("shows the offline badge once the album is ready", async () => {
    await putMeta({
      albumId: "a1",
      status: "ready",
      savedAt: "x",
      songIds: [],
      totalSongs: 2,
    });
    render(DownloadIndicator, { album });
    expect(await screen.findByText("Offline")).toBeTruthy();
  });
});

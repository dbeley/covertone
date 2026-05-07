import { describe, it, expect, beforeEach, vi } from "vitest";
import { AutoDJ } from "$lib/player/AutoDJ";
import type { Song } from "$lib/api/types";

function createMockApi(
  getSimilarSongsImpl?: Function,
  getRandomSongsImpl?: Function,
) {
  return {
    getSimilarSongs: vi.fn(
      getSimilarSongsImpl ??
        (() => Promise.resolve({ similarSongs: { song: [] } })),
    ),
    getRandomSongs: vi.fn(
      getRandomSongsImpl ??
        (() => Promise.resolve({ randomSongs: { song: [] } })),
    ),
  };
}

const mockSong: Song = {
  id: "1",
  title: "Test Song",
  artist: "Test Artist",
  album: "Test Album",
  albumId: "a1",
  duration: 200,
};

const mockSimilarSong: Song = {
  id: "2",
  title: "Similar Song",
  artist: "Similar Artist",
  album: "Similar Album",
  albumId: "a2",
  duration: 180,
};

const mockRandomSong: Song = {
  id: "3",
  title: "Random Song",
  artist: "Random Artist",
  album: "Random Album",
  albumId: "a3",
  duration: 220,
};

describe("AutoDJ", () => {
  it("fetchSimilar returns similar songs when available", async () => {
    const mockApi = createMockApi(() =>
      Promise.resolve({ similarSongs: { song: [mockSimilarSong] } }),
    );
    const autoDJ = new AutoDJ(mockApi as any);
    const songs = await autoDJ.fetchSimilar("1", 10);
    expect(songs).toEqual([mockSimilarSong]);
    expect(mockApi.getSimilarSongs).toHaveBeenCalledWith({
      id: "1",
      count: 10,
    });
    expect(mockApi.getRandomSongs).not.toHaveBeenCalled();
  });

  it("fetchSimilar falls back to random songs when similarSongs fails", async () => {
    const mockApi = createMockApi(
      () => Promise.reject(new Error("No similar songs")),
      () => Promise.resolve({ randomSongs: { song: [mockRandomSong] } }),
    );
    const autoDJ = new AutoDJ(mockApi as any);
    const songs = await autoDJ.fetchSimilar("1", 5);
    expect(songs).toEqual([mockRandomSong]);
    expect(mockApi.getSimilarSongs).toHaveBeenCalledWith({ id: "1", count: 5 });
    expect(mockApi.getRandomSongs).toHaveBeenCalledWith({ size: 5 });
  });

  it("fetchSimilar returns empty array when both fail", async () => {
    const mockApi = createMockApi(
      () => Promise.reject(new Error("No similar")),
      () => Promise.reject(new Error("No random")),
    );
    const autoDJ = new AutoDJ(mockApi as any);
    await expect(autoDJ.fetchSimilar("1", 10)).rejects.toThrow("No random");
  });
});

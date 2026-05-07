import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import type { Song } from "$lib/api/types";

const mockAutoDJ = {
  fetchSimilar: vi.fn().mockResolvedValue([]),
};

vi.mock("$lib/player/AutoDJ", () => ({
  AutoDJ: vi.fn().mockImplementation(() => mockAutoDJ),
}));

import { queue } from "$lib/stores/queue";

const song1: Song = {
  id: "1",
  title: "Song 1",
  artist: "Artist",
  album: "Album",
  albumId: "a1",
  duration: 200,
};
const song2: Song = {
  id: "2",
  title: "Song 2",
  artist: "Artist",
  album: "Album",
  albumId: "a1",
  duration: 180,
};
const song3: Song = {
  id: "3",
  title: "Song 3",
  artist: "Artist",
  album: "Album",
  albumId: "a1",
  duration: 220,
};
const song4: Song = {
  id: "4",
  title: "Song 4",
  artist: "Artist",
  album: "Album",
  albumId: "a1",
  duration: 190,
};

function tracksFrom(state: ReturnType<typeof get<typeof queue>>) {
  return state.items.map((i) => i.track);
}

describe("queue store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queue.clear();
  });

  it("has correct initial state", () => {
    const state = get(queue);
    expect(state.items).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.autoDJ).toBe(false);
    expect(state.shuffle).toBe(false);
    expect(state.hasNext).toBe(false);
    expect(state.hasPrevious).toBe(false);
  });

  it("addToEnd appends a track and sets currentIndex on empty queue", () => {
    queue.addToEnd(song1);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1]);
    expect(state.currentIndex).toBe(0);
  });

  it("addToEnd preserves currentIndex on non-empty queue", () => {
    queue.replaceAll([song1, song2]);
    queue.playIndex(1);
    queue.addToEnd(song3);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song2, song3]);
    expect(state.currentIndex).toBe(1);
  });

  it("addTracksToEnd appends multiple tracks and sets currentIndex on empty queue", () => {
    queue.addTracksToEnd([song1, song2]);
    const state = get(queue);
    expect(state.items).toHaveLength(2);
    expect(tracksFrom(state)).toEqual([song1, song2]);
    expect(state.currentIndex).toBe(0);
  });

  it("addTracksToEnd preserves currentIndex on non-empty queue", () => {
    queue.replaceAll([song1]);
    queue.addTracksToEnd([song2, song3]);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song2, song3]);
    expect(state.currentIndex).toBe(0);
  });

  it("addNext inserts track after currentIndex", () => {
    queue.replaceAll([song1, song2]);
    queue.addNext(song3);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song3, song2]);
  });

  it("addNext appends and sets currentIndex on empty queue", () => {
    queue.addNext(song1);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1]);
    expect(state.currentIndex).toBe(0);
  });

  it("addNext appends at end when currentIndex is negative and queue is non-empty", () => {
    queue.addToEnd(song1);
    queue.addNext(song2);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song2]);
    expect(state.currentIndex).toBe(0);
  });

  it("replaceAll sets tracks and resets index", () => {
    queue.addTracksToEnd([song1, song2]);
    queue.replaceAll([song3, song4]);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song3, song4]);
    expect(state.currentIndex).toBe(0);
  });

  it("replaceAll preserves autoDJ and shuffle state", () => {
    queue.setAutoDJ(true);
    queue.setShuffle(true);
    queue.replaceAll([song1, song2]);
    const state = get(queue);
    expect(state.autoDJ).toBe(true);
    expect(state.shuffle).toBe(true);
  });

  it("removeTrack removes by index and adjusts currentIndex", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.removeTrack(1);
    let state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song3]);
    expect(state.currentIndex).toBe(0);

    queue.removeTrack(0);
    state = get(queue);
    expect(tracksFrom(state)).toEqual([song3]);
    expect(state.currentIndex).toBe(0);
  });

  it("removeTrack after currentIndex does not change index", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.removeTrack(2);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song2]);
    expect(state.currentIndex).toBe(0);
  });

  it("removeTrack last track resets index to -1", () => {
    queue.replaceAll([song1]);
    queue.removeTrack(0);
    const state = get(queue);
    expect(state.items).toEqual([]);
    expect(state.currentIndex).toBe(-1);
  });

  it("removeTrack ignores out-of-bounds index", () => {
    queue.replaceAll([song1, song2]);
    queue.removeTrack(-1);
    expect(get(queue).items).toHaveLength(2);
    queue.removeTrack(5);
    expect(get(queue).items).toHaveLength(2);
  });

  it("moveTrack moves track within the queue", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(2, 0);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song3, song1, song2]);
  });

  it("moveTrack adjusts currentIndex when moving the current track", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(0, 2);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song2, song3, song1]);
    expect(state.currentIndex).toBe(2);
  });

  it("moveTrack adjusts currentIndex when moving other tracks", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(2, 0);
    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song3, song1, song2]);
    expect(state.currentIndex).toBe(1);
  });

  it("moveTrack ignores out-of-bounds or same indices", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(-1, 1);
    expect(tracksFrom(get(queue))).toEqual([song1, song2, song3]);
    queue.moveTrack(1, -1);
    expect(tracksFrom(get(queue))).toEqual([song1, song2, song3]);
    queue.moveTrack(1, 5);
    expect(tracksFrom(get(queue))).toEqual([song1, song2, song3]);
    queue.moveTrack(5, 1);
    expect(tracksFrom(get(queue))).toEqual([song1, song2, song3]);
    queue.moveTrack(1, 1);
    expect(tracksFrom(get(queue))).toEqual([song1, song2, song3]);
  });

  it("assigns unique queue keys for duplicate songs", () => {
    queue.clear();
    queue.addToEnd(song1);
    queue.addToEnd(song1);
    queue.addToEnd(song1);

    const state = get(queue);
    expect(tracksFrom(state)).toEqual([song1, song1, song1]);
    const keys = state.items.map((item) => item.key);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });

  it("clear empties queue", () => {
    queue.replaceAll([song1, song2]);
    queue.clear();
    const state = get(queue);
    expect(state.items).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.autoDJ).toBe(false);
    expect(state.shuffle).toBe(false);
  });

  it("setAutoDJ enables/disables autoDJ", () => {
    queue.setAutoDJ(true);
    expect(get(queue).autoDJ).toBe(true);
    queue.setAutoDJ(false);
    expect(get(queue).autoDJ).toBe(false);
  });

  it("setShuffle enables/disables shuffle", () => {
    queue.setShuffle(true);
    expect(get(queue).shuffle).toBe(true);
    queue.setShuffle(false);
    expect(get(queue).shuffle).toBe(false);
  });

  it("getCurrent returns track at currentIndex", () => {
    queue.replaceAll([song1, song2]);
    expect(queue.getCurrent()).toEqual(song1);
  });

  it("getCurrent returns null when queue is empty", () => {
    expect(queue.getCurrent()).toBeNull();
  });

  it("getNext advances index and returns next track", () => {
    queue.replaceAll([song1, song2, song3]);
    expect(queue.getCurrent()).toEqual(song1);

    const next = queue.getNext();
    expect(next).toEqual(song2);
    expect(get(queue).currentIndex).toBe(1);
  });

  it("getNext returns null at end of queue", () => {
    queue.replaceAll([song1]);
    expect(queue.getNext()).toBeNull();
  });

  it("getPrevious decrements index and returns previous track", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.getNext();
    const prev = queue.getPrevious();
    expect(prev).toEqual(song1);
    expect(get(queue).currentIndex).toBe(0);
  });

  it("getPrevious returns null at start of queue", () => {
    queue.replaceAll([song1]);
    expect(queue.getPrevious()).toBeNull();
  });

  it("hasNext and hasPrevious are computed", () => {
    queue.replaceAll([song1, song2, song3]);
    let state = get(queue);
    expect(state.hasNext).toBe(true);
    expect(state.hasPrevious).toBe(false);

    queue.getNext();
    state = get(queue);
    expect(state.hasNext).toBe(true);
    expect(state.hasPrevious).toBe(true);

    queue.getNext();
    state = get(queue);
    expect(state.hasNext).toBe(false);
    expect(state.hasPrevious).toBe(true);
  });

  it("getNext shuffles when shuffle is enabled", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.setShuffle(true);
    const next = queue.getNext();
    expect([song1, song2, song3]).toContainEqual(next);
    expect(get(queue).currentIndex).toBeGreaterThanOrEqual(0);
    expect(get(queue).currentIndex).toBeLessThan(3);
  });

  it("hasNext is true with shuffle when more than one track exists", () => {
    queue.replaceAll([song1, song2]);
    queue.setShuffle(true);
    queue.playIndex(0);
    expect(get(queue).hasNext).toBe(true);
  });

  it("hasNext is false with shuffle when only one track exists", () => {
    queue.replaceAll([song1]);
    queue.setShuffle(true);
    queue.playIndex(0);
    expect(get(queue).hasNext).toBe(false);
  });

  it("syncCurrentTrack updates currentIndex when track is in queue", () => {
    queue.replaceAll([song1, song2, song3]);
    queue.syncCurrentTrack(song2);
    expect(get(queue).currentIndex).toBe(1);
  });

  it("syncCurrentTrack keeps currently selected duplicate index", () => {
    queue.replaceAll([song1, song1, song1]);
    queue.playIndex(2);
    queue.syncCurrentTrack(song1);
    expect(get(queue).currentIndex).toBe(2);
  });

  it("syncCurrentTrack resets currentIndex when track is not in queue", () => {
    queue.replaceAll([song1, song2]);
    queue.syncCurrentTrack(song3);
    expect(get(queue).currentIndex).toBe(-1);
  });

  it("syncCurrentTrack with null resets currentIndex", () => {
    queue.replaceAll([song1, song2]);
    queue.syncCurrentTrack(null);
    expect(get(queue).currentIndex).toBe(-1);
  });

  it("getNextAutoDJ returns next when available", async () => {
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1, song2]);
    const next = await queue.getNextAutoDJ();
    expect(next).toEqual(song2);
    expect(mockAutoDJ.fetchSimilar).not.toHaveBeenCalled();
  });

  it("getNextAutoDJ fetches similar when autoDJ is enabled and no next", async () => {
    const similarSong: Song = {
      id: "5",
      title: "Similar",
      artist: "A",
      album: "B",
      albumId: "b1",
      duration: 200,
    };
    mockAutoDJ.fetchSimilar.mockResolvedValueOnce([similarSong]);

    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1]);
    queue.setAutoDJ(true);

    const next = await queue.getNextAutoDJ();
    expect(mockAutoDJ.fetchSimilar).toHaveBeenCalledWith("1", 10);
    expect(next).toEqual(similarSong);
    expect(get(queue).currentIndex).toBe(1);
  });

  it("getNextAutoDJ returns null when autoDJ is disabled and no next", async () => {
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1]);
    queue.setAutoDJ(false);
    const next = await queue.getNextAutoDJ();
    expect(next).toBeNull();
    expect(mockAutoDJ.fetchSimilar).not.toHaveBeenCalled();
  });

  it("getNextAutoDJ returns null when autoDJ fetch returns empty", async () => {
    mockAutoDJ.fetchSimilar.mockResolvedValueOnce([]);
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.setAutoDJ(true);
    queue.replaceAll([song1]);

    const next = await queue.getNextAutoDJ();
    expect(next).toBeNull();
  });

  it("getNextAutoDJ skips fetch if already has next", async () => {
    const similarSong: Song = {
      id: "5",
      title: "Similar",
      artist: "A",
      album: "B",
      albumId: "b1",
      duration: 200,
    };
    mockAutoDJ.fetchSimilar.mockResolvedValueOnce([similarSong]);

    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.setAutoDJ(true);
    queue.clear();
    queue.replaceAll([song1, song2]);

    const next = await queue.getNextAutoDJ();
    expect(next).toEqual(song2);
    expect(mockAutoDJ.fetchSimilar).not.toHaveBeenCalled();
  });
});

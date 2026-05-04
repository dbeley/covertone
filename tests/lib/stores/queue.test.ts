import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { Song } from '$lib/api/types';

const mockAutoDJ = {
  fetchSimilar: vi.fn().mockResolvedValue([]),
};

vi.mock('$lib/player/AutoDJ', () => ({
  AutoDJ: vi.fn().mockImplementation(() => mockAutoDJ),
}));

import { queue } from '$lib/stores/queue';

const song1: Song = { id: '1', title: 'Song 1', artist: 'Artist', album: 'Album', albumId: 'a1', duration: 200 };
const song2: Song = { id: '2', title: 'Song 2', artist: 'Artist', album: 'Album', albumId: 'a1', duration: 180 };
const song3: Song = { id: '3', title: 'Song 3', artist: 'Artist', album: 'Album', albumId: 'a1', duration: 220 };
const song4: Song = { id: '4', title: 'Song 4', artist: 'Artist', album: 'Album', albumId: 'a1', duration: 190 };

describe('queue store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queue.clear();
  });

  it('has correct initial state', () => {
    const state = get(queue);
    expect(state.tracks).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.autoDJ).toBe(false);
    expect(state.hasNext).toBe(false);
    expect(state.hasPrevious).toBe(false);
  });

  it('addToEnd appends a track', () => {
    queue.addToEnd(song1);
    const state = get(queue);
    expect(state.tracks).toEqual([song1]);
    expect(state.currentIndex).toBe(-1);
  });

  it('addTracksToEnd appends multiple tracks', () => {
    queue.addTracksToEnd([song1, song2]);
    const state = get(queue);
    expect(state.tracks).toHaveLength(2);
    expect(state.tracks).toEqual([song1, song2]);
  });

  it('addNext inserts track after currentIndex', () => {
    queue.addTracksToEnd([song1, song2]);
    queue.replaceAll([song1, song2]);
    queue.addNext(song3);
    const state = get(queue);
    expect(state.tracks).toEqual([song1, song3, song2]);
  });

  it('addNext appends if currentIndex is negative', () => {
    queue.addNext(song1);
    const state = get(queue);
    expect(state.tracks).toEqual([song1]);
  });

  it('replaceAll sets tracks and resets index', () => {
    queue.addTracksToEnd([song1, song2]);
    queue.replaceAll([song3, song4]);
    const state = get(queue);
    expect(state.tracks).toEqual([song3, song4]);
    expect(state.currentIndex).toBe(0);
  });

  it('removeTrack removes by index and adjusts currentIndex', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.removeTrack(1);
    let state = get(queue);
    expect(state.tracks).toEqual([song1, song3]);
    expect(state.currentIndex).toBe(0);

    queue.removeTrack(0);
    state = get(queue);
    expect(state.tracks).toEqual([song3]);
    expect(state.currentIndex).toBe(0);
  });

  it('removeTrack after currentIndex does not change index', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.removeTrack(2);
    const state = get(queue);
    expect(state.tracks).toEqual([song1, song2]);
    expect(state.currentIndex).toBe(0);
  });

  it('removeTrack last track resets index to -1', () => {
    queue.replaceAll([song1]);
    queue.removeTrack(0);
    const state = get(queue);
    expect(state.tracks).toEqual([]);
    expect(state.currentIndex).toBe(-1);
  });

  it('moveTrack moves track within the queue', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(2, 0);
    const state = get(queue);
    expect(state.tracks).toEqual([song3, song1, song2]);
  });

  it('moveTrack adjusts currentIndex when moving the current track', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(0, 2);
    let state = get(queue);
    expect(state.tracks).toEqual([song2, song3, song1]);
    expect(state.currentIndex).toBe(2);
  });

  it('moveTrack adjusts currentIndex when moving other tracks', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.moveTrack(2, 0);
    let state = get(queue);
    expect(state.tracks).toEqual([song3, song1, song2]);
    expect(state.currentIndex).toBe(1);
  });

  it('clear empties queue', () => {
    queue.replaceAll([song1, song2]);
    queue.clear();
    const state = get(queue);
    expect(state.tracks).toEqual([]);
    expect(state.currentIndex).toBe(-1);
  });

  it('setAutoDJ enables/disables autoDJ', () => {
    queue.setAutoDJ(true);
    expect(get(queue).autoDJ).toBe(true);
    queue.setAutoDJ(false);
    expect(get(queue).autoDJ).toBe(false);
  });

  it('getCurrent returns track at currentIndex', () => {
    queue.replaceAll([song1, song2]);
    expect(queue.getCurrent()).toEqual(song1);
  });

  it('getCurrent returns null when queue is empty', () => {
    expect(queue.getCurrent()).toBeNull();
  });

  it('getNext advances index and returns next track', () => {
    queue.replaceAll([song1, song2, song3]);
    expect(queue.getCurrent()).toEqual(song1);

    const next = queue.getNext();
    expect(next).toEqual(song2);
    expect(get(queue).currentIndex).toBe(1);
  });

  it('getNext returns null at end of queue', () => {
    queue.replaceAll([song1]);
    expect(queue.getNext()).toBeNull();
  });

  it('getPrevious decrements index and returns previous track', () => {
    queue.replaceAll([song1, song2, song3]);
    queue.getNext();
    const prev = queue.getPrevious();
    expect(prev).toEqual(song1);
    expect(get(queue).currentIndex).toBe(0);
  });

  it('getPrevious returns null at start of queue', () => {
    queue.replaceAll([song1]);
    expect(queue.getPrevious()).toBeNull();
  });

  it('hasNext and hasPrevious are computed', () => {
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

  it('getNextAutoDJ returns next when available', async () => {
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1, song2]);
    const next = await queue.getNextAutoDJ();
    expect(next).toEqual(song2);
    expect(mockAutoDJ.fetchSimilar).not.toHaveBeenCalled();
  });

  it('getNextAutoDJ fetches similar when autoDJ is enabled and no next', async () => {
    const similarSong: Song = { id: '5', title: 'Similar', artist: 'A', album: 'B', albumId: 'b1', duration: 200 };
    mockAutoDJ.fetchSimilar.mockResolvedValueOnce([similarSong]);

    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1]);
    queue.setAutoDJ(true);

    const next = await queue.getNextAutoDJ();
    expect(mockAutoDJ.fetchSimilar).toHaveBeenCalledWith('1', 10);
    expect(next).toEqual(similarSong);
    expect(get(queue).currentIndex).toBe(1);
  });

  it('getNextAutoDJ returns null when autoDJ is disabled and no next', async () => {
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.replaceAll([song1]);
    const next = await queue.getNextAutoDJ();
    expect(next).toBeNull();
    expect(mockAutoDJ.fetchSimilar).not.toHaveBeenCalled();
  });

  it('getNextAutoDJ returns null when autoDJ fetch returns empty', async () => {
    mockAutoDJ.fetchSimilar.mockResolvedValueOnce([]);
    queue.setAutoDJInstance(mockAutoDJ as any);
    queue.setAutoDJ(true);
    queue.replaceAll([song1]);

    const next = await queue.getNextAutoDJ();
    expect(next).toBeNull();
  });

  it('getNextAutoDJ skips fetch if already has next', async () => {
    const similarSong: Song = { id: '5', title: 'Similar', artist: 'A', album: 'B', albumId: 'b1', duration: 200 };
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

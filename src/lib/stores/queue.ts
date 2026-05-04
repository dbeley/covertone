import { writable } from 'svelte/store';
import type { Song } from '$lib/api/types';
import type { AutoDJ } from '$lib/player/AutoDJ';

export interface QueueState {
  tracks: Song[];
  currentIndex: number;
  autoDJ: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

function createQueue() {
  let autoDJInstance: AutoDJ | null = null;

  const { subscribe, set, update } = writable<QueueState>({
    tracks: [],
    currentIndex: -1,
    autoDJ: false,
    hasNext: false,
    hasPrevious: false,
  });

  function recomputeDerived(state: QueueState): QueueState {
    return {
      ...state,
      hasNext: state.currentIndex >= 0 && state.currentIndex < state.tracks.length - 1,
      hasPrevious: state.currentIndex > 0,
    };
  }

  return {
    subscribe,
    addToEnd(track: Song) {
      update(s => {
        const next = { ...s, tracks: [...s.tracks, track] };
        return recomputeDerived(next);
      });
    },
    addTracksToEnd(tracks: Song[]) {
      update(s => {
        const next = { ...s, tracks: [...s.tracks, ...tracks] };
        return recomputeDerived(next);
      });
    },
    addNext(track: Song) {
      update(s => {
        const idx = s.currentIndex < 0 ? s.tracks.length : s.currentIndex + 1;
        const newTracks = [...s.tracks];
        newTracks.splice(idx, 0, track);
        return recomputeDerived({ ...s, tracks: newTracks });
      });
    },
    replaceAll(tracks: Song[]) {
      const next = { tracks, currentIndex: tracks.length > 0 ? 0 : -1, autoDJ: false, hasNext: false, hasPrevious: false };
      set(recomputeDerived(next));
    },
    removeTrack(index: number) {
      update(s => {
        const newTracks = s.tracks.filter((_, i) => i !== index);
        let newIndex = s.currentIndex;
        if (index < s.currentIndex) {
          newIndex = s.currentIndex - 1;
        } else if (index === s.currentIndex) {
          newIndex = Math.min(s.currentIndex, newTracks.length - 1);
        }
        if (newTracks.length === 0) newIndex = -1;
        return recomputeDerived({ ...s, tracks: newTracks, currentIndex: newIndex });
      });
    },
    moveTrack(fromIndex: number, toIndex: number) {
      update(s => {
        const newTracks = [...s.tracks];
        const [item] = newTracks.splice(fromIndex, 1);
        newTracks.splice(toIndex, 0, item);

        let newIndex = s.currentIndex;
        if (fromIndex === s.currentIndex) {
          newIndex = toIndex;
        } else if (fromIndex < s.currentIndex && toIndex >= s.currentIndex) {
          newIndex = s.currentIndex - 1;
        } else if (fromIndex > s.currentIndex && toIndex <= s.currentIndex) {
          newIndex = s.currentIndex + 1;
        }

        return recomputeDerived({ ...s, tracks: newTracks, currentIndex: newIndex });
      });
    },
    clear() {
      set(recomputeDerived({ tracks: [], currentIndex: -1, autoDJ: false, hasNext: false, hasPrevious: false }));
    },
    setAutoDJ(enabled: boolean) {
      update(s => recomputeDerived({ ...s, autoDJ: enabled }));
    },
    setAutoDJInstance(instance: AutoDJ) {
      autoDJInstance = instance;
    },
    getCurrent(): Song | null {
      let result: Song | null = null;
      update(s => {
        if (s.currentIndex >= 0 && s.currentIndex < s.tracks.length) {
          result = s.tracks[s.currentIndex];
        }
        return s;
      });
      return result;
    },
    getNext(): Song | null {
      let result: Song | null = null;
      update(s => {
        const nextIndex = s.currentIndex + 1;
        if (nextIndex < s.tracks.length) {
          result = s.tracks[nextIndex];
          return recomputeDerived({ ...s, currentIndex: nextIndex });
        }
        return s;
      });
      return result;
    },
    getPrevious(): Song | null {
      let result: Song | null = null;
      update(s => {
        if (s.currentIndex > 0) {
          const prevIndex = s.currentIndex - 1;
          result = s.tracks[prevIndex];
          return recomputeDerived({ ...s, currentIndex: prevIndex });
        }
        return s;
      });
      return result;
    },
    async getNextAutoDJ(): Promise<Song | null> {
      const next = this.getNext();
      if (next) return next;

      let state = { tracks: [] as Song[], currentIndex: -1, autoDJ: false };
      update(s => {
        state = { tracks: s.tracks, currentIndex: s.currentIndex, autoDJ: s.autoDJ };
        return s;
      });

      if (!state.autoDJ || !autoDJInstance || state.currentIndex < 0) return null;

      const currentTrack = state.tracks[state.currentIndex];
      if (!currentTrack) return null;

      const similar = await autoDJInstance.fetchSimilar(currentTrack.id, 10);
      if (similar.length === 0) return null;

      this.addTracksToEnd(similar);
      return this.getNext();
    },
  };
}

export const queue = createQueue();

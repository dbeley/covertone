import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import type { Song } from "$lib/api/types";
import type { AutoDJ } from "$lib/player/AutoDJ";

export const queueDrawerOpen = writable(false);

export interface QueueState {
  tracks: Song[];
  currentIndex: number;
  autoDJ: boolean;
  shuffle: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

function createQueue() {
  let autoDJInstance: AutoDJ | null = null;

  const store: Writable<QueueState> = writable({
    tracks: [],
    currentIndex: -1,
    autoDJ: false,
    shuffle: false,
    hasNext: false,
    hasPrevious: false,
  });

  const { subscribe, set, update } = store;

  function recomputeDerived(state: QueueState): QueueState {
    const hasNext = state.shuffle
      ? state.tracks.length > 1
      : state.currentIndex >= 0 && state.currentIndex < state.tracks.length - 1;
    return {
      ...state,
      hasNext,
      hasPrevious: state.currentIndex > 0,
    };
  }

  return {
    subscribe,
    addToEnd(track: Song) {
      update((s) => {
        const newTracks = [...s.tracks, { ...track }];
        const newIndex = s.tracks.length === 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, tracks: newTracks, currentIndex: newIndex });
      });
    },
    addTracksToEnd(tracks: Song[]) {
      update((s) => {
        const newTracks = [...s.tracks, ...tracks.map((t) => ({ ...t }))];
        const newIndex = s.tracks.length === 0 && tracks.length > 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, tracks: newTracks, currentIndex: newIndex });
      });
    },
    addNext(track: Song) {
      update((s) => {
        const idx = s.currentIndex < 0 ? s.tracks.length : s.currentIndex + 1;
        const newTracks = [...s.tracks];
        newTracks.splice(idx, 0, { ...track });
        const newIndex = s.tracks.length === 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, tracks: newTracks, currentIndex: newIndex });
      });
    },
    replaceAll(tracks: Song[]) {
      update((s) => {
        const next = {
          tracks: tracks.map((t) => ({ ...t })),
          currentIndex: tracks.length > 0 ? 0 : -1,
          autoDJ: s.autoDJ,
          shuffle: s.shuffle,
          hasNext: false,
          hasPrevious: false,
        };
        return recomputeDerived(next);
      });
    },
    playIndex(index: number) {
      update((s) => {
        if (index < 0 || index >= s.tracks.length) return s;
        return recomputeDerived({ ...s, currentIndex: index });
      });
    },
    removeTrack(index: number) {
      update((s) => {
        if (index < 0 || index >= s.tracks.length) return s;
        const newTracks = s.tracks.filter((_, i) => i !== index);
        let newIndex = s.currentIndex;
        if (index < s.currentIndex) {
          newIndex = s.currentIndex - 1;
        } else if (index === s.currentIndex) {
          newIndex = Math.min(s.currentIndex, newTracks.length - 1);
        }
        if (newTracks.length === 0) newIndex = -1;
        return recomputeDerived({
          ...s,
          tracks: newTracks,
          currentIndex: newIndex,
        });
      });
    },
    moveTrack(fromIndex: number, toIndex: number) {
      update((s) => {
        if (
          fromIndex < 0 ||
          fromIndex >= s.tracks.length ||
          toIndex < 0 ||
          toIndex >= s.tracks.length ||
          fromIndex === toIndex
        ) {
          return s;
        }
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

        return recomputeDerived({
          ...s,
          tracks: newTracks,
          currentIndex: newIndex,
        });
      });
    },
    clear() {
      set(
        recomputeDerived({
          tracks: [],
          currentIndex: -1,
          autoDJ: false,
          shuffle: false,
          hasNext: false,
          hasPrevious: false,
        }),
      );
    },
    setAutoDJ(enabled: boolean) {
      update((s) => recomputeDerived({ ...s, autoDJ: enabled }));
    },
    setShuffle(enabled: boolean) {
      update((s) => recomputeDerived({ ...s, shuffle: enabled }));
    },
    setAutoDJInstance(instance: AutoDJ) {
      autoDJInstance = instance;
    },
    getCurrent(): Song | null {
      const s = get(store);
      if (s.currentIndex >= 0 && s.currentIndex < s.tracks.length) {
        return s.tracks[s.currentIndex];
      }
      return null;
    },
    getNext(): Song | null {
      let result: Song | null = null;
      update((s) => {
        if (s.shuffle && s.tracks.length > 1) {
          let nextIndex = Math.floor(Math.random() * s.tracks.length);
          while (nextIndex === s.currentIndex) {
            nextIndex = Math.floor(Math.random() * s.tracks.length);
          }
          result = s.tracks[nextIndex];
          return recomputeDerived({ ...s, currentIndex: nextIndex });
        }
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
      update((s) => {
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

      const state = get(store);

      if (!state.autoDJ || !autoDJInstance || state.currentIndex < 0)
        return null;

      const currentTrack = state.tracks[state.currentIndex];
      if (!currentTrack) return null;

      const similar = await autoDJInstance.fetchSimilar(currentTrack.id, 10);
      if (similar.length === 0) return null;

      this.addTracksToEnd(similar);
      return this.getNext();
    },
    syncCurrentTrack(track: Song | null) {
      update((s) => {
        if (!track) return recomputeDerived({ ...s, currentIndex: -1 });
        const index = s.tracks.findIndex((t) => t.id === track.id);
        return recomputeDerived({ ...s, currentIndex: index });
      });
    },
  };
}

export const queue = createQueue();

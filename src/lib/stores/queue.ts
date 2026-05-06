import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import type { Song } from "$lib/api/types";
import type { AutoDJ } from "$lib/player/AutoDJ";

export const queueDrawerOpen = writable(false);

export interface QueuedItem {
  key: string;
  track: Song;
}

export interface QueueState {
  items: QueuedItem[];
  currentIndex: number;
  autoDJ: boolean;
  shuffle: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

function createQueue() {
  let autoDJInstance: AutoDJ | null = null;
  let nextKey = 0;

  function makeItem(track: Song): QueuedItem {
    return { key: `q-${nextKey++}`, track: { ...track } };
  }

  const store: Writable<QueueState> = writable({
    items: [],
    currentIndex: -1,
    autoDJ: false,
    shuffle: false,
    hasNext: false,
    hasPrevious: false,
  });

  const { subscribe, set, update } = store;

  function recomputeDerived(state: QueueState): QueueState {
    const hasNext = state.shuffle
      ? state.items.length > 1
      : state.currentIndex >= 0 && state.currentIndex < state.items.length - 1;
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
        const newItems = [...s.items, makeItem(track)];
        const newIndex = s.items.length === 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, items: newItems, currentIndex: newIndex });
      });
    },
    addTracksToEnd(tracks: Song[]) {
      update((s) => {
        const newItems = [...s.items, ...tracks.map((t) => makeItem(t))];
        const newIndex = s.items.length === 0 && tracks.length > 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, items: newItems, currentIndex: newIndex });
      });
    },
    addNext(track: Song) {
      update((s) => {
        const idx = s.currentIndex < 0 ? s.items.length : s.currentIndex + 1;
        const newItems = [...s.items];
        newItems.splice(idx, 0, makeItem(track));
        const newIndex = s.items.length === 0 ? 0 : s.currentIndex;
        return recomputeDerived({ ...s, items: newItems, currentIndex: newIndex });
      });
    },
    replaceAll(tracks: Song[]) {
      update((s) => {
        const next = {
          items: tracks.map((t) => makeItem(t)),
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
        if (index < 0 || index >= s.items.length) return s;
        return recomputeDerived({ ...s, currentIndex: index });
      });
    },
    removeTrack(index: number) {
      update((s) => {
        if (index < 0 || index >= s.items.length) return s;
        const newItems = s.items.filter((_, i) => i !== index);
        let newIndex = s.currentIndex;
        if (index < s.currentIndex) {
          newIndex = s.currentIndex - 1;
        } else if (index === s.currentIndex) {
          newIndex = Math.min(s.currentIndex, newItems.length - 1);
        }
        if (newItems.length === 0) newIndex = -1;
        return recomputeDerived({
          ...s,
          items: newItems,
          currentIndex: newIndex,
        });
      });
    },
    moveTrack(fromIndex: number, toIndex: number) {
      update((s) => {
        if (
          fromIndex < 0 ||
          fromIndex >= s.items.length ||
          toIndex < 0 ||
          toIndex >= s.items.length ||
          fromIndex === toIndex
        ) {
          return s;
        }
        const newItems = [...s.items];
        const [item] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, item);

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
          items: newItems,
          currentIndex: newIndex,
        });
      });
    },
    clear() {
      set(
        recomputeDerived({
          items: [],
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
      if (s.currentIndex >= 0 && s.currentIndex < s.items.length) {
        return s.items[s.currentIndex].track;
      }
      return null;
    },
    getNext(): Song | null {
      let result: Song | null = null;
      update((s) => {
        if (s.shuffle && s.items.length > 1) {
          let nextIndex = Math.floor(Math.random() * s.items.length);
          while (nextIndex === s.currentIndex) {
            nextIndex = Math.floor(Math.random() * s.items.length);
          }
          result = s.items[nextIndex].track;
          return recomputeDerived({ ...s, currentIndex: nextIndex });
        }
        const nextIndex = s.currentIndex + 1;
        if (nextIndex < s.items.length) {
          result = s.items[nextIndex].track;
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
          result = s.items[prevIndex].track;
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

      const currentItem = state.items[state.currentIndex];
      if (!currentItem) return null;

      const similar = await autoDJInstance.fetchSimilar(currentItem.track.id, 10);
      if (similar.length === 0) return null;

      this.addTracksToEnd(similar);
      return this.getNext();
    },
    syncCurrentTrack(track: Song | null) {
      update((s) => {
        if (!track) return recomputeDerived({ ...s, currentIndex: -1 });
        const index = s.items.findIndex((item) => item.track.id === track.id);
        return recomputeDerived({ ...s, currentIndex: index });
      });
    },
  };
}

export const queue = createQueue();

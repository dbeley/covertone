import { writable } from "svelte/store";
import type { Artist, Album, Song } from "$lib/api/types";

export interface SearchState {
  query: string;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  hasSearched: boolean;
}

const initialState: SearchState = {
  query: "",
  artists: [],
  albums: [],
  songs: [],
  hasSearched: false,
};

function createSearch() {
  const { subscribe, update } = writable<SearchState>(initialState);
  return {
    subscribe,
    update,
    setQuery(query: string) {
      update((s) => ({ ...s, query }));
    },
    setResults(results: { artists: Artist[]; albums: Album[]; songs: Song[] }) {
      update((s) => ({ ...s, ...results }));
    },
    reset() {
      update(() => initialState);
    },
  };
}

export const searchStore = createSearch();

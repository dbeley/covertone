import { writable } from "svelte/store";

export interface ArtistsPageState {
  query: string;
  debouncedQuery: string;
  visibleCount: number;
}

const initialState: ArtistsPageState = {
  query: "",
  debouncedQuery: "",
  visibleCount: 6,
};

/**
 * Session-only state for the Artists list page. Kept in a store so the
 * filter and expanded sections survive navigating to an artist and back.
 */
export const artistsPageStore = writable<ArtistsPageState>(initialState);

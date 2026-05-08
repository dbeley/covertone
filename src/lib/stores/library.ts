import { writable } from "svelte/store";
import { SubsonicAPI } from "$lib/api/SubsonicAPI";
import { cacheInvalidate } from "$lib/stores/apiCache";
import type { Album, Artist } from "$lib/api/types";

export type AlbumListType =
  | "newest"
  | "random"
  | "frequent"
  | "recent"
  | "starred"
  | "alphabeticalByName"
  | "alphabeticalByArtist";

export interface ArtistIndexGroup {
  letter: string;
  artists: Artist[];
}

export interface LibraryState {
  initialized: boolean;
  albums: Album[];
  artists: Artist[];
  artistIndex: ArtistIndexGroup[];
  loading: boolean;
  currentAlbumListType: AlbumListType | null;
  currentOffset: number;
  hasMore: boolean;
}

interface InitConfig {
  server: string;
  username: string;
  password: string;
}

function createLibrary() {
  let api: SubsonicAPI | null = null;

  const { subscribe, set, update } = writable<LibraryState>({
    initialized: false,
    albums: [],
    artists: [],
    artistIndex: [],
    loading: false,
    currentAlbumListType: null,
    currentOffset: 0,
    hasMore: true,
  });

  return {
    subscribe,
    init(config: InitConfig) {
      api = new SubsonicAPI({ ...config, clientName: "covertone" });
      set({
        initialized: true,
        albums: [],
        artists: [],
        artistIndex: [],
        loading: false,
        currentAlbumListType: null,
        currentOffset: 0,
        hasMore: true,
      });
    },
    async fetchAlbums(params: {
      type: AlbumListType;
      size?: number;
      offset?: number;
      refresh?: boolean;
    }) {
      if (!api) return;
      const size = params.size ?? 20;
      const offset = params.offset ?? 0;
      if (params.refresh) {
        cacheInvalidate("getAlbumList");
      }
      update((s) => ({
        ...s,
        loading: true,
        currentAlbumListType: params.type,
        currentOffset: offset,
      }));
      try {
        const result = await api.getAlbumList({
          type: params.type,
          size,
          offset,
        });
        const albums = result.albumList2.album;
        update((s) => {
          const isNewType = s.currentAlbumListType !== params.type;
          const shouldReplace = isNewType || offset === 0;
          const existingIds = new Set(s.albums.map((a) => a.id));
          const merged = shouldReplace
            ? albums
            : [...s.albums, ...albums.filter((a) => !existingIds.has(a.id))];
          return {
            ...s,
            albums: merged,
            loading: false,
            hasMore: albums.length >= size,
          };
        });
      } catch {
        update((s) => ({ ...s, loading: false }));
      }
    },
    async fetchArtists() {
      if (!api) return;
      update((s) => ({ ...s, loading: true }));
      try {
        const result = await api.getArtists();
        const artists: Artist[] = [];
        const artistIndex: ArtistIndexGroup[] = [];
        if (result.artists.index) {
          for (const group of result.artists.index) {
            artists.push(...group.artist);
            artistIndex.push({ letter: group.name, artists: group.artist });
          }
        }
        update((s) => ({ ...s, artists, artistIndex, loading: false }));
      } catch {
        update((s) => ({ ...s, loading: false }));
      }
    },
    reset() {
      api = null;
      set({
        initialized: false,
        albums: [],
        artists: [],
        artistIndex: [],
        loading: false,
        currentAlbumListType: null,
        currentOffset: 0,
        hasMore: true,
      });
    },
  };
}

export const library = createLibrary();

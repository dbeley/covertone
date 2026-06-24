import { writable, get } from "svelte/store";
import { SubsonicAPI } from "$lib/api/SubsonicAPI";
import { cacheInvalidate } from "$lib/stores/apiCache";
import { settings } from "$lib/stores/settings";
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
  error: string | null;
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
    error: null,
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
        error: null,
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
      const size = params.size ?? 50;
      const offset = params.offset ?? 0;
      if (params.refresh) {
        cacheInvalidate("getAlbumList");
      }
      update((s) => ({
        ...s,
        loading: true,
        error: null,
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
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to fetch albums";
        update((s) => ({ ...s, loading: false, error: message }));
      }
    },
    async fetchArtists() {
      if (!api) return;
      update((s) => ({ ...s, loading: true, error: null }));
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
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to fetch artists";
        update((s) => ({ ...s, loading: false, error: message }));
      }
    },
    getApi(): SubsonicAPI | null {
      if (api) return api;
      const s = get(settings);
      if (s.isConfigured) {
        return new SubsonicAPI({
          server: s.serverUrl,
          username: s.username,
          password: s.password,
          clientName: "covertone",
        });
      }
      return null;
    },
    reset() {
      api = null;
      set({
        initialized: false,
        albums: [],
        artists: [],
        artistIndex: [],
        loading: false,
        error: null,
        currentAlbumListType: null,
        currentOffset: 0,
        hasMore: true,
      });
    },
  };
}

export const library = createLibrary();

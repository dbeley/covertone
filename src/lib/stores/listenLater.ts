import { writable, get } from "svelte/store";
import type { Album, ListenLaterEntry } from "$lib/api/types";

const STORAGE_KEY = "covertone-listen-later";

function load(): ListenLaterEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persist(entries: ListenLaterEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function createListenLater() {
  const { subscribe, set, update } = writable<ListenLaterEntry[]>(load());

  return {
    subscribe,

    add(album: Album): void {
      update((entries) => {
        if (entries.some((e) => e.album.id === album.id)) return entries;
        const next = [{ album, addedAt: new Date().toISOString() }, ...entries];
        persist(next);
        return next;
      });
    },

    remove(albumId: string): void {
      update((entries) => {
        const next = entries.filter((e) => e.album.id !== albumId);
        persist(next);
        return next;
      });
    },

    clear(): void {
      set([]);
      persist([]);
    },

    has(albumId: string): boolean {
      return get({ subscribe }).some((e) => e.album.id === albumId);
    },

    getAll(): ListenLaterEntry[] {
      return get({ subscribe });
    },
  };
}

export const listenLater = createListenLater();

import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";

export interface TabInfo {
  id: string;
  route: string;
  title: string;
  scrollY: number;
}

export interface TabsState {
  tabs: TabInfo[];
  activeTabId: string | null;
}

const MAX_TABS = 10;

function routeToTitle(route: string): string {
  if (route === "/") return "Home";
  if (route === "/albums") return "Albums";
  if (route === "/artists") return "Artists";
  if (route === "/playlists") return "Playlists";
  if (route.startsWith("/search")) return "Search";
  if (route.startsWith("/album/")) return "Album";
  if (route.startsWith("/artist/")) return "Artist";
  if (route.startsWith("/playlist/")) return "Playlist";
  if (route === "/game") return "Game";
  if (route === "/settings") return "Settings";
  return "Page";
}

function createTabsStore() {
  let nextId = 0;
  const store: Writable<TabsState> = writable({
    tabs: [],
    activeTabId: null,
  });
  const { subscribe, update } = store;

  return {
    subscribe,
    createTab() {
      update((state) => {
        if (state.tabs.length >= MAX_TABS) return state;
        const id = `tab-${nextId++}`;
        const tab: TabInfo = { id, route: "/", title: "Home", scrollY: 0 };
        return { tabs: [...state.tabs, tab], activeTabId: id };
      });
    },
    closeTab(id: string) {
      update((state) => {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return state;
        const newTabs = state.tabs.filter((t) => t.id !== id);
        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          if (newTabs.length === 0) {
            newActiveId = null;
          } else {
            newActiveId = idx > 0 ? newTabs[idx - 1].id : newTabs[0].id;
          }
        }
        return { tabs: newTabs, activeTabId: newActiveId };
      });
    },
    activateTab(id: string) {
      update((state) => {
        if (!state.tabs.find((t) => t.id === id)) return state;
        return { ...state, activeTabId: id };
      });
    },
    updateRoute(id: string, route: string) {
      update((state) => {
        const newTabs = state.tabs.map((t) =>
          t.id === id ? { ...t, route, title: routeToTitle(route) } : t,
        );
        return { ...state, tabs: newTabs };
      });
    },
    saveScroll(id: string, scrollY: number) {
      update((state) => {
        const newTabs = state.tabs.map((t) =>
          t.id === id ? { ...t, scrollY } : t,
        );
        return { ...state, tabs: newTabs };
      });
    },
    getActiveTab(): TabInfo | null {
      const state = get(store);
      if (!state.activeTabId) return null;
      return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    },
  };
}

export const tabsStore = createTabsStore();

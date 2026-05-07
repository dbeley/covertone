import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { tabsStore } from '$lib/stores/tabs';

describe('tabsStore', () => {
  beforeEach(() => {
    const state = get(tabsStore);
    state.tabs.forEach(t => tabsStore.closeTab(t.id));
  });

  it('starts with no tabs', () => {
    const state = get(tabsStore);
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
  });

  it('createTab adds a tab at route / with title Home', () => {
    tabsStore.createTab();
    const state = get(tabsStore);
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].route).toBe('/');
    expect(state.tabs[0].title).toBe('Home');
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  it('createTab with currentRoute captures current view as first tab', () => {
    tabsStore.createTab('/albums');
    const state = get(tabsStore);
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs[0].route).toBe('/albums');
    expect(state.tabs[0].title).toBe('Albums');
    expect(state.tabs[1].route).toBe('/');
    expect(state.tabs[1].title).toBe('Home');
    expect(state.activeTabId).toBe(state.tabs[1].id);
  });

  it('createTab activates the new tab', () => {
    tabsStore.createTab();
    const state1 = get(tabsStore);
    const tab1Id = state1.activeTabId;
    tabsStore.createTab();
    const state2 = get(tabsStore);
    expect(state2.activeTabId).not.toBe(tab1Id);
  });

  it('respects max tab limit of 10', () => {
    for (let i = 0; i < 11; i++) {
      tabsStore.createTab();
    }
    const state = get(tabsStore);
    expect(state.tabs).toHaveLength(10);
  });

  it('closeTab removes the tab', () => {
    tabsStore.createTab();
    const state1 = get(tabsStore);
    const id = state1.tabs[0].id;
    tabsStore.closeTab(id);
    const state2 = get(tabsStore);
    expect(state2.tabs).toHaveLength(0);
    expect(state2.activeTabId).toBeNull();
  });

  it('closeTab activates nearest sibling when closing active tab', () => {
    tabsStore.createTab(); // tab 0, active
    tabsStore.createTab(); // tab 1, active
    const state1 = get(tabsStore);
    const tab0Id = state1.tabs[0].id;
    tabsStore.activateTab(tab0Id);
    tabsStore.closeTab(tab0Id);
    const state2 = get(tabsStore);
    expect(state2.activeTabId).toBe(state2.tabs[0]?.id ?? null);
    expect(state2.tabs).toHaveLength(1);
  });

  it('activateTab switches active tab', () => {
    tabsStore.createTab(); // tab 0, active
    tabsStore.createTab(); // tab 1, active
    const state1 = get(tabsStore);
    const tab0Id = state1.tabs[0].id;
    tabsStore.activateTab(tab0Id);
    const state2 = get(tabsStore);
    expect(state2.activeTabId).toBe(tab0Id);
  });

  it('updateRoute changes route and recomputes title', () => {
    tabsStore.createTab();
    const state1 = get(tabsStore);
    const id = state1.tabs[0].id;
    tabsStore.updateRoute(id, '/albums');
    const state2 = get(tabsStore);
    expect(state2.tabs[0].route).toBe('/albums');
    expect(state2.tabs[0].title).toBe('Albums');
  });

  it('updateRoute derives correct titles from routes', () => {
    tabsStore.createTab();
    const id = get(tabsStore).tabs[0].id;
    const cases: [string, string][] = [
      ['/', 'Home'],
      ['/albums', 'Albums'],
      ['/artists', 'Artists'],
      ['/playlists', 'Playlists'],
      ['/album/123', 'Album'],
      ['/artist/456', 'Artist'],
      ['/playlist/789', 'Playlist'],
      ['/search', 'Search'],
      ['/search?q=test', 'Search'],
      ['/game', 'Game'],
      ['/settings', 'Settings'],
      ['/unknown', 'Page'],
    ];
    for (const [route, expectedTitle] of cases) {
      tabsStore.updateRoute(id, route);
      expect(get(tabsStore).tabs[0].title).toBe(expectedTitle);
    }
  });

  it('saveScroll stores scroll position', () => {
    tabsStore.createTab();
    const state1 = get(tabsStore);
    const id = state1.tabs[0].id;
    tabsStore.saveScroll(id, 500);
    expect(get(tabsStore).tabs[0].scrollY).toBe(500);
  });
});

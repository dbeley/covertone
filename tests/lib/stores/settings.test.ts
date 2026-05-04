import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear();
    settings.reset();
  });

  it('has default theme "system"', () => {
    const state = get(settings);
    expect(state.theme).toBe('system');
  });

  it('setTheme updates theme and persists to localStorage', () => {
    settings.setTheme('dark');
    const state = get(settings);
    expect(state.theme).toBe('dark');
    expect(localStorage.getItem('covertone-settings')).toContain('"theme":"dark"');
  });

  it('loads persisted settings from localStorage', () => {
    localStorage.setItem('covertone-settings', JSON.stringify({ theme: 'amoled' }));
    settings.reload();
    const state = get(settings);
    expect(state.theme).toBe('amoled');
  });

  it('reset restores to defaults', () => {
    settings.setTheme('dark');
    settings.reset();
    const state = get(settings);
    expect(state.theme).toBe('system');
  });

  it('appliedTheme returns "dark" when theme is dark', () => {
    settings.setTheme('dark');
    const state = get(settings);
    expect(state.appliedTheme).toBe('dark');
  });

  it('persists and loads server config', () => {
    settings.setServerConfig({
      server: 'https://navidrome.example.com',
      username: 'user',
      password: 'pass',
    });
    const state = get(settings);
    expect(state.serverUrl).toBe('https://navidrome.example.com');
    expect(state.username).toBe('user');
    expect(state.password).toBe('pass');
    expect(state.isConfigured).toBe(true);

    settings.reload();
    const loaded = get(settings);
    expect(loaded.serverUrl).toBe('https://navidrome.example.com');
    expect(loaded.username).toBe('user');
  });

  it('isConfigured returns false when no server URL', () => {
    const state = get(settings);
    expect(state.isConfigured).toBe(false);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { router } from '$lib/stores/router';

const listeners: Array<(e: HashChangeEvent) => void> = [];

beforeEach(() => {
  listeners.length = 0;
  Object.defineProperty(window, 'location', { value: { hash: '' }, writable: true });
  window.addEventListener = vi.fn((event: string, cb: any) => {
    if (event === 'hashchange') listeners.push(cb);
  }) as any;
  window.removeEventListener = vi.fn() as any;
});

function setHash(hash: string) {
  (window.location as any).hash = hash;
  listeners.forEach(cb => cb(new HashChangeEvent('hashchange')));
}

describe('router store', () => {
  it('defaults to /', () => {
    router.reset();
    const route = get(router);
    expect(route.path).toBe('/');
    expect(route.params).toEqual({});
  });

  it('parses path from hash', () => {
    setHash('#/albums');
    router.reset();
    const route = get(router);
    expect(route.path).toBe('/albums');
    expect(route.params).toEqual({});
  });

  it('navigate updates hash', () => {
    router.reset();
    router.navigate('/artists');
    expect(window.location.hash).toBe('#/artists');
  });

  it('matchRoute matches exact paths', () => {
    setHash('#/albums');
    router.reset();
    const route = get(router);
    expect(route.matches('/albums')).toBe(true);
    expect(route.matches('/artists')).toBe(false);
  });

  it('matchRoute matches dynamic segments', () => {
    setHash('#/album/abc-123');
    router.reset();
    const route = get(router);
    expect(route.matches('/album/:id')).toBe(true);
  });

  it('extractParam extracts dynamic param value', () => {
    setHash('#/album/my-album-id');
    router.reset();
    const route = get(router);
    route.matches('/album/:id');
    expect(route.params.id).toBe('my-album-id');
  });

  it('handles empty hash', () => {
    setHash('');
    router.reset();
    const route = get(router);
    expect(route.path).toBe('/');
  });

  it('handles hash with no leading slash', () => {
    setHash('#albums');
    router.reset();
    const route = get(router);
    expect(route.path).toBe('/albums');
  });
});

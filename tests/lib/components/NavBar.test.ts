import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NavBar from '$lib/components/NavBar.svelte';

const mockRoute = { path: '/', params: {}, matches: () => false };

vi.mock('$lib/stores/router', () => ({
  router: {
    subscribe: vi.fn((cb: (route: typeof mockRoute) => void) => {
      cb(mockRoute);
      return vi.fn();
    }),
    navigate: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('NavBar', () => {
  it('renders all navigation links', () => {
    render(NavBar);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Albums')).toBeTruthy();
    expect(screen.getByText('Artists')).toBeTruthy();
    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByText('Game')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});

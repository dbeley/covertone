import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NowPlayingBar from '$lib/components/NowPlayingBar.svelte';

const mockPlayerState = {
  status: 'idle' as const,
  currentTrack: null as { title: string; artist: string; coverArt?: string } | null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  repeating: false,
  shuffle: false,
  favorited: false,
};

vi.mock('$lib/stores/player', () => ({
  player: {
    subscribe: vi.fn((cb: (state: typeof mockPlayerState) => void) => {
      cb(mockPlayerState);
      return vi.fn();
    }),
    togglePlay: vi.fn(),
    playTrack: vi.fn(),
  },
}));

vi.mock('$lib/stores/settings', () => ({
  settings: {
    subscribe: vi.fn((cb: (state: { serverUrl: string }) => void) => {
      cb({ serverUrl: 'http://example.com', username: 'user', password: 'pass', isConfigured: true, theme: 'dark', appliedTheme: 'dark' });
      return vi.fn();
    }),
  },
}));

describe('NowPlayingBar', () => {
  beforeEach(() => {
    mockPlayerState.status = 'idle';
    mockPlayerState.currentTrack = null;
  });

  it('shows placeholder when idle', () => {
    render(NowPlayingBar);
    expect(screen.getByText('Nothing playing')).toBeTruthy();
  });

  it('renders track info when playing', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', coverArt: '123' };
    render(NowPlayingBar);
    expect(screen.getByText('Test Song')).toBeTruthy();
    expect(screen.getByText('Test Artist')).toBeTruthy();
  });

  it('renders play/pause and queue buttons when playing', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', coverArt: '123' };
    render(NowPlayingBar);
    expect(screen.getByLabelText('Pause')).toBeTruthy();
    expect(screen.getByLabelText('Queue')).toBeTruthy();
  });
});

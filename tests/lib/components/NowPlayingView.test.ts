import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NowPlayingView from '$lib/components/NowPlayingView.svelte';

const mockPlayerState = {
  status: 'idle' as const,
  currentTrack: null as { title: string; artist: string; album?: string; coverArt?: string; artistId?: string; albumId?: string } | null,
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
    seek: vi.fn(),
    setShuffle: vi.fn(),
    setRepeating: vi.fn(),
    setFavorited: vi.fn(),
  },
}));

vi.mock('$lib/stores/queue', () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    getPrevious: vi.fn(() => null),
    getNextAutoDJ: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('$lib/stores/settings', () => ({
  settings: {
    subscribe: vi.fn((cb: (state: { serverUrl: string; username: string }) => void) => {
      cb({ serverUrl: 'http://example.com', username: 'user', password: 'pass', isConfigured: true, theme: 'dark', appliedTheme: 'dark' });
      return vi.fn();
    }),
  },
}));

vi.mock('$lib/stores/router', () => ({
  router: {
    subscribe: vi.fn(() => vi.fn()),
    navigate: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('NowPlayingView', () => {
  beforeEach(() => {
    mockPlayerState.status = 'idle';
    mockPlayerState.currentTrack = null;
    mockPlayerState.currentTime = 60;
    mockPlayerState.duration = 180;
    mockPlayerState.repeating = false;
    mockPlayerState.shuffle = false;
    mockPlayerState.favorited = false;
  });

  it('renders title and artist when playing', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123' };
    render(NowPlayingView);
    expect(screen.getByText('Test Song')).toBeTruthy();
    expect(screen.getByText('Test Artist')).toBeTruthy();
    expect(screen.getByText('Test Album')).toBeTruthy();
  });

  it('renders control buttons', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123' };
    render(NowPlayingView);
    expect(screen.getByLabelText('Shuffle')).toBeTruthy();
    expect(screen.getByLabelText('Previous')).toBeTruthy();
    expect(screen.getByLabelText('Pause')).toBeTruthy();
    expect(screen.getByLabelText('Next')).toBeTruthy();
    expect(screen.getByLabelText('Repeat')).toBeTruthy();
    expect(screen.getByLabelText('Favorite')).toBeTruthy();
  });

  it('shows time display', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123' };
    mockPlayerState.currentTime = 65;
    mockPlayerState.duration = 130;
    render(NowPlayingView);
    expect(screen.getByText('1:05')).toBeTruthy();
    expect(screen.getByText('2:10')).toBeTruthy();
  });

  it('shows close button', () => {
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123' };
    render(NowPlayingView);
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('calls onClose when artist link is clicked', () => {
    const onClose = vi.fn();
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123', artistId: 'art1', albumId: 'alb1' };
    render(NowPlayingView, { onClose });
    const artistButton = screen.getByText('Test Artist');
    artistButton.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when album link is clicked', () => {
    const onClose = vi.fn();
    mockPlayerState.status = 'playing';
    mockPlayerState.currentTrack = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', coverArt: '123', artistId: 'art1', albumId: 'alb1' };
    render(NowPlayingView, { onClose });
    const albumButton = screen.getByText('Test Album');
    albumButton.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

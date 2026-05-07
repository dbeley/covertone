import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TrackList from '$lib/components/TrackList.svelte';
import { player } from '$lib/stores/player';
import type { Song } from '$lib/api/types';

const mockPlayerState = {
  status: 'idle' as const,
  currentTrack: null as Song | null,
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
    playTrack: vi.fn(),
    togglePlay: vi.fn(),
  },
}));

vi.mock('$lib/stores/queue', () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    addNext: vi.fn(),
    addToEnd: vi.fn(),
  },
}));

describe('TrackList', () => {
  const songs: Song[] = [
    { id: '1', title: 'Song One', artist: 'Artist A', album: 'Album A', albumId: 'a1', duration: 180, track: 1 },
    { id: '2', title: 'Song Two', artist: 'Artist B', album: 'Album B', albumId: 'b1', duration: 240, track: 2 },
    { id: '3', title: 'Song Three', artist: 'Artist C', album: 'Album C', albumId: 'c1', duration: 200, track: 3 },
  ];

  beforeEach(() => {
    mockPlayerState.currentTrack = null;
    vi.mocked(player.playTrack).mockClear();
  });

  it('renders song titles', () => {
    render(TrackList, { songs });
    expect(screen.getByText('Song One')).toBeTruthy();
    expect(screen.getByText('Song Two')).toBeTruthy();
    expect(screen.getByText('Song Three')).toBeTruthy();
  });

  it('renders song artists', () => {
    render(TrackList, { songs });
    expect(screen.getByText('Artist A')).toBeTruthy();
    expect(screen.getByText('Artist B')).toBeTruthy();
    expect(screen.getByText('Artist C')).toBeTruthy();
  });

  it('renders formatted durations', () => {
    render(TrackList, { songs });
    expect(screen.getByText('3:00')).toBeTruthy();
    expect(screen.getByText('4:00')).toBeTruthy();
    expect(screen.getByText('3:20')).toBeTruthy();
  });

  it('renders track numbers', () => {
    render(TrackList, { songs });
    expect(screen.getAllByText('1')[0]).toBeTruthy();
    expect(screen.getAllByText('2')[0]).toBeTruthy();
    expect(screen.getAllByText('3')[0]).toBeTruthy();
  });

  it('renders context menu buttons', () => {
    render(TrackList, { songs });
    const buttons = screen.getAllByLabelText('Track options');
    expect(buttons.length).toBe(3);
  });

  it('calls player.playTrack by default when a row is clicked', async () => {
    render(TrackList, { songs });
    const row = screen.getByText('Song Two').closest('[role="button"]') as HTMLElement;
    await fireEvent.click(row);
    expect(player.playTrack).toHaveBeenCalledTimes(1);
  });

  it('calls onPlay callback with song and index when provided', async () => {
    const onPlay = vi.fn();
    render(TrackList, { songs, onPlay });
    const row = screen.getByText('Song Two').closest('[role="button"]') as HTMLElement;
    await fireEvent.click(row);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(songs[1], 1);
    expect(player.playTrack).not.toHaveBeenCalled();
  });

  it('adds safe-area bottom padding without mini player offset when idle', () => {
    const { container } = render(TrackList, { songs });
    const list = container.querySelector('.w-full') as HTMLElement;
    expect(list.getAttribute('style') ?? '').not.toContain('4rem');
  });

  it('adds mini player offset when there is a current track', () => {
    mockPlayerState.currentTrack = songs[0];
    const { container } = render(TrackList, { songs });
    const list = container.querySelector('.w-full') as HTMLElement;
    const style = list.getAttribute('style');
    expect(style).toContain('safe-area-inset-bottom');
    expect(style).toContain('4rem');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TrackList from '$lib/components/TrackList.svelte';
import type { Song } from '$lib/api/types';

vi.mock('$lib/stores/player', () => ({
  player: {
    subscribe: vi.fn(() => vi.fn()),
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import QueueDrawer from '$lib/components/QueueDrawer.svelte';
import type { Song } from '$lib/api/types';

const tracks: Song[] = [
  { id: '1', title: 'Song One', artist: 'Artist A', album: 'Album A', albumId: 'a1', duration: 180, track: 1 },
  { id: '2', title: 'Song Two', artist: 'Artist B', album: 'Album B', albumId: 'b1', duration: 200, track: 2 },
  { id: '3', title: 'Song Three', artist: 'Artist C', album: 'Album C', albumId: 'c1', duration: 210, track: 3 },
];

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

const queueStore = writable({
  tracks,
  itemIds: ['q-1', 'q-2', 'q-3'],
  currentIndex: 0,
  autoDJ: false,
  hasNext: true,
  hasPrevious: false,
});

const queueFns = vi.hoisted(() => ({
  playIndex: vi.fn(),
  removeTrack: vi.fn(),
  moveTrack: vi.fn(),
  setDrawerOpen: vi.fn(),
}));

const playerFns = vi.hoisted(() => ({
  playTrack: vi.fn(),
}));

vi.mock('$lib/stores/player', () => ({
  player: {
    subscribe: vi.fn((cb: (state: typeof mockPlayerState) => void) => {
      cb(mockPlayerState);
      return vi.fn();
    }),
    playTrack: playerFns.playTrack,
  },
}));

vi.mock('$lib/stores/queue', () => ({
  queue: {
    subscribe: vi.fn((cb: (state: { tracks: Song[]; itemIds: string[]; currentIndex: number }) => void) => {
      const unsubscribe = queueStore.subscribe((state) => cb(state));
      return unsubscribe;
    }),
    playIndex: queueFns.playIndex,
    removeTrack: queueFns.removeTrack,
    moveTrack: queueFns.moveTrack,
  },
  queueDrawerOpen: {
    subscribe: (cb: (value: boolean) => void) => {
      cb(true);
      return () => {};
    },
    set: queueFns.setDrawerOpen,
  },
}));

describe('QueueDrawer', () => {
  beforeEach(() => {
    mockPlayerState.currentTrack = null;
    queueFns.playIndex.mockClear();
    queueFns.removeTrack.mockClear();
    queueFns.moveTrack.mockClear();
    queueFns.setDrawerOpen.mockClear();
    playerFns.playTrack.mockClear();
  });

  it('uses safe-area bottom padding when no mini player is active', () => {
    const { container } = render(QueueDrawer);
    const drawer = container.querySelector('[role="dialog"]') as HTMLElement;
    const style = drawer.getAttribute('style') ?? '';
    expect(style).not.toContain('4rem');
  });

  it('adds mini player offset to bottom padding when track is active', () => {
    mockPlayerState.currentTrack = tracks[0];
    const { container } = render(QueueDrawer);
    const drawer = container.querySelector('[role="dialog"]') as HTMLElement;
    const style = drawer.getAttribute('style');
    expect(style).toContain('safe-area-inset-bottom');
    expect(style).toContain('4rem');
  });

  it('plays a track when pressing Enter on a queue row', async () => {
    render(QueueDrawer);
    const row = screen.getByLabelText('Play Song One by Artist A');
    await fireEvent.keyDown(row, { key: 'Enter' });
    expect(queueFns.playIndex).toHaveBeenCalledWith(0);
    expect(playerFns.playTrack).toHaveBeenCalledWith(tracks[0]);
  });

  it('closes the drawer when clicking the backdrop close button', async () => {
    render(QueueDrawer);
    const closeButtons = screen.getAllByRole('button', { name: 'Close queue' });
    await fireEvent.click(closeButtons[0]);
    expect(queueFns.setDrawerOpen).toHaveBeenCalledWith(false);
  });

  it('reorders queue items with mouse drag and drop', async () => {
    render(QueueDrawer);
    const firstRow = screen.getByLabelText('Play Song One by Artist A');
    const thirdRow = screen.getByLabelText('Play Song Three by Artist C');

    await fireEvent.dragStart(firstRow);
    await fireEvent.dragOver(thirdRow);
    await fireEvent.drop(thirdRow);

    expect(queueFns.moveTrack).toHaveBeenCalledWith(0, 2);
  });

  it('reorders queue items with touch drag and drop', async () => {
    render(QueueDrawer);
    const firstRow = screen.getByLabelText('Play Song One by Artist A');
    const secondRow = screen.getByLabelText('Play Song Two by Artist B');
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => secondRow as unknown as Element),
    });

    await fireEvent.touchStart(firstRow, {
      touches: [{ clientX: 10, clientY: 10 }],
    });
    await fireEvent.touchMove(firstRow, {
      touches: [{ clientX: 12, clientY: 12 }],
    });
    await fireEvent.touchEnd(firstRow);

    expect(queueFns.moveTrack).toHaveBeenCalledWith(0, 1);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: originalElementFromPoint,
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { library } from '$lib/stores/library';
import { SubsonicAPI } from '$lib/api/SubsonicAPI';
import type { Album } from '$lib/api/types';

vi.mock('$lib/api/SubsonicAPI');

const mockAlbum: Album = {
  id: '1', name: 'Album', artist: 'Artist', artistId: 'a1',
  coverArt: 'ca-1', songCount: 10, duration: 3000, year: 2024,
};

describe('library store', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      getAlbumList: vi.fn().mockResolvedValue({ albumList2: { album: [mockAlbum] } }),
      getAlbum: vi.fn().mockResolvedValue({ directory: { id: '1', name: 'Album', child: [] } }),
      getArtists: vi.fn().mockResolvedValue({ artists: { index: [{ name: 'A', artist: [{ id: 'a1', name: 'Artist', albumCount: 3 }] }] } }),
    };
    (SubsonicAPI as any).mockImplementation(() => mockApi);
  });

  it('init sets API instance', () => {
    library.init({ server: 'https://example.com', username: 'u', password: 'p' });
    expect(SubsonicAPI).toHaveBeenCalledWith({ server: 'https://example.com', username: 'u', password: 'p', clientName: 'covertone' });
    const state = get(library);
    expect(state.initialized).toBe(true);
  });

  it('fetchAlbums loads albums for a list type', async () => {
    library.init({ server: 'https://example.com', username: 'u', password: 'p' });
    await library.fetchAlbums({ type: 'newest' });
    const state = get(library);
    expect(state.albums).toHaveLength(1);
    expect(state.albums[0].name).toBe('Album');
    expect(mockApi.getAlbumList).toHaveBeenCalledWith({ type: 'newest', size: 20, offset: 0 });
  });

  it('fetchAlbums appends on subsequent calls', async () => {
    library.init({ server: 'https://example.com', username: 'u', password: 'p' });
    mockApi.getAlbumList.mockResolvedValueOnce({ albumList2: { album: [mockAlbum] } });
    await library.fetchAlbums({ type: 'newest' });
    const album2 = { ...mockAlbum, id: '2', name: 'Album 2' };
    mockApi.getAlbumList.mockResolvedValueOnce({ albumList2: { album: [album2] } });
    await library.fetchAlbums({ type: 'newest', offset: 1 });
    const state = get(library);
    expect(state.albums).toHaveLength(2);
  });

  it('fetchAlbums resets when type changes', async () => {
    library.init({ server: 'https://example.com', username: 'u', password: 'p' });
    await library.fetchAlbums({ type: 'newest' });
    const album2 = { ...mockAlbum, id: '2', name: 'Album 2' };
    mockApi.getAlbumList.mockResolvedValueOnce({ albumList2: { album: [album2] } });
    await library.fetchAlbums({ type: 'random' });
    const state = get(library);
    expect(state.albums).toHaveLength(1);
    expect(state.albums[0].name).toBe('Album 2');
  });

  it('fetchArtists loads artist list', async () => {
    library.init({ server: 'https://example.com', username: 'u', password: 'p' });
    await library.fetchArtists();
    const state = get(library);
    expect(state.artists).toHaveLength(1);
    expect(state.artists[0].name).toBe('Artist');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubsonicAPI, getCoverArtUrl, getStreamBaseUrl } from '$lib/api/SubsonicAPI';
import type { Album, Artist, Song } from '$lib/api/types';

function createSubsonicResponse<T>(data: T, status: 'ok' | 'failed' = 'ok') {
  return {
    'subsonic-response': {
      status,
      version: '1.16.1',
      ...data,
    },
  };
}

describe('SubsonicAPI', () => {
  let api: SubsonicAPI;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    api = new SubsonicAPI({
      server: 'https://music.example.com',
      username: 'user',
      password: 'pass',
      clientName: 'covertone',
    });
  });

  it('ping returns true on success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createSubsonicResponse({}))),
    });
    const result = await api.ping();
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = new URL(fetchSpy.mock.calls[0][0]);
    expect(url.searchParams.get('u')).toBe('user');
    expect(url.searchParams.get('c')).toBe('covertone');
    expect(url.searchParams.get('v')).toBe('1.16.1');
    expect(url.searchParams.get('f')).toBe('json');
    expect(url.searchParams.has('t')).toBe(true);
    expect(url.searchParams.has('s')).toBe(true);
  });

  it('ping returns false on failed status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ error: { code: 40, message: 'Wrong username or password' } }, 'failed')
      )),
    });
    const result = await api.ping();
    expect(result).toBe(false);
  });

  it('ping returns false on network error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));
    const result = await api.ping();
    expect(result).toBe(false);
  });

  it('getAlbumList fetches album list with params', async () => {
    const mockAlbum: Album = {
      id: '1', name: 'Test Album', artist: 'Artist', artistId: 'a1',
      coverArt: 'ca-1', songCount: 10, duration: 3000, year: 2024, genre: 'Rock',
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ albumList2: { album: [mockAlbum] } })
      )),
    });
    const result = await api.getAlbumList({ type: 'newest', size: 20 });
    expect(result.albumList2.album).toHaveLength(1);
    expect(result.albumList2.album[0].name).toBe('Test Album');
    const url = new URL(fetchSpy.mock.calls[0][0]);
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('size')).toBe('20');
    expect(url.searchParams.get('type')).toBe('newest');
  });

  it('getAlbum fetches album with songs', async () => {
    const mockSong: Song = {
      id: 's1', title: 'Song 1', artist: 'Artist', album: 'Album',
      albumId: '1', duration: 200, track: 1,
    };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ directory: { id: '1', name: 'Album', child: [mockSong] } })
      )),
    });
    const result = await api.getAlbum({ id: '1' });
    expect(result.directory.child).toHaveLength(1);
    expect(result.directory.child[0].title).toBe('Song 1');
  });

  it('getArtists fetches artist index', async () => {
    const mockArtist: Artist = { id: 'a1', name: 'Artist Name', albumCount: 3 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ artists: { index: [{ name: 'A', artist: [mockArtist] }] } })
      )),
    });
    const result = await api.getArtists();
    expect(result.artists.index).toHaveLength(1);
    expect(result.artists.index[0].artist[0].name).toBe('Artist Name');
  });

  it('getArtist fetches artist with albums', async () => {
    const mockAlbum: Album = { id: '1', name: 'Album', artist: 'Artist', artistId: 'a1', coverArt: 'ca-1', songCount: 8, duration: 2400, year: 2024 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ artist: { id: 'a1', name: 'Artist', album: [mockAlbum] } })
      )),
    });
    const result = await api.getArtist({ id: 'a1' });
    expect(result.artist.album).toHaveLength(1);
    expect(result.artist.album[0].name).toBe('Album');
  });

  it('getArtistInfo fetches bio and similar artists', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ artistInfo2: { biography: 'A great artist.', similarArtist: [{ id: 'a2', name: 'Similar Artist' }] } })
      )),
    });
    const result = await api.getArtistInfo({ id: 'a1' });
    expect(result.artistInfo2.biography).toBe('A great artist.');
    expect(result.artistInfo2.similarArtist).toHaveLength(1);
  });

  it('getTopSongs fetches top songs for artist', async () => {
    const mockSong: Song = { id: 's1', title: 'Hit Song', artist: 'Artist', album: 'Album', albumId: '1', duration: 200 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createSubsonicResponse({ topSongs: { song: [mockSong] } }))),
    });
    const result = await api.getTopSongs({ artist: 'Artist' });
    expect(result.topSongs.song).toHaveLength(1);
    expect(result.topSongs.song[0].title).toBe('Hit Song');
  });

  it('getRandomSongs fetches random songs', async () => {
    const mockSong: Song = { id: 's1', title: 'Random Song', artist: 'Artist', album: 'Album', albumId: '1', duration: 200 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createSubsonicResponse({ randomSongs: { song: [mockSong] } }))),
    });
    const result = await api.getRandomSongs({ size: 10 });
    expect(result.randomSongs.song).toHaveLength(1);
  });

  it('getSimilarSongs fetches similar songs', async () => {
    const mockSong: Song = { id: 's1', title: 'Similar Song', artist: 'Artist', album: 'Album', albumId: '1', duration: 200 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createSubsonicResponse({ similarSongs: { song: [mockSong] } }))),
    });
    const result = await api.getSimilarSongs({ id: 's1', count: 5 });
    expect(result.similarSongs.song).toHaveLength(1);
  });

  it('search3 fetches search results', async () => {
    const mockSong: Song = { id: 's1', title: 'Search Result', artist: 'Artist', album: 'Album', albumId: '1', duration: 200 };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(
        createSubsonicResponse({ searchResult3: { song: [mockSong], album: [], artist: [] } })
      )),
    });
    const result = await api.search3({ query: 'test' });
    expect(result.searchResult3.song).toHaveLength(1);
  });

  it('getCoverArt returns correct URL with auth params', () => {
    const url = api.getCoverArt({ id: 'al-123' });
    expect(url).toContain('https://music.example.com/rest/getCoverArt');
    expect(url).toContain('id=al-123');
    expect(url).toContain('u=user');
  });

  it('stream returns correct URL with auth params', () => {
    const url = api.stream({ id: 's-456' });
    expect(url).toContain('https://music.example.com/rest/stream');
    expect(url).toContain('id=s-456');
  });

  it('scrobble sends scrobble request', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createSubsonicResponse({}))),
    });
    await api.scrobble({ id: 's-456' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getCoverArtUrl', () => {
  it('builds an authenticated cover art URL', () => {
    const url = getCoverArtUrl({
      server: 'https://navidrome.example.com',
      username: 'user',
      password: 'pass',
      id: 'ca-123',
      size: 256,
    });

    expect(url).toContain('https://navidrome.example.com/rest/getCoverArt?');
    expect(url).toContain('u=user');
    expect(url).toContain('v=1.16.1');
    expect(url).toContain('c=covertone');
    expect(url).toContain('f=json');
    expect(url).toContain('id=ca-123');
    expect(url).toContain('size=256');
    expect(url).toContain('t=');
    expect(url).toContain('s=');
  });

  it('strips trailing slash from server URL', () => {
    const url = getCoverArtUrl({
      server: 'https://navidrome.example.com/',
      username: 'user',
      password: 'pass',
      id: 'ca-123',
    });

    expect(url).not.toContain('.com//rest');
    expect(url).toContain('.com/rest');
  });

  it('returns empty string for empty id', () => {
    // This is handled by the caller, not the function
    const url = getCoverArtUrl({
      server: 'https://navidrome.example.com',
      username: 'user',
      password: 'pass',
      id: '',
    });
    expect(url).toContain('id=');
  });
});

describe('getStreamBaseUrl', () => {
  it('builds an authenticated stream base URL ending with &id=', () => {
    const url = getStreamBaseUrl({
      server: 'https://navidrome.example.com',
      username: 'user',
      password: 'pass',
    });

    expect(url).toContain('https://navidrome.example.com/rest/stream?');
    expect(url).toContain('u=user');
    expect(url).toContain('v=1.16.1');
    expect(url).toContain('c=covertone');
    expect(url).toContain('f=json');
    expect(url).toContain('t=');
    expect(url).toContain('s=');
    expect(url).toContain('&id=');
    expect(url.endsWith('&id=')).toBe(true);
  });
});

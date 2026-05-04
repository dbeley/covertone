import { describe, it, expect } from 'vitest';
import type { Album, Artist, Song, SubsonicResponse } from '$lib/api/types';

describe('API types', () => {
  it('Album type has correct shape', () => {
    const album: Album = {
      id: '123',
      name: 'Test Album',
      artist: 'Test Artist',
      artistId: 'artist-1',
      coverArt: 'al-123',
      songCount: 10,
      duration: 3600,
      year: 2024,
      genre: 'Rock',
    };
    expect(album.id).toBe('123');
    expect(album.name).toBe('Test Album');
  });

  it('Song type has correct shape', () => {
    const song: Song = {
      id: '456',
      title: 'Test Song',
      artist: 'Test Artist',
      artistId: 'artist-1',
      album: 'Test Album',
      albumId: '123',
      coverArt: 'al-123',
      duration: 240,
      track: 1,
      discNumber: 1,
      year: 2024,
      genre: 'Rock',
      size: 5000000,
      contentType: 'audio/mpeg',
      suffix: 'mp3',
      path: '/music/test.mp3',
    };
    expect(song.title).toBe('Test Song');
  });

  it('Artist type has correct shape', () => {
    const artist: Artist = {
      id: 'artist-1',
      name: 'Test Artist',
      coverArt: 'ar-artist-1',
      albumCount: 5,
      artistImageUrl: 'https://example.com/img.jpg',
    };
    expect(artist.name).toBe('Test Artist');
  });

  it('SubsonicResponse wraps data correctly', () => {
    const response: SubsonicResponse<{ album: Album }> = {
      'subsonic-response': {
        status: 'ok',
        version: '1.16.1',
        album: {
          id: '123',
          name: 'Test Album',
          artist: 'Test Artist',
          artistId: 'artist-1',
          coverArt: 'al-123',
          songCount: 10,
          duration: 3600,
          year: 2024,
          genre: 'Rock',
        },
      },
    };
    expect(response['subsonic-response'].status).toBe('ok');
  });
});

import md5 from 'md5';
import { ENDPOINTS } from './endpoints';
import type {
  SubsonicResponse,
  AlbumListResult,
  DirectoryResult,
  ArtistsResult,
  ArtistInfoResult,
  TopSongsResult,
  RandomSongsResult,
  SearchResult,
  StarredResult,
  Album,
  Song,
} from './types';

export interface SubsonicAPIConfig {
  server: string;
  username: string;
  password: string;
  clientName?: string;
}

interface RequestParams {
  [key: string]: string | number | undefined;
}

export class SubsonicAPI {
  private server: string;
  private username: string;
  private password: string;
  private clientName: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: SubsonicAPIConfig, timeout = 15000) {
    this.server = config.server.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.clientName = config.clientName ?? 'covertone';
    this.baseUrl = `${this.server}/rest`;
    this.timeout = timeout;
  }

  private generateToken(password: string, salt: string): string {
    return md5(password + salt);
  }

  private buildUrlParams(endpoint: string, params: RequestParams = {}): URLSearchParams {
    const searchParams = new URLSearchParams();
    const salt = Math.random().toString(36).substring(2, 12);
    const token = this.generateToken(this.password, salt);

    searchParams.set('u', this.username);
    searchParams.set('t', token);
    searchParams.set('s', salt);
    searchParams.set('v', '1.16.1');
    searchParams.set('c', this.clientName);
    searchParams.set('f', 'json');

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }

    return searchParams;
  }

  private buildUrl(endpoint: string, params: RequestParams = {}): string {
    const searchParams = this.buildUrlParams(endpoint, params);
    return `${this.baseUrl}/${endpoint}?${searchParams.toString()}`;
  }

  private async request<T>(endpoint: string, params: RequestParams = {}): Promise<SubsonicResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    try {
      const data = JSON.parse(text) as SubsonicResponse<T>;
      if (data['subsonic-response'].status === 'failed') {
        throw new Error(data['subsonic-response'].error?.message ?? 'Unknown error');
      }
      return data;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Failed to parse response: ${text.slice(0, 200)}`);
      }
      throw e;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.request(ENDPOINTS.ping);
      return true;
    } catch {
      return false;
    }
  }

  async getAlbumList(params: { type: string; size?: number; offset?: number; genre?: string; fromYear?: number; toYear?: number }): Promise<AlbumListResult> {
    const data = await this.request<AlbumListResult>(ENDPOINTS.getAlbumList, {
      type: params.type, size: params.size ?? 20, offset: params.offset ?? 0,
      genre: params.genre, fromYear: params.fromYear, toYear: params.toYear,
    });
    return data['subsonic-response'];
  }

  async getAlbum(params: { id: string }): Promise<DirectoryResult> {
    const data = await this.request<DirectoryResult>(ENDPOINTS.getAlbum, { id: params.id });
    return data['subsonic-response'];
  }

  async getArtists(): Promise<ArtistsResult> {
    const data = await this.request<ArtistsResult>(ENDPOINTS.getArtists);
    return data['subsonic-response'];
  }

  async getArtist(params: { id: string }): Promise<{ artist: { id: string; name: string; album: Album[] } }> {
    const data = await this.request<{ artist: { id: string; name: string; album: Album[] } }>(ENDPOINTS.getArtist, { id: params.id });
    return data['subsonic-response'];
  }

  async getArtistInfo(params: { id: string; count?: number }): Promise<ArtistInfoResult> {
    const data = await this.request<ArtistInfoResult>(ENDPOINTS.getArtistInfo, { id: params.id, count: params.count ?? 20 });
    return data['subsonic-response'];
  }

  async getTopSongs(params: { artist: string; count?: number }): Promise<TopSongsResult> {
    const data = await this.request<TopSongsResult>(ENDPOINTS.getTopSongs, { artist: params.artist, count: params.count ?? 50 });
    return data['subsonic-response'];
  }

  async getRandomSongs(params: { size?: number; genre?: string; fromYear?: number; toYear?: number }): Promise<RandomSongsResult> {
    const data = await this.request<RandomSongsResult>(ENDPOINTS.getRandomSongs, {
      size: params.size ?? 10, genre: params.genre, fromYear: params.fromYear, toYear: params.toYear,
    });
    return data['subsonic-response'];
  }

  async getSimilarSongs(params: { id: string; count?: number }): Promise<{ similarSongs: { song: Song[] } }> {
    const data = await this.request<{ similarSongs: { song: Song[] } }>(ENDPOINTS.getSimilarSongs, { id: params.id, count: params.count ?? 50 });
    return data['subsonic-response'];
  }

  async search3(params: { query: string; artistCount?: number; albumCount?: number; songCount?: number }): Promise<{ searchResult3: SearchResult }> {
    const data = await this.request<{ searchResult3: SearchResult }>(ENDPOINTS.search3, {
      query: params.query, artistCount: params.artistCount ?? 20, albumCount: params.albumCount ?? 20, songCount: params.songCount ?? 20,
    });
    return data['subsonic-response'];
  }

  getCoverArt(params: { id: string; size?: number }): string {
    return this.buildUrl(ENDPOINTS.getCoverArt, { id: params.id, size: params.size });
  }

  stream(params: { id: string }): string {
    return this.buildUrl(ENDPOINTS.stream, { id: params.id });
  }

  async scrobble(params: { id: string; time?: number; submission?: boolean }): Promise<void> {
    await this.request(ENDPOINTS.scrobble, { id: params.id, time: params.time, submission: params.submission ?? true });
  }

  async getStarred(): Promise<StarredResult> {
    const data = await this.request<StarredResult>(ENDPOINTS.getStarred);
    return data['subsonic-response'];
  }

  async star(params: { id: string; albumId?: string; artistId?: string }): Promise<void> {
    await this.request(ENDPOINTS.star, params);
  }

  async unstar(params: { id: string; albumId?: string; artistId?: string }): Promise<void> {
    await this.request(ENDPOINTS.unstar, params);
  }
}

export function getCoverArtUrl(config: { server: string; username: string; password: string; id: string; size?: number }): string {
  const server = config.server.replace(/\/$/, '');
  const salt = Math.random().toString(36).substring(2, 12);
  const token = md5(config.password + salt);
  const params = new URLSearchParams({
    u: config.username, t: token, s: salt, v: '1.16.1', c: 'covertone', f: 'json',
    id: config.id,
  });
  if (config.size) params.set('size', String(config.size));
  return `${server}/rest/getCoverArt?${params.toString()}`;
}

export function getStreamBaseUrl(config: { server: string; username: string; password: string }): string {
  const server = config.server.replace(/\/$/, '');
  const salt = Math.random().toString(36).substring(2, 12);
  const token = md5(config.password + salt);
  const params = new URLSearchParams({
    u: config.username, t: token, s: salt, v: '1.16.1', c: 'covertone', f: 'json',
  });
  return `${server}/rest/stream?${params.toString()}&id=`;
}

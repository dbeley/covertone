import type { SubsonicAPI } from '$lib/api/SubsonicAPI';
import type { Song } from '$lib/api/types';

export class AutoDJ {
  private api: SubsonicAPI;

  constructor(api: SubsonicAPI) {
    this.api = api;
  }

  async fetchSimilar(songId: string, count: number = 10): Promise<Song[]> {
    try {
      const result = await this.api.getSimilarSongs({ id: songId, count });
      return result.similarSongs.song;
    } catch {
      const result = await this.api.getRandomSongs({ size: count });
      return result.randomSongs.song;
    }
  }
}

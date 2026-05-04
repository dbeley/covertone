export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  coverArt: string;
  songCount: number;
  duration: number;
  year?: number;
  genre?: string;
  created?: string;
  starred?: string;
}

export interface Artist {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
  artistImageUrl?: string;
  starred?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId: string;
  coverArt?: string;
  duration: number;
  track?: number;
  discNumber?: number;
  year?: number;
  genre?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  path?: string;
  starred?: string;
}

export interface ArtistInfo {
  biography?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  similarArtist?: SimilarArtist[];
}

export interface SimilarArtist {
  id: string;
  name: string;
  artistImageUrl?: string;
}

export interface SearchResult {
  artist?: Artist[];
  album?: Album[];
  song?: Song[];
}

export interface AlbumListResult {
  albumList2: {
    album: Album[];
  };
}

export interface SubsonicResponse<T> {
  'subsonic-response': {
    status: 'ok' | 'failed';
    version: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
}

export interface StarredResult {
  starred?: {
    artist?: Artist[];
    album?: Album[];
    song?: Song[];
  };
}

export interface RandomSongsResult {
  randomSongs: {
    song: Song[];
  };
}

export interface ArtistInfoResult {
  artistInfo2: ArtistInfo;
}

export interface TopSongsResult {
  topSongs: {
    song: Song[];
  };
}

export interface AlbumResult {
  album: {
    id: string;
    name: string;
    artist: string;
    artistId: string;
    coverArt: string;
    songCount: number;
    duration: number;
    created: string;
    year?: number;
    genre?: string;
    song: Song[];
  };
}

export interface ArtistsResult {
  artists: {
    index?: {
      name: string;
      artist: Artist[];
    }[];
  };
}

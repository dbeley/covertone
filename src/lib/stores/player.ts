import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import { AudioEngine } from "$lib/player/AudioEngine";
import { scrobbleTrack, getCoverArtUrl } from "$lib/api/SubsonicAPI";
import {
  resolveStream,
  isSongCached,
  revokeStreamUrl,
  resolveCoverArt,
} from "$lib/offline/resolve";
import { settings } from "$lib/stores/settings";
import * as NativeMedia from "$lib/player/NativeMedia";
import type { Song } from "$lib/api/types";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused";

export interface PlayerState {
  status: PlayerStatus;
  currentTrack: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  repeating: boolean;
  shuffle: boolean;
  favorited: boolean;
}

function createPlayer() {
  let engine: AudioEngine | null = null;
  let streamBase = "";
  let apiConfig: { server: string; username: string; password: string } | null =
    null;
  let scrobbled = false;
  let generation = 0;

  const store: Writable<PlayerState> = writable({
    status: "idle",
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    repeating: false,
    shuffle: false,
    favorited: false,
  });

  const { subscribe, set, update } = store;

  function fireScrobble(id: string, submission: boolean, time?: number) {
    if (!apiConfig) return;
    if (!get(settings).scrobbleEnabled) return;
    scrobbleTrack({
      server: apiConfig.server,
      username: apiConfig.username,
      password: apiConfig.password,
      id,
      submission,
      time,
    });
  }

  let lastTrack: Song | null = null;
  let lastPrevTapTime = 0;
  let nativeMediaCleanup: (() => void) | null = null;
  const coverUrl = (track: Song | null): string | undefined => {
    if (!track?.coverArt) return undefined;
    const s = get(settings);
    return getCoverArtUrl({
      server: s.serverUrl,
      username: s.username,
      password: s.password,
      id: track.coverArt,
      size: 512,
    });
  };

  nativeMediaCleanup = NativeMedia.listen({
    onPlay: () => {
      if (lastTrack && streamBase) {
        if (engine) {
          engine.play();
          update((s) => ({ ...s, status: "playing" }));
          const s = get(store);
          if (s.currentTrack)
            NativeMedia.showPlaying(
              s.currentTrack.title,
              s.currentTrack.artist,
              coverUrl(s.currentTrack),
            );
        } else {
          player.playTrack(lastTrack);
        }
      }
    },
    onPause: () => {
      update((s) => ({ ...s, status: "paused" }));
      if (engine) engine.pause();
      const s = get(store);
      if (s.currentTrack)
        NativeMedia.showPaused(
          s.currentTrack.title,
          s.currentTrack.artist,
          coverUrl(s.currentTrack),
        );
    },
    onStop: () => {
      update((s) => ({ ...s, status: "idle" }));
      if (engine) engine.pause();
      NativeMedia.hide();
    },
    onNext: async () => {
      const { queue } = await import("$lib/stores/queue");
      const next = await queue.getNextAutoDJ();
      if (next) player.playTrack(next);
    },
    onPrev: () => {
      player.handlePreviousTrack();
    },
  });

  return {
    subscribe,
    setStreamBase(url: string) {
      streamBase = url;
    },
    setApiConfig(config: {
      server: string;
      username: string;
      password: string;
    }) {
      apiConfig = config;
    },
    playTrack(track: Song) {
      lastTrack = track;
      import("$lib/stores/queue").then(({ queue }) => {
        queue.syncCurrentTrack(track);
      });
      const currentState = get(store);

      // Stop holding a blob URL for a previous, different track.
      const prevTrackId = currentState.currentTrack?.id;
      if (prevTrackId && prevTrackId !== track.id) {
        revokeStreamUrl(prevTrackId);
      }

      if (currentState.currentTrack && !scrobbled) {
        const minScrobbleTime = Math.min(30, currentState.duration / 2);
        if (currentState.currentTime >= minScrobbleTime) {
          fireScrobble(
            currentState.currentTrack.id,
            true,
            Math.floor(currentState.currentTime),
          );
        }
      }

      if (engine) engine.destroy();
      generation++;
      const currentGeneration = generation;
      engine = new AudioEngine();
      scrobbled = false;

      const currentEngine = engine;
      engine.onTimeUpdate(() => {
        if (currentGeneration !== generation) return;
        update((s) => ({
          ...s,
          currentTime: currentEngine?.getCurrentTime() ?? 0,
        }));
      });
      engine.onEnded(async () => {
        if (currentGeneration !== generation) return;
        update((s) => {
          if (s.currentTrack) fireScrobble(s.currentTrack.id, true);
          return { ...s, status: "idle" };
        });
        scrobbled = true;

        const { queue } = await import("$lib/stores/queue");
        const next = await queue.getNextAutoDJ();
        if (next) {
          player.playTrack(next);
        } else {
          NativeMedia.hide();
        }
      });
      engine.onLoaded((duration) => {
        if (currentGeneration !== generation) return;
        update((s) => ({ ...s, duration, status: "playing" }));
      });

      // If a stream fails to load (e.g. offline but the presence hint hadn't
      // caught up yet), retry once from the offline cache when available.
      let retriedOffline = false;
      currentEngine.onError(() => {
        if (currentGeneration !== generation || retriedOffline) return;
        retriedOffline = true;
        void resolveStream(track.id).then((offline) => {
          if (!offline || currentGeneration !== generation) return;
          currentEngine.load(offline);
          currentEngine.play().catch(() => {});
        });
      });

      update((s) => ({
        ...s,
        currentTrack: track,
        status: "loading",
        favorited: !!track.starred,
      }));

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
        });
        navigator.mediaSession.setActionHandler("play", () => {
          update((s) => ({ ...s, status: "playing" }));
          if (engine) engine.play();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          update((s) => ({ ...s, status: "paused" }));
          if (engine) engine.pause();
        });
        navigator.mediaSession.setActionHandler("seekto", (d) => {
          if (d.seekTime != null && engine) engine.seek(d.seekTime);
        });
      }

      const targetEngine = engine;
      const targetGeneration = generation;

      const offlinePlay = (offline: string | null) => {
        targetEngine.load(offline ?? `${streamBase}${track.id}`);
        return targetEngine.play().catch(() => {
          update((s) => ({ ...s, status: "paused" }));
        });
      };

      if (isSongCached(track.id)) {
        resolveStream(track.id)
          .then((offline) => {
            if (targetGeneration !== generation) return;
            return offlinePlay(offline);
          })
          .catch(() => {
            if (targetGeneration !== generation) return;
            offlinePlay(null);
          });
      } else {
        offlinePlay(null);
      }

      const artUrl = coverUrl(track);
      NativeMedia.showPlaying(track.title, track.artist, artUrl);
      fireScrobble(track.id, false);

      // Offline: the remote artwork URL can't load without a connection, so
      // refresh the native notification with the cached cover art when the
      // track's album has any (fire-and-forget; the blob URL resolves async).
      if (isSongCached(track.id)) {
        void resolveCoverArt(track.albumId, 512).then((url) => {
          if (targetGeneration !== generation || !url) return;
          NativeMedia.showPlaying(track.title, track.artist, url);
        });
      }
    },
    pause() {
      if (engine) {
        engine.pause();
        update((s) => ({ ...s, status: "paused" }));
        const s = get(store);
        if (s.currentTrack)
          NativeMedia.showPaused(
            s.currentTrack.title,
            s.currentTrack.artist,
            coverUrl(s.currentTrack),
          );
      }
    },
    resume() {
      if (engine) {
        engine.play();
        update((s) => ({ ...s, status: "playing" }));
        const s = get(store);
        if (s.currentTrack)
          NativeMedia.showPlaying(
            s.currentTrack.title,
            s.currentTrack.artist,
            coverUrl(s.currentTrack),
          );
      }
    },
    togglePlay() {
      if (!engine) return;
      if (engine.isPaused()) {
        this.resume();
      } else {
        this.pause();
      }
    },
    stop() {
      lastTrack = null;
      const cur = get(store).currentTrack;
      if (cur) revokeStreamUrl(cur.id);
      import("$lib/stores/queue").then(({ queue }) => {
        queue.syncCurrentTrack(null);
      });
      if (engine) {
        engine.destroy();
        engine = null;
      }
      NativeMedia.hide();
      update((s) => ({
        ...s,
        status: "idle",
        currentTrack: null,
        currentTime: 0,
        duration: 0,
      }));
    },
    seek(time: number) {
      if (engine) engine.seek(time);
    },
    handlePreviousTrack() {
      const now = Date.now();
      const state = get(store);
      if (state.currentTime > 3 && now - lastPrevTapTime > 3000) {
        lastPrevTapTime = now;
        this.seek(0);
        return;
      }
      lastPrevTapTime = now;
      import("$lib/stores/queue").then(({ queue }) => {
        const prev = queue.getPrevious();
        if (prev) this.playTrack(prev);
      });
    },
    setVolume(volume: number) {
      if (engine) engine.setVolume(volume);
      update((s) => ({ ...s, volume }));
    },
    setRepeating(repeating: boolean) {
      update((s) => ({ ...s, repeating }));
    },
    setShuffle(shuffle: boolean) {
      update((s) => ({ ...s, shuffle }));
      import("$lib/stores/queue").then(({ queue }) => {
        queue.setShuffle(shuffle);
      });
    },
    setFavorited(favorited: boolean) {
      update((s) => ({ ...s, favorited }));
    },
    reset() {
      lastTrack = null;
      if (nativeMediaCleanup) {
        nativeMediaCleanup();
        nativeMediaCleanup = null;
      }
      import("$lib/stores/queue").then(({ queue }) => {
        queue.syncCurrentTrack(null);
      });
      if (engine) {
        engine.destroy();
        engine = null;
      }
      set({
        status: "idle",
        currentTrack: null,
        currentTime: 0,
        duration: 0,
        volume: 1,
        repeating: false,
        shuffle: false,
        favorited: false,
      });
    },
  };
}

export const player = createPlayer();

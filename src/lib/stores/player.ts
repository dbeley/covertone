import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import { AudioEngine } from "$lib/player/AudioEngine";
import { scrobbleTrack } from "$lib/api/SubsonicAPI";
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

  NativeMedia.listen({
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
        NativeMedia.showPaused(s.currentTrack.title, s.currentTrack.artist);
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
      import("$lib/stores/queue").then(({ queue }) => {
        const prev = queue.getPrevious();
        if (prev) player.playTrack(prev);
      });
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
      const currentState = get(store);

      if (currentState.currentTrack && !scrobbled) {
        fireScrobble(
          currentState.currentTrack.id,
          true,
          Math.floor(currentState.currentTime),
        );
      }

      if (engine) engine.destroy();
      engine = new AudioEngine();
      scrobbled = false;

      engine.onTimeUpdate(() => {
        update((s) => ({ ...s, currentTime: engine!.getCurrentTime() }));
      });
      engine.onEnded(async () => {
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
        update((s) => ({ ...s, duration, status: "playing" }));
      });

      update((s) => ({ ...s, currentTrack: track, status: "loading" }));

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

      engine.load(`${streamBase}${track.id}`);
      engine.play();

      let artUrl: string | undefined;
      if (track.coverArt) {
        const s = get(settings);
        artUrl = `${s.serverUrl.replace(/\/$/, "")}/rest/getCoverArt?id=${track.coverArt}&size=512`;
      }
      NativeMedia.showPlaying(track.title, track.artist, artUrl);
      fireScrobble(track.id, false);
    },
    pause() {
      if (engine) {
        engine.pause();
        update((s) => ({ ...s, status: "paused" }));
        const s = get(store);
        if (s.currentTrack)
          NativeMedia.showPaused(s.currentTrack.title, s.currentTrack.artist);
      }
    },
    resume() {
      if (engine) {
        engine.play();
        update((s) => ({ ...s, status: "playing" }));
        const s = get(store);
        if (s.currentTrack)
          NativeMedia.showPlaying(s.currentTrack.title, s.currentTrack.artist);
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
    setVolume(volume: number) {
      if (engine) engine.setVolume(volume);
      update((s) => ({ ...s, volume }));
    },
    setRepeating(repeating: boolean) {
      update((s) => ({ ...s, repeating }));
    },
    setShuffle(shuffle: boolean) {
      update((s) => ({ ...s, shuffle }));
    },
    setFavorited(favorited: boolean) {
      update((s) => ({ ...s, favorited }));
    },
    reset() {
      lastTrack = null;
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

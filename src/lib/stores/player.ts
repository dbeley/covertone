import { writable, get } from "svelte/store";
import { AudioEngine } from "$lib/player/AudioEngine";
import { scrobbleTrack } from "$lib/api/SubsonicAPI";
import { settings } from "$lib/stores/settings";
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

  const { subscribe, set, update } = writable<PlayerState>({
    status: "idle",
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    repeating: false,
    shuffle: false,
    favorited: false,
  });

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
      let currentState: PlayerState | undefined;
      update((s) => {
        currentState = s;
        return s;
      });

      if (currentState?.currentTrack && !scrobbled) {
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
      engine.onEnded(() => {
        update((s) => {
          if (s.currentTrack) {
            fireScrobble(s.currentTrack.id, true);
          }
          return { ...s, status: "idle" };
        });
        scrobbled = true;
      });
      engine.onLoaded((duration) => {
        update((s) => ({ ...s, duration, status: "playing" }));
      });

      update((s) => ({ ...s, currentTrack: track, status: "loading" }));
      engine.load(`${streamBase}${track.id}`);
      engine.play();

      fireScrobble(track.id, false);
    },
    pause() {
      if (engine) {
        engine.pause();
        update((s) => ({ ...s, status: "paused" }));
      }
    },
    resume() {
      if (engine) {
        engine.play();
        update((s) => ({ ...s, status: "playing" }));
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
      if (engine) {
        engine.destroy();
        engine = null;
      }
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

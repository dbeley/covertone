import { writable } from 'svelte/store';
import { AudioEngine } from '$lib/player/AudioEngine';
import type { Song } from '$lib/api/types';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused';

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
  let streamBase = '';

  const { subscribe, set, update } = writable<PlayerState>({
    status: 'idle',
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    repeating: false,
    shuffle: false,
    favorited: false,
  });

  return {
    subscribe,
    setStreamBase(url: string) {
      streamBase = url;
    },
    playTrack(track: Song) {
      if (engine) engine.destroy();
      engine = new AudioEngine();

      engine.onTimeUpdate(() => {
        update(s => ({ ...s, currentTime: engine!.getCurrentTime() }));
      });
      engine.onEnded(() => {
        update(s => ({ ...s, status: 'idle' }));
      });
      engine.onLoaded((duration) => {
        update(s => ({ ...s, duration, status: 'playing' }));
      });

      update(s => ({ ...s, currentTrack: track, status: 'loading' }));
      engine.load(`${streamBase}${track.id}`);
      engine.play();
    },
    pause() {
      if (engine) {
        engine.pause();
        update(s => ({ ...s, status: 'paused' }));
      }
    },
    resume() {
      if (engine) {
        engine.play();
        update(s => ({ ...s, status: 'playing' }));
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
      update(s => ({
        ...s,
        status: 'idle',
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
      update(s => ({ ...s, volume }));
    },
    setRepeating(repeating: boolean) {
      update(s => ({ ...s, repeating }));
    },
    setShuffle(shuffle: boolean) {
      update(s => ({ ...s, shuffle }));
    },
    setFavorited(favorited: boolean) {
      update(s => ({ ...s, favorited }));
    },
    reset() {
      if (engine) {
        engine.destroy();
        engine = null;
      }
      set({
        status: 'idle',
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

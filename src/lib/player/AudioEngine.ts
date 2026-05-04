export type TimeUpdateCallback = (current: number, duration: number) => void;
export type EndedCallback = () => void;
export type LoadedCallback = (duration: number) => void;

export class AudioEngine {
  private audio: HTMLAudioElement;
  private onTimeUpdateCb: TimeUpdateCallback | null = null;
  private onEndedCb: EndedCallback | null = null;
  private onLoadedCb: LoadedCallback | null = null;

  private handleTimeUpdate = () => {
    if (this.onTimeUpdateCb) {
      this.onTimeUpdateCb(this.audio.currentTime, this.audio.duration);
    }
  };

  private handleEnded = () => {
    if (this.onEndedCb) this.onEndedCb();
  };

  private handleLoaded = () => {
    if (this.onLoadedCb) this.onLoadedCb(this.audio.duration);
  };

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("loadedmetadata", this.handleLoaded);
  }

  load(url: string): void {
    this.audio.src = url;
    this.audio.load();
  }

  play(): void {
    this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  toggle(): void {
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    return this.audio.duration;
  }

  isPaused(): boolean {
    return this.audio.paused;
  }

  onTimeUpdate(cb: TimeUpdateCallback): void {
    this.onTimeUpdateCb = cb;
  }

  onEnded(cb: EndedCallback): void {
    this.onEndedCb = cb;
  }

  onLoaded(cb: LoadedCallback): void {
    this.onLoadedCb = cb;
  }

  destroy(): void {
    this.audio.pause();
    this.audio.src = "";
    this.audio.removeEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.removeEventListener("ended", this.handleEnded);
    this.audio.removeEventListener("loadedmetadata", this.handleLoaded);
    this.onTimeUpdateCb = null;
    this.onEndedCb = null;
    this.onLoadedCb = null;
  }
}

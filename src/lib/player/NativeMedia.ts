interface NativeMediaInterface {
  setPlaying(title: string, artist: string, artworkUrl?: string): void;
  setPaused(title: string, artist: string, artworkUrl?: string): void;
  hide(): void;
  setArtwork(imageUrl: string): void;
}

declare global {
  interface Window {
    NativeMedia?: NativeMediaInterface;
  }
}

export function isNativeAvailable(): boolean {
  return typeof window !== "undefined" && !!window.NativeMedia;
}

export function showPlaying(
  title: string,
  artist: string,
  artworkUrl?: string,
) {
  if (typeof window === "undefined") return;
  if (artworkUrl) {
    window.NativeMedia?.setPlaying(title, artist, artworkUrl);
    return;
  }
  window.NativeMedia?.setPlaying(title, artist);
}

export function showPaused(title: string, artist: string, artworkUrl?: string) {
  if (typeof window === "undefined") return;
  if (artworkUrl) {
    window.NativeMedia?.setPaused(title, artist, artworkUrl);
    return;
  }
  window.NativeMedia?.setPaused(title, artist);
}

export function hide() {
  if (typeof window === "undefined") return;
  window.NativeMedia?.hide();
}

export function setArtwork(imageUrl: string) {
  if (typeof window === "undefined") return;
  window.NativeMedia?.setArtwork(imageUrl);
}

export function listen(callbacks: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}) {
  if (typeof window === "undefined") return () => {};

  const handler = (e: Event) => {
    const action = (e as CustomEvent).detail as string;
    switch (action) {
      case "play":
        callbacks.onPlay();
        break;
      case "pause":
        callbacks.onPause();
        break;
      case "next":
        callbacks.onNext();
        break;
      case "prev":
        callbacks.onPrev();
        break;
      case "stop":
        callbacks.onStop();
        break;
    }
  };

  document.addEventListener("native-mediasession", handler);
  return () => document.removeEventListener("native-mediasession", handler);
}

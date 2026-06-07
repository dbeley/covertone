import { writable } from "svelte/store";
import type { ColorPalette } from "$lib/color/ColorExtractor";
import { extractPalette } from "$lib/color/ColorExtractor";

const DEFAULT_PALETTE: ColorPalette = {
  primary: "#6366f1",
  secondary: "#818cf8",
  tertiary: "#4f46e5",
  accent: "#a5b4fc",
};

function createColors() {
  const { subscribe, set } = writable<ColorPalette>({ ...DEFAULT_PALETTE });

  const paletteCache = new Map<string, ColorPalette>();

  function applyPalette(palette: ColorPalette): void {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--accent", palette.primary);
    document.documentElement.style.setProperty(
      "--accent-secondary",
      palette.secondary,
    );
    document.documentElement.style.setProperty(
      "--accent-tertiary",
      palette.tertiary,
    );
    document.documentElement.style.setProperty(
      "--accent-highlight",
      palette.accent,
    );
    set(palette);
  }

  async function extractFromCover(
    coverUrl: string,
    coverArtId: string,
  ): Promise<void> {
    if (paletteCache.has(coverArtId)) {
      applyPalette(paletteCache.get(coverArtId)!);
      return;
    }
    const palette = await extractPalette(coverUrl);
    paletteCache.set(coverArtId, palette);
    applyPalette(palette);
  }

  function resetToDefault(): void {
    if (typeof document === "undefined") return;
    paletteCache.clear();
    applyPalette({ ...DEFAULT_PALETTE });
  }

  return {
    subscribe,
    extractFromCover,
    resetToDefault,
  };
}

export const colors = createColors();

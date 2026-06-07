import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractPaletteFromPixels, extractPalette, type ColorPalette } from '$lib/color/ColorExtractor';

describe('extractPaletteFromPixels', () => {
  it('returns default palette for empty pixel data', () => {
    const result = extractPaletteFromPixels([]);
    expect(result).toEqual({
      primary: '#6366f1',
      secondary: '#818cf8',
      tertiary: '#4f46e5',
      accent: '#a5b4fc',
    });
  });

  it('returns palette from solid color pixels', () => {
    const pixels: number[] = [];
    for (let i = 0; i < 100; i++) {
      pixels.push(255, 0, 0, 255);
    }
    const result = extractPaletteFromPixels(pixels);
    expect(result.primary).toBe('#ff0000');
    expect(result.secondary).toBe('#ff0000');
    expect(result.tertiary).toBe('#ff0000');
    expect(result.accent).toBe('#ff0000');
  });

  it('returns hex color strings for all palette keys', () => {
    const pixels: number[] = [];
    for (let i = 0; i < 100; i++) {
      pixels.push(100, 150, 200, 255);
    }
    const result = extractPaletteFromPixels(pixels);
    expect(result.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.tertiary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('skips transparent pixels', () => {
    const pixels: number[] = [];
    for (let i = 0; i < 50; i++) {
      pixels.push(255, 0, 0, 127);
    }
    for (let i = 0; i < 50; i++) {
      pixels.push(0, 255, 0, 255);
    }
    const result = extractPaletteFromPixels(pixels);
    expect(result.primary).toBe('#00ff00');
  });
});

function mockImageWithError() {
  const origImage = globalThis.Image;
  const mockImg = {
    crossOrigin: '',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    set src(_val: string) {
      setTimeout(() => {
        if (this.onerror) this.onerror();
      }, 0);
    },
  };
  vi.stubGlobal('Image', vi.fn(() => mockImg));
  return () => vi.stubGlobal('Image', origImage);
}

describe('extractPalette', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default palette when image loading fails', async () => {
    const cleanup = mockImageWithError();
    const result = await extractPalette('http://invalid/image.jpg');
    expect(result).toEqual({
      primary: '#6366f1',
      secondary: '#818cf8',
      tertiary: '#4f46e5',
      accent: '#a5b4fc',
    });
    cleanup();
  });
});

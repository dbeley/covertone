export interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
}

const DEFAULT_PALETTE: ColorPalette = {
  primary: "#6366f1",
  secondary: "#818cf8",
  tertiary: "#4f46e5",
  accent: "#a5b4fc",
};

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function collectFrequencies(pixels: number[]): Map<string, number> {
  const colorMap = new Map<string, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 128) continue;
    const hex = rgbToHex(r, g, b);
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }
  return colorMap;
}

function dominantColors(
  colorMap: Map<string, number>,
  count: number,
): string[] {
  return [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([color]) => color);
}

function brightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function extractPaletteFromPixels(pixels: number[]): ColorPalette {
  const colorMap = collectFrequencies(pixels);
  const dominant = dominantColors(colorMap, 10);

  if (dominant.length === 0) return { ...DEFAULT_PALETTE };

  const sortedByBrightness = [...dominant].sort(
    (a, b) => brightness(a) - brightness(b),
  );
  const darkest = sortedByBrightness[0];

  const vibrant =
    dominant.find((c) => {
      const b = brightness(c);
      return b > 80 && b < 200;
    }) || dominant[0];

  return {
    primary: dominant[0],
    secondary: dominant[1] || dominant[0],
    tertiary: darkest,
    accent: vibrant,
  };
}

export async function extractPalette(imageUrl: string): Promise<ColorPalette> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ...DEFAULT_PALETTE };

    const size = 50;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    return extractPaletteFromPixels([...imageData.data]);
  } catch {
    return { ...DEFAULT_PALETTE };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

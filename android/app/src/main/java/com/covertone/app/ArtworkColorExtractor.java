package com.covertone.app;

import android.graphics.Bitmap;

final class ArtworkColorExtractor {
    static final int FALLBACK_COLOR = 0xFF1DB954;

    private ArtworkColorExtractor() {
    }

    interface PixelReader {
        int getPixel(int x, int y);
    }

    static int extractDominantColor(Bitmap bitmap) {
        if (bitmap == null) {
            return FALLBACK_COLOR;
        }
        return extractDominantColor(bitmap.getWidth(), bitmap.getHeight(), bitmap::getPixel);
    }

    static int extractDominantColor(int width, int height, PixelReader pixelReader) {
        if (width <= 0 || height <= 0 || pixelReader == null) {
            return FALLBACK_COLOR;
        }

        long red = 0;
        long green = 0;
        long blue = 0;
        long count = 0;
        int stepX = Math.max(1, width / 24);
        int stepY = Math.max(1, height / 24);

        for (int y = 0; y < height; y += stepY) {
            for (int x = 0; x < width; x += stepX) {
                int color = pixelReader.getPixel(x, y);
                int alpha = (color >> 24) & 0xFF;
                if (alpha < 32) {
                    continue;
                }
                red += (color >> 16) & 0xFF;
                green += (color >> 8) & 0xFF;
                blue += color & 0xFF;
                count++;
            }
        }

        if (count == 0) {
            return FALLBACK_COLOR;
        }

        int avgRed = (int) (red / count);
        int avgGreen = (int) (green / count);
        int avgBlue = (int) (blue / count);
        return 0xFF000000 | (avgRed << 16) | (avgGreen << 8) | avgBlue;
    }
}

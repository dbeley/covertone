package com.covertone.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ArtworkColorExtractorTest {

    @Test
    public void extractDominantColor_returnsFallback_forInvalidInput() {
        int color = ArtworkColorExtractor.extractDominantColor(0, 4, (x, y) -> 0xFFFFFFFF);
        assertEquals(ArtworkColorExtractor.FALLBACK_COLOR, color);
    }

    @Test
    public void extractDominantColor_ignoresTransparentPixels() {
        int color = ArtworkColorExtractor.extractDominantColor(2, 2, (x, y) -> {
            if (x == 0 && y == 0) {
                return 0x00000000;
            }
            return 0xFF336699;
        });
        assertEquals(0xFF336699, color);
    }

    @Test
    public void extractDominantColor_averagesOpaquePixels() {
        int color = ArtworkColorExtractor.extractDominantColor(2, 2, (x, y) -> {
            if (x == 0 && y == 0) return 0xFFFF0000;
            if (x == 1 && y == 0) return 0xFF00FF00;
            if (x == 0 && y == 1) return 0xFF0000FF;
            return 0xFFFFFFFF;
        });

        assertEquals(0xFF7F7F7F, color);
    }
}

import path from 'path';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      '$lib': path.resolve(__dirname, 'src/lib'),
    },
  },
});

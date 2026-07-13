import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [WxtVitest(), svelte({ configFile: false })],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});

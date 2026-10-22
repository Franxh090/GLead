/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GLead',
        short_name: 'GLead',
        description:
          'Hear the key, find it on the guitar, fill the space. Ear-to-hand training for stuck intermediate guitarists.',
        theme_color: '#141a1f',
        background_color: '#141a1f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: true },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'dom', environment: 'jsdom', include: ['src/**/*.test.tsx'] },
      },
      { extends: true, test: { name: 'node', environment: 'node', include: ['src/**/*.test.ts'] } },
    ],
    testTimeout: 20_000,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/drills/**', 'src/theory/**', 'src/audio/**'],
      exclude: ['**/*.test.*', '**/index.ts', '**/*.tsx'],
    },
  },
});

import { VitePWA } from 'vite-plugin-pwa';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      // Phones with the app installed have a service worker registered under
      // this filename. Change it and they'd never get another update.
      filename: 'service-worker.js',
      manifest: {
        background_color: '#dfe8e2',
        description: 'Practice telling left from right.',
        display: 'standalone',
        icons: [
          { sizes: '192x192', src: 'icons/icon-192.png', type: 'image/png' },
          { sizes: '512x512', src: 'icons/icon-512.png', type: 'image/png' },
          {
            purpose: 'maskable',
            sizes: '512x512',
            src: 'icons/maskable-512.png',
            type: 'image/png',
          },
        ],
        name: 'Left Right',
        orientation: 'any',
        short_name: 'Left Right',
        theme_color: '#dfe8e2',
      },
      registerType: 'autoUpdate',
      workbox: {
        globIgnores: ['icons/**'],
        globPatterns: ['**/*.{css,html,js,svg,woff2}'],
        // Files in public/ don't get a hash in their filename, so only skip the
        // revision for names that do end in one. Otherwise an installed app
        // would keep an old copy of those files forever.
        dontCacheBustURLsMatching: /-[\w-]{8}\.(css|js|woff2)$/,
      },
    }),
    react(),
    // 'all_errors' fails the build when the compiler has to skip a component,
    // which it otherwise does without a word.
    babel({ presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })] }),
  ],
});

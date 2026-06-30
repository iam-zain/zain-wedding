import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Zain & Uzma · Shaadi',
        short_name: 'Zain & Uzma',
        description: 'Zain & Uzma ki shaadi — stories, feed aur saare functions ek jagah.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // posts.json / stories.json — fresh-ish but instant from cache.
            // Requests with ?_fresh=1 bypass this rule and go straight to network.
            urlPattern: ({ url }) =>
              (url.pathname.endsWith('/posts.json') || url.pathname.endsWith('/stories.json')) &&
              !url.searchParams.has('_fresh'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wedding-data',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images (CloudFront + local) — immutable, cache forever.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'wedding-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      // Build-time site config lives at the repo root in /config (FE only)
      '@config': fileURLToPath(new URL('../config', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Allow importing /config which sits outside the frontend root
    fs: { allow: ['..'] },
  },
})

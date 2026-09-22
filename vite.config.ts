import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_URL ?? '/'
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.svg'],
        manifest: {
          name: 'Atlasfunke',
          short_name: 'Atlasfunke',
          description: 'Die Welt im Kopf. Den Funken im Blick.',
          theme_color: '#1f5b73',
          background_color: '#f4efe3',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/index.json', 'data/version.json'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes('/data/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'geo-data', expiration: { maxEntries: 400 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.includes('/media/'),
              handler: 'CacheFirst',
              options: { cacheName: 'geo-media', expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 90 } },
            },
          ],
        },
      }),
    ],
    resolve: { alias: { '@': '/src' } },
    test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['workflow-logo.svg'],
      manifest: {
        name: 'WorkFlow',
        short_name: 'WorkFlow',
        description: 'Registra ore, pause, straordinari e compensi.',
        theme_color: '#0d1722',
        background_color: '#070d14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'workflow-logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'workflow-logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 giorni
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
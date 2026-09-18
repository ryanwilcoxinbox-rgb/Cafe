import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative base + hash routing = works on GitHub Pages, Vercel, Netlify or a subfolder.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BrewPrint',
        short_name: 'BrewPrint',
        description: 'Recipes built around your coffee kit. A better cup, one step at a time.',
        theme_color: '#f4ede3',
        background_color: '#f4ede3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Latin only in the offline cache; other scripts still load on demand.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*'],
      },
    }),
  ],
})

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

/** Identifies this build. Compiled into the JS (what's running) and emitted as version.json (what's deployed). */
const BUILD = {
  version: JSON.parse(readFileSync('package.json', 'utf8')).version as string,
  buildTime: new Date().toISOString(),
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || gitSha(),
}

function versionJson(): Plugin {
  const body = JSON.stringify(BUILD, null, 2)
  return {
    name: 'brewprint-version-json',
    generateBundle() {
      // Not in the service worker's precache (json isn't in globPatterns), so it always hits the network.
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body })
    },
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      })
    },
  }
}

export default defineConfig({
  // Relative base + hash routing = works on GitHub Pages, Vercel, Netlify or a subfolder.
  base: './',
  define: {
    __BUILD__: JSON.stringify(BUILD),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionJson(),
    VitePWA({
      // We call registerSW() ourselves (src/lib/pwa.ts) to keep the registration for update checks.
      injectRegister: null,
      // 'prompt', not 'autoUpdate': autoUpdate reloads the page the moment a new worker takes over,
      // which would wipe a running brew timer. New versions download in the background and the
      // app offers "Update and reload" instead.
      registerType: 'prompt',
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

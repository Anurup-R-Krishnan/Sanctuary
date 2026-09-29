import react from '@vitejs/plugin-react'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const PDFJS_ROOT = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm']

function pdfjsAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'sanctuary-pdfjs-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const relative = decodeURIComponent((req.url ?? '').split('?')[0] ?? '').replace(/^\/+/, '')
        const [dir] = relative.split('/')
        const file = path.resolve(PDFJS_ROOT, relative)
        if (!dir || !PDFJS_ASSET_DIRS.includes(dir) || !file.startsWith(PDFJS_ROOT + path.sep) || !fs.existsSync(file)) return next()
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      for (const dir of PDFJS_ASSET_DIRS) {
        fs.cpSync(path.join(PDFJS_ROOT, dir), path.join(outDir, 'pdfjs', dir), { recursive: true })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const apiTarget = process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8788";
  // Visible at dev startup so proxy target confusion is obvious.
  console.log(`[vite] API proxy target: ${apiTarget}`);

  return {
    envDir: path.resolve(__dirname, "../.."),
    server: {
      headers: {
        "Permissions-Policy": "unload=self"
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins: [
      react(),
      pdfjsAssets(),
      {
        // The production CSP forbids inline script (book documents inherit it).
        // Vite's dev server injects an inline React-refresh preamble, so dev
        // alone gets 'unsafe-inline' back.
        apply: 'serve',
        name: 'sanctuary-dev-csp',
        transformIndexHtml: (html: string) => html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
      },
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Sanctuary Book Reader',
        short_name: 'Sanctuary',
        description: 'An offline-first EPUB reader.',
        theme_color: '#F4ECD8',
        background_color: '#F4ECD8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}']
      }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react'],
            'vendor-state': ['zustand'],
          }
        }
      }
    }
  };
})

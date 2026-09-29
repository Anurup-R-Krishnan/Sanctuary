import react from '@vitejs/plugin-react'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const requireFromHere = createRequire(import.meta.url)
const PDFJS_ROOT = path.dirname(requireFromHere.resolve('pdfjs-dist/package.json'))
const TRANSFORMERS_DIST = path.dirname(requireFromHere.resolve('@huggingface/transformers'))

const STATIC_MOUNTS = [
  { entries: ['cmaps', 'standard_fonts', 'wasm'], prefix: 'pdfjs', root: PDFJS_ROOT },
  { entries: ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'], prefix: 'ort', root: TRANSFORMERS_DIST },
]

const MIME_BY_EXT: Record<string, string> = { '.mjs': 'text/javascript', '.wasm': 'application/wasm' }

function vendorAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'sanctuary-vendor-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      for (const mount of STATIC_MOUNTS) {
        server.middlewares.use(`/${mount.prefix}`, (req, res, next) => {
          const relative = decodeURIComponent((req.url ?? '').split('?')[0] ?? '').replace(/^\/+/, '')
          const [head] = relative.split('/')
          const file = path.resolve(mount.root, relative)
          if (!head || !mount.entries.includes(head) || !file.startsWith(mount.root + path.sep) || !fs.existsSync(file)) return next()
          const type = MIME_BY_EXT[path.extname(file)]
          if (type) res.setHeader('Content-Type', type)
          fs.createReadStream(file).pipe(res)
        })
      }
    },
    closeBundle() {
      for (const mount of STATIC_MOUNTS) {
        for (const entry of mount.entries) {
          fs.cpSync(path.join(mount.root, entry), path.join(outDir, mount.prefix, entry), { recursive: true })
        }
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
      vendorAssets(),
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
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff,woff2}'],
        globIgnores: ['pdfjs/**', 'ort/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter((entry) => {
              if (!/\.m?js$/.test(entry.url)) return true
              return /(^|\/)(assets\/)?([A-Z]|index-|vendor-|workbox-|registerSW|sw\.)/.test(entry.url)
            }),
            warnings: [],
          }),
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/pdfjs/') || url.pathname.startsWith('/ort/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sanctuary-lazy-assets',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      }
      })
    ],
    worker: {
      format: 'es',
    },
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

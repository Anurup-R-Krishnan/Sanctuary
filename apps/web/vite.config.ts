import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sanctuary Book Reader',
        short_name: 'Sanctuary',
        description: 'Your personal reading haven. A beautiful, modern EPUB reader.',
        theme_color: '#caa16eff',
        background_color: '#F8F4EC',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
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
          }
        }
      }
    }
  };
})

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
      {
        name: "epubjs-patch",
        transform(code, id) {
          if (!id.includes("epubjs")) return null;
          let modified = false;

          if (code.includes('"unload"')) {
            code = code.replace(
              /addEventListener\(\s*"unload"/g,
              'addEventListener("pagehide"'
            );
            modified = true;
          }

          if (code.includes("substitute(content, urls, replacements)")) {
            code = code.replace(
              /function substitute\s*\(\s*content\s*,\s*urls\s*,\s*replacements\s*\)\s*\{/g,
              'function substitute(content, urls, replacements) {\n\tif (!content || !urls || !replacements) return content;'
            );
            modified = true;
          }

          return modified ? { code, map: null } : null;
        },
      },
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sanctuary Book Reader',
        short_name: 'Sanctuary',
        description: 'Your personal reading haven. A beautiful, modern EPUB reader.',
        theme_color: '#09090B',
        background_color: '#18181B',
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
            'vendor-epub': ['epubjs'],
            'vendor-ui': ['lucide-react'],
          }
        }
      }
    }
  };
})

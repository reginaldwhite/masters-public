/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // No VITE_ prefix: the key stays in the dev server and never reaches the bundle.
  const { DATAGOLF_API_KEY = '' } = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Mirrors api/datagolf/[...path].ts, which adds the key in production.
        '/api/datagolf': {
          target: 'https://feeds.datagolf.com',
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path.replace(/^\/api\/datagolf/, ''), 'http://localhost')
            url.searchParams.set('key', DATAGOLF_API_KEY)
            return url.pathname + url.search
          },
        },
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})

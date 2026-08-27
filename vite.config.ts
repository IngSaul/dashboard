import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mirrors production's nginx `/api/*` reverse proxy (see docker/nginx.conf)
    // so the browser only ever talks to one origin in dev too — same-origin
    // cookies, no CORS. See specs/003-auth-persistence/research.md §6.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3210',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

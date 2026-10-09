import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// GitLab Pages serves project sites from https://<namespace>.gitlab.io/<repo-name>/,
// so assets must be requested under that sub-path. Override with BASE_PATH
// (e.g. BASE_PATH=/ for a custom or unique Pages domain).
const DEFAULT_BASE = '/autristik/'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.BASE_PATH || DEFAULT_BASE,
    // `public/` is reserved for the GitLab Pages artifact, so static assets live in `static/`.
    publicDir: 'static',
    plugins: [react(), tailwindcss()],
    build: {
      // Three.js and drei make up most of the bundle (~320 kB gzipped); that is expected.
      chunkSizeWarningLimit: 1400,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})

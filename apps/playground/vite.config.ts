import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `vite` (dev) aliases datespan to its source for instant reloads. `vite build` (used by the
// UI tests) resolves it through the package's `exports` to dist/, i.e. exactly what ships.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve:
    command === 'serve'
      ? { alias: { datespan: fileURLToPath(new URL('../../packages/datespan/src/index.ts', import.meta.url)) } }
      : {},
  server: { port: 5199, strictPort: true },
  preview: { port: 5199, strictPort: true },
}))

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Calendar math must not depend on the host timezone, so core tests run in zones with
// odd offsets, DST at midnight (Sao Paulo historically) and a +14h date line edge.
const zones = ['UTC', 'America/St_Johns', 'Pacific/Kiritimati', 'America/Sao_Paulo', 'Asia/Dhaka', 'Europe/London']

export default defineConfig({
  // examples/ import 'datespan' exactly as users do
  resolve: { alias: { datespan: fileURLToPath(new URL('./src/index.ts', import.meta.url)) } },
  test: {
    projects: [
      ...zones.map((TZ) => ({
        extends: true,
        test: { name: `core ${TZ}`, include: ['test/core/**/*.test.ts'], environment: 'node', env: { TZ } },
      })),
      {
        extends: true,
        test: {
          name: 'react',
          include: ['test/react/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['test/setup.ts'],
          env: { TZ: 'America/St_Johns' },
        },
      },
    ],
  },
})

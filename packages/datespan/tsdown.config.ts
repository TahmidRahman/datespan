import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  external: ['react', 'react/jsx-runtime'],
  outputOptions: { banner: "'use client';" },
})

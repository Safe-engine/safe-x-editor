import path from 'node:path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: path.resolve('./src'),
  publicDir: path.resolve('public'),
  resolve: {
    alias: {
      app: path.resolve('./src/app'),
      base: path.resolve('./src/base'),
      components: path.resolve('./src/components'),
      data: path.resolve('./src/data'),
      helper: path.resolve('./src/helper'),
      sdl3: path.resolve('./src/sdl3.ts'),
      shared: path.resolve('./src/shared'),
      states: path.resolve('./src/states'),
    },
  },
  build: {
    outDir: path.resolve('build'),
    emptyOutDir: true,
    target: 'es2020',
  },
  optimizeDeps: {
    exclude: ['@safe-engine/sdl'],
  },
  server: { port: 8585 },
  plugins: [viteSingleFile({ deleteInlinedFiles: true })],
})

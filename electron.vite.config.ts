import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path from 'node:path'
import { viteSingleFile } from 'vite-plugin-singlefile'

const resolve = (directory: string) => path.resolve(__dirname, directory)

const mainExternal = (id: string) =>
  [
    '@colin-luo/tree',
    '@electron/remote/main',
    '@typescript-eslint/typescript-estree',
    'directory-tree',
    'electron',
    'electron-devtools-installer',
    'estraverse',
    'fs-extra',
    'glob',
    'handlebars',
    'image-size',
    'lodash-es',
    'typescript',
  ].includes(id) || id.startsWith('lodash-es/')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@@': resolve('main'),
        '@shared': resolve('src/shared'),
        vscode: resolve('main/shims/vscode.ts'),
      },
    },
    build: {
      outDir: resolve('build/main'),
      rollupOptions: {
        input: resolve('main/index.ts'),
        external: mainExternal,
        output: {
          format: 'cjs',
          entryFileNames: 'index.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
      },
    },
  },
  renderer: {
    root: resolve('src'),
    publicDir: resolve('public'),
    resolve: {
      alias: {
        app: resolve('src/app'),
        base: resolve('src/base'),
        components: resolve('src/components'),
        data: resolve('src/data'),
        helper: resolve('src/helper'),
        sdl3: resolve('node_modules/@safe-engine/sdl/lib/sdl3.js'),
        shared: resolve('src/shared'),
        states: resolve('src/states'),
        box2d: resolve('node_modules/@safe-engine/sdl/lib/physics/box2d.js'),
      },
    },
    build: {
      outDir: resolve('build/renderer'),
      emptyOutDir: true,
      target: 'es2020',
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
    optimizeDeps: {
      exclude: ['@safe-engine/sdl'],
    },
    server: { port: 8585 },
    plugins: [viteSingleFile({ deleteInlinedFiles: true })],
  },
})

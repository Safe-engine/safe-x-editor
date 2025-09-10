import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'vscode', 'media'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Không tách nhiều file nhỏ
      },
    },
  },
  plugins: [react(),
  viteStaticCopy({
    targets: [
       {
          src: 'node_modules/cocos-html5-ts/lib/cocos2d-3.17.js',
          dest: 'vendor',
        },
        {
          src: 'node_modules/pixi.js/dist/pixi.min.js',
          dest: 'vendor',
        },
        {
          src: 'node_modules/pixi5-dragonbones/dragonBones.min.js',
          dest: 'vendor',
        },
    ],
  }),
  viteSingleFile({ deleteInlinedFiles: true })],
})

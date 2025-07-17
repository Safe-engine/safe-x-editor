import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"

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
  plugins: [react(), viteSingleFile({ deleteInlinedFiles: true })],
})

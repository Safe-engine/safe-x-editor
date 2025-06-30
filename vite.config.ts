import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'vscode', 'media'),
    emptyOutDir: true,
  },
  plugins: [react(), viteSingleFile({ deleteInlinedFiles: true })],
})

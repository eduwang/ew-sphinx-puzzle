import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const resolvePath = (path) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolvePath('./index.html'),
        devMode: resolvePath('./dev-mode.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})

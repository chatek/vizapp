import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// `URL#pathname` keeps percent-escapes and carries a leading slash on Windows, so a checkout
// under a path with a space (or any non-ASCII character) would silently resolve `@/` elsewhere.
// Same derivation as vitest.config.ts and tsconfig.web.json's `paths`.
const rendererAlias = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // Fully minify production code: Electron never consumes readable output,
    // and less source is faster for V8 to read, parse, and compile at startup.
    build: { lib: { entry: 'electron/main/index.ts' }, minify: 'esbuild' },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: 'electron/preload/index.ts', formats: ['cjs'] },
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.js' } },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: { alias: { '@': rendererAlias } },
    // Full minification, but function names survive so the React component
    // stacks ErrorBoundary logs stay readable; no sourcemap can restore those,
    // since React reads them from the function names at runtime. Costs ~4% of
    // renderer bytes, far less than keeping every identifier (~40%).
    esbuild: { keepNames: true },
    build: {
      minify: 'esbuild',
      rollupOptions: {
        input: resolve('index.html'),
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('/@xterm/')) return 'terminal-vendor'
            if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/unified/')) return 'markdown-vendor'
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
            if (id.includes('/lucide-react/')) return 'icons-vendor'
            return undefined
          },
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

// Build the webview UI to the extension's media/ui directory so VS Code can load files via asWebviewUri
export default defineConfig({
  plugins: [preact()],
  root: '.',
  build: {
    outDir: resolve(__dirname, '../media/ui'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'main.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'style.css'
          return '[name][extname]'
        },
      },
    },
  },
})


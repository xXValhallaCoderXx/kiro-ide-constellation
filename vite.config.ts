import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: './out',
    lib: {
      entry: resolve(__dirname, 'src/webview/main.tsx'),
      name: 'webview',
      fileName: () => 'webview.js',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    },
    minify: true
  }
});
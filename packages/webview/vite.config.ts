import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    preact(),
    visualizer({
      filename: './bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ],
  build: {
    outDir: '../extension/out',
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/main-sidebar.tsx'),
        dashboard: resolve(__dirname, 'src/main-dashboard.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      }
    },
    chunkSizeWarningLimit: 500
  },
});

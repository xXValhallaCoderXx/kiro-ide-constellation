import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // No 'root' property, so it defaults to the project root.
  build: {
    // 'out' is relative to the project root.
    outDir: 'out',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        // Paths are relative to the project root.
        sidebar: 'web/src/main-sidebar.tsx',
        dashboard: 'web/src/main-dashboard.tsx',
      },
      output: {
        // Simplified output naming.
        entryFileNames: '[name].js',
        // Ensure CSS and other assets have predictable names so the extension can reference them.
        assetFileNames: '[name][extname]'
      },
    },
  },
});

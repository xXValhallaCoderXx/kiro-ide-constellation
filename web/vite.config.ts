import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // No 'root' property, so it defaults to the project root.
  build: {
    // 'dist' is relative to the project root.
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Paths are relative to the project root.
        sidebar: 'web/src/main-sidebar.tsx',
        dashboard: 'web/src/main-dashboard.tsx',
      },
      output: {
        // Simplified output naming.
        entryFileNames: '[name].js',
      },
    },
  },
});

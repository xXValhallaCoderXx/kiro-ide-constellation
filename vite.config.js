import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/ui/components/sidebar.html'),
        'health-dashboard': resolve(__dirname, 'src/ui/components/health-dashboard.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    minify: true
  },
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
    }
  }
});
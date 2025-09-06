import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
    plugins: [preact()],
    build: {
        outDir: 'out',
        emptyOutDir: false,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/webview/main.tsx'),
            output: {
                entryFileNames: 'webview.js',
                format: 'iife',
            },
        },
    },
});

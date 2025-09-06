"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const preset_vite_1 = __importDefault(require("@preact/preset-vite"));
const path_1 = require("path");
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, preset_vite_1.default)()],
    build: {
        outDir: './out',
        lib: {
            entry: (0, path_1.resolve)(__dirname, 'src/webview/main.tsx'),
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
//# sourceMappingURL=vite.config.js.map
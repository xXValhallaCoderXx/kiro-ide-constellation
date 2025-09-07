# Technology Stack

## Core Technologies

- **VS Code Extension API**: Built on VS Code ^1.103.0
- **TypeScript**: Strict mode enabled, ES2022 target
- **Preact**: React-like UI framework for webviews
- **Vite**: Fast build tool for web assets with HMR support
- **Node.js**: Extension runtime environment

## Build System

### Development Commands
```bash
# Watch mode - concurrent builds with hot reload
npm run watch

# Full clean build
npm run build

# Compile extension only
npm run compile

# Run tests
npm run test

# Lint code
npm run lint

# Package extension
npm run package
```

### Build Process
- **Web Assets**: Vite builds Preact components to `out/` with manifest generation
- **Extension Code**: TypeScript compiler (tsc) builds `src/` to `out/`
- **Asset Manifest**: Vite generates `out/.vite/manifest.json` for dynamic asset loading

## Key Dependencies

### Development
- `@preact/preset-vite`: Preact integration for Vite
- `@typescript-eslint/*`: TypeScript linting
- `@vscode/test-*`: VS Code extension testing framework
- `rimraf`: Cross-platform file cleanup

### Runtime
- `preact`: UI framework for webviews
- `vite`: Build tool and dev server

## Architecture Patterns

- **Message Bus**: Typed event system for extension ↔ webview communication
- **Webview Providers**: Encapsulated UI component registration
- **Asset Manifest**: Dynamic asset loading with fallback support
- **Shared Types**: Common event contracts between extension and webviews
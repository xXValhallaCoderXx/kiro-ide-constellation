# Technology Stack

## Core Technologies

- **VS Code Extension API**: Built on VS Code ^1.100.3 with TypeScript 5.9.2
- **Frontend Framework**: Preact 10.27.1 with JSX for webview components
- **Build System**: Vite 7.1.4 for web assets, TypeScript compiler for extension code, esbuild 0.23.0 for MCP bundling
- **MCP Integration**: @modelcontextprotocol/sdk ^1.17.5 for AI tool connectivity
- **Package Management**: npm with package-lock.json for dependency locking

## Project Structure

- **Extension Code**: TypeScript in `src/` compiled to `out/` via tsc
- **Web UI**: Preact components in `web/src/` built via Vite to `out/`
- **MCP Server**: Bundled separately with esbuild to `out/mcp/mcpStdioServer.cjs`

## Build Commands

### Development
```bash
npm run watch          # Concurrent watch: Vite + tsc + MCP bundle (background processes)
npm run compile        # Full build: web + extension + MCP
```

### Production
```bash
npm run build          # Clean build of everything (runs clean + clean:web + compile)
npm run package        # Create .vsix package (runs vscode:prepublish -> build)
```

### Specific Tasks
```bash
npm run bundle:mcp     # Build MCP server bundle only
npm run watch:mcp      # MCP bundle in watch mode
npm run clean          # Remove out/ directory using rimraf
npm run clean:web      # Remove web build artifacts (*.js, *.js.map files)
npm run lint           # ESLint on src/ directory
npm run test           # Run VS Code extension tests (runs pretest first)
npm run pretest        # Compile and lint before testing
```

## Build Architecture

### Multi-Target Build System
- **Web UI**: Vite builds Preact components to `out/` with manifest generation
- **Extension**: TypeScript compiler (tsc) compiles `src/` to `out/`
- **MCP Server**: esbuild bundles to single CommonJS file at `out/mcp/mcpStdioServer.cjs`

### MCP Server Bundling
The MCP server is bundled into a self-contained ~500KB file to avoid shipping `node_modules`:
```bash
esbuild src/mcp/mcpStdioServer.ts --bundle --platform=node --format=cjs --target=node18 --outfile=out/mcp/mcpStdioServer.cjs
```

### Runtime Resolution
MCP provider resolves server script from candidates:
1. `out/mcp/mcpStdioServer.cjs` (preferred)
2. `out/mcp/mcpStdioServer.js`
3. `out/mcp/mcpStdioServer.mjs`

## Configuration Files

- `tsconfig.json`: Extension TypeScript config (Node16, ES2022)
- `web/tsconfig.json`: Web UI TypeScript config (ESNext, Preact JSX)
- `web/vite.config.ts`: Vite build with manifest generation and Preact preset
- `eslint.config.mjs`: ESLint configuration with TypeScript parser
- `package.json`: Project configuration with VS Code extension metadata
- `.vscodeignore`: Files to exclude from extension package

## Asset Management

Vite generates a manifest at `out/.vite/manifest.json` mapping entry points to built assets. The extension uses `src/ui-providers/asset-manifest.ts` to resolve correct script/CSS URIs for webviews, with fallbacks for development.

### Webview Entry Points
- `web/src/main-sidebar.tsx` → `out/sidebar.js`, `out/sidebar.css`
- `web/src/main-dashboard.tsx` → `out/dashboard.js`, `out/dashboard.css`

### Development Fallbacks
If manifest is missing (first run), asset helper falls back to predictable names. A restart after first Vite emit may help resolve missing assets.

## Troubleshooting

### Common Issues
- **MCP Error**: `Cannot find module '.../out/mcp/mcpStdioServer.cjs'`
  - Ensure `npm run watch` is running or run `npm run bundle:mcp` once
  - Check resolved path in logs: "Kiro MCP server script resolved to: ..."
  - Verify the `out/mcp/` directory exists after build

- **Missing Webview Assets**: CSS/JS not loading in development
  - Ensure Vite watch is running (part of `npm run watch`)
  - Check for manifest file at `out/.vite/manifest.json`
  - Restart VS Code after first Vite build to resolve asset paths

- **Build Failures**: TypeScript or Vite compilation errors
  - Run `npm run clean` followed by `npm run build` for fresh build
  - Check for TypeScript version compatibility (currently 5.9.2)
  - Ensure all dependencies are installed with `npm install`

- **Extension Not Loading**: Extension fails to activate
  - Check VS Code version compatibility (requires ^1.100.3)
  - Verify `out/extension.js` exists after compilation
  - Check VS Code Developer Console for activation errors

### Development Tips
- Use `npm run watch` for continuous development with hot reloading
- The extension activates on startup, so restart VS Code to test changes
- MCP server runs as a separate bundled process for isolation
- Webview components use Preact for lightweight React-like development
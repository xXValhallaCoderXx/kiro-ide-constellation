# Technology Stack

## Core Technologies

- **VS Code Extension API**: Built on VS Code ^1.100.3 with TypeScript
- **Frontend Framework**: Preact with JSX for webview components
- **Build System**: Vite for web assets, TypeScript compiler for extension code, esbuild for MCP bundling
- **MCP Integration**: @modelcontextprotocol/sdk for AI tool connectivity

## Project Structure

- **Extension Code**: TypeScript in `src/` compiled to `out/` via tsc
- **Web UI**: Preact components in `web/src/` built via Vite to `out/`
- **MCP Server**: Bundled separately with esbuild to `out/mcp/mcpStdioServer.cjs`

## Build Commands

### Development
```bash
npm run watch          # Concurrent watch: Vite + tsc + MCP bundle
npm run compile        # Full build: web + extension + MCP
```

### Production
```bash
npm run build          # Clean build of everything
npm run package        # Create .vsix package (runs vscode:prepublish)
```

### Specific Tasks
```bash
npm run bundle:mcp     # Build MCP server bundle only
npm run watch:mcp      # MCP bundle in watch mode
npm run clean          # Remove out/ directory
npm run clean:web      # Remove web build artifacts
npm run lint           # ESLint on src/
npm run test           # Run VS Code extension tests
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
- `web/vite.config.ts`: Vite build with manifest generation
- `eslint.config.mjs`: ESLint configuration

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

- **Missing Webview Assets**: CSS/JS not loading in development
  - Ensure Vite watch is running (part of `npm run watch`)
  - Check for manifest file at `out/.vite/manifest.json`
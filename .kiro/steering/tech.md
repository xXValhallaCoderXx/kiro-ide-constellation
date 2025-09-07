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
npm run package        # Create .vsix package
```

### Specific Tasks
```bash
npm run bundle:mcp     # Build MCP server bundle only
npm run clean          # Remove out/ directory
npm run clean:web      # Remove web build artifacts
npm run lint           # ESLint on src/
npm run test           # Run VS Code extension tests
```

## Configuration Files

- `tsconfig.json`: Extension TypeScript config (Node16, ES2022)
- `web/tsconfig.json`: Web UI TypeScript config (ESNext, Preact JSX)
- `web/vite.config.ts`: Vite build with manifest generation
- `eslint.config.mjs`: ESLint configuration

## Asset Management

Vite generates a manifest at `out/.vite/manifest.json` mapping entry points to built assets. The extension uses `src/ui-providers/asset-manifest.ts` to resolve correct script/CSS URIs for webviews, with fallbacks for development.
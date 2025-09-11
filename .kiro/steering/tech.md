# Technology Stack (Monorepo)

## Core
- VS Code API: ^1.100.3
- TypeScript: ^5.9.2
- Preact (webviews): ^10.27.1
- Vite (webviews): ^7.1.4 with @preact/preset-vite and manifest
- esbuild (MCP bundling): ^0.23.0
- Turborepo: ^2.5.6 (task orchestration)
- pnpm: workspace manager (pnpm-workspace.yaml)

## Packages and roles
- packages/extension: VS Code extension host code (tsc → out/)
- packages/webview: builds to ../extension/out with Vite
- packages/shared: shared contracts (events, commands, utils)
- packages/mcp-server: stdio server (bundled to ../extension/out/mcp)

## Build and scripts
Root package.json scripts:
```bash
pnpm build              # turbo run build across packages
pnpm dev                # turbo run dev --parallel
pnpm typecheck          # turbo run typecheck
pnpm lint               # turbo run lint
pnpm test               # turbo run test
pnpm watch              # pnpm -r run watch (all packages)
pnpm package            # build & vsce package (extension vsix)
```
MCP utilities:
```bash
pnpm bundle:mcp         # node esbuild.mcp.config.js
pnpm watch:mcp          # node esbuild.mcp.config.js --watch
```

## Build architecture
- Webviews (Vite):
  - Inputs configured for `src/main-sidebar.tsx` and `src/main-dashboard.tsx`
  - Output to `packages/extension/out` with manifest
- Extension (tsc):
  - Compiles to `packages/extension/out`
- MCP server (esbuild at repo root):
  - Bundles `packages/mcp-server/src/server.ts` → `packages/extension/out/mcp/mcpStdioServer.cjs`

## Configuration
- tsconfig.base.json: ES2022, common options, composite = true
- packages/*/tsconfig.json: per-package configs
- packages/webview/vite.config.ts: manifest + preact preset + output path
- .vscode/launch.json and tasks.json: Run Extension and build tasks

## Runtime and discovery
- MCP provider (packages/extension/src/mcp/mcp.provider.ts):
  - Registers provider via vscode.lm when available
  - Fallback writes `.kiro/settings/mcp.json` in workspace
  - Resolves Node path via env + heuristics; resolves server script from bundled out/mcp
- HTTP bridge (packages/extension/src/services/http-bridge.service.ts):
  - POST /events with { type, payload? } to inject events into the extension bus
  - Defaults to 127.0.0.1:39237; safe error handling and limits

## Dependency analysis (POC)
- Command: `kiro.deps.scan`
- Service: `packages/extension/src/services/dependency-cruiser.service.ts`
- Behavior: runs dependency-cruiser via npx with sane defaults, timeout, cancellation
- Output: `.constellation/data/dependency-analysis.json` within the analyzed folder

## Troubleshooting quick refs
- MCP bundle missing → run `pnpm bundle:mcp` or `pnpm build`
- Web assets missing → run `pnpm -r run dev` (webview builds into extension/out), reload window
- Bridge port busy → set KIRO_MCP_BRIDGE_PORT to a free port and reload
- Node path issues for MCP → set KIRO_MCP_NODE

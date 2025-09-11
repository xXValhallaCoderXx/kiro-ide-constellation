# Project Structure (Monorepo)

This repository uses a pnpm/Turbo monorepo with four packages: the VS Code extension, webview UI, shared contracts, and the MCP stdio server.

## Root Layout

```
├── packages/
│   ├── extension/          # VS Code extension (activation, UI providers, services)
│   ├── webview/            # Webview UI (Vite/Preact), builds into extension/out
│   ├── shared/             # Shared contracts (events, commands, utils)
│   └── mcp-server/         # MCP stdio server (bundled by esbuild)
├── docs/                   # Developer docs (architecture, MCP, messaging)
├── scripts/                # Helper scripts (prepare vsix, analyze bundles)
├── esbuild.mcp.config.js   # MCP esbuild bundler
├── tsconfig.base.json      # Base TS config (composite, ES2022)
├── pnpm-workspace.yaml     # pnpm workspace
├── .vscode/                # Workspace launch/tasks
└── .kiro/steering/         # Kiro agent steering docs
```

## Extension Package (packages/extension)

```
packages/extension/
├── src/
│   ├── extension.ts                      # Extension activation
│   ├── mcp/
│   │   └── mcp.provider.ts               # MCP provider + fallback writer
│   ├── services/
│   │   ├── message-bus.service.ts        # Extension message bus
│   │   ├── webview-bus-register.utils.ts # Register webviews with bus
│   │   ├── http-bridge.service.ts        # Local HTTP bridge
│   │   └── dependency-cruiser.service.ts # Dependency scan POC (writes to .constellation/data)
│   ├── shared/
│   │   └── runtime.ts                    # Extension-local event/nonce utilities
│   └── ui-providers/
│       ├── asset-manifest.ts             # Vite manifest loader
│       ├── sidebar/                      # Sidebar provider
│       └── health-dashboard/             # Dashboard provider/panel
├── out/                                  # Built extension output (tsc)
│   └── mcp/mcpStdioServer.cjs            # MCP bundle (from root esbuild)
└── package.json                          # Contributes views, commands, MCP provider
```

Notes:
- Web assets are built by the webview package into packages/extension/out.
- The dependency scan command id is `kiro.deps.scan`; output JSON is saved to `.constellation/data/dependency-analysis.json` in the analyzed folder.

## Webview Package (packages/webview)

```
packages/webview/
├── src/
│   ├── services/
│   │   └── message-bus.service.ts   # Webview-side message bus
│   ├── types/
│   │   └── cssmodule.d.ts           # CSS module typings
│   └── vscode.ts                    # acquireVsCodeApi wrapper
├── vite.config.ts                   # Builds to ../extension/out, manifest enabled
└── package.json
```

Vite inputs are configured for `src/main-sidebar.tsx` and `src/main-dashboard.tsx`; add those entry files as your UI evolves.

## Shared Package (packages/shared)

```
packages/shared/
├── src/
│   ├── shared/
│   │   ├── events.ts               # Central events + payloads
│   │   ├── commands.ts             # Command ids
│   │   └── utils/generate-nonce.utils.ts
│   └── index.ts                    # Barrel exports
└── package.json
```

## MCP Server Package (packages/mcp-server)

```
packages/mcp-server/
├── src/
│   └── server.ts                  # MCP stdio server entry
└── package.json
```

Bundled by `esbuild.mcp.config.js` at the repo root; output goes to `packages/extension/out/mcp/mcpStdioServer.cjs`.

## Cross-cutting Architecture

- Message Bus
  - Shared contracts: `packages/shared/src/shared/events.ts`
  - Extension bus: `packages/extension/src/services/message-bus.service.ts`
  - Webview bus: `packages/webview/src/services/message-bus.service.ts`
- HTTP Bridge: `packages/extension/src/services/http-bridge.service.ts` (POST /events)
- MCP Provider: `packages/extension/src/mcp/mcp.provider.ts`
- Web assets manifest: `packages/extension/src/ui-providers/asset-manifest.ts`
- Dev utility: dependency-cruiser POC command (`kiro.deps.scan`) writes JSON to `.constellation/data/`.

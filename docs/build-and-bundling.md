# Build & Bundling

How the extension, web UI, and MCP server are produced in dev and prod.

Repo layout (monorepo)
- Extension: packages/extension
- Webviews (Vite/Preact): packages/webview (outputs into packages/extension/out)
- Shared types/contracts: packages/shared
- MCP stdio server: packages/mcp-server

Outputs (under packages/extension/out)
- extension.js (+ maps)
- mcp/mcpStdioServer.cjs (single-file bundle)
- .vite/manifest.json (web asset manifest)
- sidebar.js/.css, dashboard.js/.css (from Vite)

Dev (watch)
- pnpm dev or turbo run dev --parallel
  - packages/webview: vite build --watch → outputs to packages/extension/out
  - packages/extension: tsc --watch → out
  - MCP: node esbuild.mcp.config.js --watch → out/mcp/mcpStdioServer.cjs

Prod (build + package)
- pnpm build → turbo run build
  1) Vite build (webview) → out
  2) TSC build (extension) → out
  3) esbuild bundle (MCP) → out/mcp/mcpStdioServer.cjs
- Packaging vsix is handled in packages/extension scripts (prepackage/package)

Asset manifest (Vite)
- Config: packages/webview/vite.config.ts (build.manifest = true; inputs: src/main-sidebar.tsx, src/main-dashboard.tsx)
- Loader: packages/extension/src/ui-providers/asset-manifest.ts
  - getEntryUris(context, webview, 'sidebar' | 'dashboard') → { script, css[] }
  - Falls back to deterministic names if manifest is missing (first run)

Adding a new UI entry point
1) Add an entry in packages/webview/vite.config.ts under rollupOptions.input
2) Create packages/webview/src/main-<name>.tsx
3) Use getEntryUris(context, webview, '<name>') in your provider to inject the correct script/css

MCP setup
- The extension registers an MCP Stdio server definition (if vscode.lm API is available) via packages/extension/src/mcp/mcp.provider.ts
- If not available, it writes a workspace-level .kiro/settings/mcp.json with:
  - command: Node path (resolveNodeCommand)
  - args[0]: path to bundled mcpStdioServer.cjs (resolveServerScript)
- Env overrides:
  - KIRO_MCP_NODE: override node binary for MCP
  - KIRO_MCP_CONFIG_DIR: change .kiro/settings directory

HTTP bridge (MCP → Extension)
- The extension starts a local HTTP server (startHttpBridge) at http://127.0.0.1:39237 by default
- External processes (including the MCP server) can POST { type, payload? } to /events to trigger extension-side behavior
- Env: KIRO_MCP_BRIDGE_HOST, KIRO_MCP_BRIDGE_PORT

Troubleshooting
- Missing mcpStdioServer.cjs: run pnpm run bundle:mcp (root) or ensure dev watch is active
- Webview assets missing: ensure packages/webview dev/build ran; reload window after first build
- Port in use for HTTP bridge: set KIRO_MCP_BRIDGE_PORT to a free port; reload
- Wrong Node binary for MCP: set KIRO_MCP_NODE

Targets
- Extension TS → ES2022 (module Node16)
- MCP bundle → Node 18 CJS


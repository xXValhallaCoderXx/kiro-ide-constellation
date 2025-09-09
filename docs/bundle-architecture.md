# Bundle & Build

How the extension, web UI, and MCP server are produced in dev and prod.

## Source layout

- Extension host: `src/**/*.ts`
- MCP stdio server: `src/mcp/mcp-stdio.server.ts`
- Web UI (webviews): `web/src/**/*.tsx`

## Outputs (out/)

- `out/extension.js` (+ maps)
- `out/mcp/mcpStdioServer.cjs`
- Web assets via Vite (+ `out/.vite/manifest.json`)

## Dev (watch)

`npm run watch` runs:

- Vite watch → builds web assets to `out/`
- TSC watch → compiles extension to `out/`
- esbuild watch → bundles MCP to `out/mcp/mcpStdioServer.cjs`

Providers resolve the server script from: `.cjs` → `.js` → `.mjs`. See `src/mcp/mcp.provider.ts`.

## Prod (package)

`npm run package` → `npm run build`:

1) Clean `out/` and stale web files
2) Vite build (web) → `out/`
3) TSC build (extension) → `out/`
4) esbuild bundle (MCP) → `out/mcp/mcpStdioServer.cjs`

The MCP bundle is a single CJS file (no node_modules at runtime).

## MCP setup

- VS Code with MCP API: registers provider (`id: kiro-constellation`) via `vscode.lm.registerMcpServerDefinitionProvider`. Launches Node with args `[out/mcp/mcpStdioServer.cjs]`.
- No MCP API (e.g., Kiro IDE): writes `.kiro/settings/mcp.json` under the first workspace folder with:

  - `command`: Node path (can override via `KIRO_MCP_NODE`)
  - `args[0]`: server script path (resolved at runtime)
  - Writes only if changed; logs prefixed with `[Kiro MCP]`
  - Config dir override: `KIRO_MCP_CONFIG_DIR` (default `.kiro/settings`)

## Scripts (package.json)

- `watch`, `compile`, `build`, `package`, `bundle:mcp`, `watch:mcp`

## Troubleshooting

- Missing `mcpStdioServer.cjs`: run `npm run watch` or `npm run bundle:mcp`.
- Webview assets missing: ensure Vite watch is running; first build may require a reload.
- `mcp.json` not created: need an open workspace; check `[Kiro MCP]` logs; verify write permissions; override paths via env.
- Wrong Node binary: set `KIRO_MCP_NODE`.

## Analysis engine (dependency-cruiser)

- Added as a production dependency in the extension (packaged by `vsce`).
- Not bundled into the web or MCP outputs; executed as a separate child process from the extension host.
- CLI resolution order:
  1) Extension `node_modules/.bin/depcruise`
  2) Workspace `node_modules/.bin/depcruise`
  3) `require.resolve('dependency-cruiser/bin/depcruise.js')` via `node`
  4) Fallback to `depcruise` on PATH
- Output is captured as JSON for downstream processing.
- Stage 1 additionally persists the raw JSON to the workspace at `.constellation/data/graph-data.json` for validation and later stages.

## Node targets

- Extension TS → ES2022 (`module: Node16`)
- MCP bundle → Node 18 CJS (exec via host Node)

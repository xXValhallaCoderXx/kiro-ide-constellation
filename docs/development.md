# Development

Requirements
- Node.js 18+ (required by the MCP TypeScript SDK)
- ESM configuration: package.json has "type": "module" and tsconfig uses NodeNext.

UI layer
- Preact app bundled with Vite lives in webview-ui/.
- Output goes to out/ui (main.js, style.css). The webview provider loads from there.
- Components use PascalCase .tsx files (e.g., App.tsx, GraphDashboard.tsx, Button.tsx). Non-components use kebab-case .ts.

Edit–build loop
- F5 (Run Extension or Run Extension (Dev MCP)) starts two background tasks:
  - TypeScript watch (tsc -w)
  - UI watch (vite build --watch)
- When UI code changes, the Vite watcher rebuilds out/ui; reload the window to pick up the new assets.

Manual commands
```bash
# TypeScript compile once
npm run compile

# Build webview UI once
npm run build:ui

# Watch both (ts + UI) outside of F5
npm run watch & npm run dev:ui
```

Server changes
- For changes in src/mcp.server.ts, rebuild (tsc should handle) and restart constellation-mcp from the MCP panel. No full window reload needed.

Config changes
- For Node path / workspace write setting changes, reload the window so Kiro re-reads configs.

Dependency scan (dev notes)
- The scan runs in the background on activation and does not block the UI.
- By default it excludes: node_modules|dist|out|build|coverage|.git|.vscode|.constellation
- If a dependency-cruiser config exists in the workspace root it will be used (via --config). Otherwise we pass --no-config.
- If tsconfig.json exists in the workspace root it will be passed as --ts-config <abs path>.
- Output path: ./.constellation/data/codebase-dependencies.json
- You can re-run the scan via command palette: "Constellation: Scan Dependencies".

Event architecture (details)
- Webview UI messaging
  - Webview posts messages via messenger.post(type, payload) (webview-ui/src/services/messenger.ts).
  - Providers/Graph panels listen to webview.onDidReceiveMessage and route into src/services/messenger.service.ts.
  - Current inbound messages: 'open-graph-view'. Planned graph messages: 'graph/load', 'graph/open-file', 'graph/scan'.
- HTTP bridge for MCP → extension
  - startHttpBridge in src/services/http-bridge.service.ts creates a small HTTP server (listen(0), loopback only) and a random token.
  - Env injected into MCP config: CONSTELLATION_BRIDGE_PORT, CONSTELLATION_BRIDGE_TOKEN.
  - MCP (Node 18+) uses global fetch to POST http://127.0.0.1:<port>/open-graph with Authorization: Bearer <token>.
  - The handler validates token and runs the command to open/reveal the singleton Graph tab.
- Graph tab singleton
  - The command keeps a module-level WebviewPanel reference; further opens call reveal instead of creating duplicates.

Manual bridge testing
```bash
# View env in ~/.kiro/settings/mcp.json (values are dynamic per run)
# Test the bridge manually (replace <PORT> and <TOKEN>)
curl -s -X POST -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:<PORT>/open-graph -o /dev/null -w "%{http_code}\n"
# Expected: 204
```

Debug profiles
- Run Extension (Dev MCP)
  - Starts the combined watch tasks and sets CONSTELLATION_SERVER_ID=constellation-mcp-dev so user config writes to the dev namespace.
- Run Extension
  - Uses the default namespace from settings (constellation.serverId).

Useful commands (palette)
- Constellation: Self-test — Boot the server with --selftest and report OK/FAILED.
- Constellation: Open user MCP config — Open ~/.kiro/settings/mcp.json.

Packaging
```bash
npm run package
```
Produces a .vsix you can install. MCP config stores absolute paths to out/mcp.server.js; if the install location changes, reactivate the extension to upsert the path.

Gotchas
- Using __dirname in ESM: prefer fileURLToPath(import.meta.url) + dirname().
- Tests are excluded from the TS build (tsconfig exclude: src/test/**).


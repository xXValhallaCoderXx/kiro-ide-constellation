# Kiro IDE Constellation

Kiro IDE Constellation adds a custom Activity Bar container and a Sidebar webview to VS Code, plus a Dashboard webview that opens in a new editor tab. The webviews are built with Preact and bundled via Vite for fast iteration.

## Features

- Activity Bar container: "Kiro Constellation" with an icon
- Sidebar view (webview) with a button to open the Dashboard
- Dashboard webview opens as a new editor tab

## Usage

1. Press F5 to launch the Extension Development Host.
2. Click the "Kiro Constellation" icon in the Activity Bar to open the Sidebar.
3. Click "Open Graph" to launch the Dashboard tab.

## Docs

See the developer docs in `./docs`:

- Start here: [docs/index.md](./docs/index.md)
- Key topics: events, messaging, lifecycle, build & bundling, MCP overview/architecture/tools, and recipes.


## Development

- Monorepo layout:
  - Extension code: packages/extension (compiled by tsc to packages/extension/out)
  - Web UI (Vite/Preact): packages/webview (build outputs into packages/extension/out)
  - Shared contracts/types: packages/shared
  - MCP stdio server: packages/mcp-server (bundled to packages/extension/out/mcp/mcpStdioServer.cjs)

Scripts:

- `pnpm dev` – run dev/watch processes across packages (Vite watch, tsc watch, MCP esbuild watch)
- `pnpm build` – build all packages including the MCP bundle (Turbo)
- `pnpm bundle:mcp` – one-off build of the MCP stdio server to packages/extension/out/mcp/mcpStdioServer.cjs

Troubleshooting (debug):
- If the debug session logs `Cannot find module .../out/mcp/mcpStdioServer.cjs`, ensure the watcher is running or run `npm run bundle:mcp` once to generate the file.

### HTTP Bridge (MCP → Extension)

The extension starts a small HTTP server on `http://127.0.0.1:39237` to accept event posts from external processes (like the MCP stdio server). Posting `{ "type": "openDashboard" }` to `/events` will trigger the Dashboard to open via the internal message bus.

Environment variables:
- `KIRO_MCP_BRIDGE_HOST` – Host/interface to bind (default `127.0.0.1`)
- `KIRO_MCP_BRIDGE_PORT` – Port to bind (default `39237`)

Notes and troubleshooting:
- If the port is already in use, the extension logs a warning and disables the bridge for this session. Set `KIRO_MCP_BRIDGE_PORT` to a free port and reload the window.
- The MCP stdio server uses these env vars to POST events. Ensure they match if you override the defaults.

### Asset manifest (Vite)

Vite emits a manifest file at `packages/extension/out/.vite/manifest.json` that maps source entry files to their built assets (JS and CSS). We use this so the VS Code webviews can reference the correct files even if names change.

- Config: see `packages/webview/vite.config.ts` where `build.manifest = true` and entries are defined for `src/main-sidebar.tsx` and `src/main-dashboard.tsx`.
- Loader: `packages/extension/src/ui-providers/asset-manifest.ts` exports `getEntryUris(context, webview, entry)` which returns:
	- `script`: a `vscode.Uri` pointing to the built JS file for the entry
	- `css`: an array of `vscode.Uri` values for any generated CSS files
- Providers use `getEntryUris` to inject the correct `<script type="module">` and `<link rel="stylesheet">` tags. If the manifest is missing (e.g., first run in watch), the helper falls back to predictable names like `out/sidebar.js` and `out/sidebar.css`.

Adding a new UI entry point:
1. Add an input entry in `packages/webview/vite.config.ts` under `rollupOptions.input`.
2. Create the corresponding `packages/webview/src/main-<name>.tsx` file that renders your Preact component into `#root`.
3. In your webview provider, call `getEntryUris(context, webview, '<name>')` and include the returned URIs in your HTML.

## Requirements

No additional requirements.

## License

MIT

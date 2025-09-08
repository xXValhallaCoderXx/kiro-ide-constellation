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
- Topics: events, extension bus, webview bus, lifecycle, and recipes.


## Development

- Web UI is in `web/` and built with Vite/Preact to `out/`.
- Extension code is under `src/` and compiled by `tsc` to `out/`.

Scripts:

- `npm run watch` – concurrently builds web assets (Vite), watches extension TypeScript (tsc), and watches the MCP stdio server bundle with esbuild.
- `npm run build` – clean build of everything including the MCP bundle.
- `npm run bundle:mcp` – one-off build of the MCP stdio server to `out/mcp/mcpStdioServer.cjs`.

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

Vite emits a manifest file at `out/.vite/manifest.json` that maps source entry files to their built assets (JS and CSS). We use this so the VS Code webviews can reference the correct files even if names change (e.g., when hashed or when Vite’s internal layout changes).

- Config: see `web/vite.config.ts` where `build.manifest = true` and entries are defined for `web/src/main-sidebar.tsx` and `web/src/main-dashboard.tsx`.
- Loader: `src/ui-providers/asset-manifest.ts` exports `getEntryUris(context, webview, entry)` which returns:
	- `script`: a `vscode.Uri` pointing to the built JS file for the entry
	- `css`: an array of `vscode.Uri` values for any generated CSS files
- Providers use `getEntryUris` to inject the correct `<script type="module">` and `<link rel="stylesheet">` tags. If the manifest is missing (e.g., first run in watch), the helper falls back to predictable names like `out/sidebar.js` and `out/sidebar.css`.

Adding a new UI entry point:
1. Add an input entry in `web/vite.config.ts` under `rollupOptions.input`.
2. Create the corresponding `web/src/main-<name>.tsx` file that renders your Preact component into `#root`.
3. In your webview provider, call `getEntryUris(context, webview, '<name>')` and include the returned URIs in your HTML.

## Requirements

No additional requirements.

## License

MIT

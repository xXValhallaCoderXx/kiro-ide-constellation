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

## Development

- Web UI is in `web/` and built with Vite/Preact to `out/`.
- Extension code is under `src/` and compiled by `tsc` to `out/`.

Scripts:

- `npm run watch`  concurrently builds web assets (Vite) and watches extension TypeScript (tsc).
- `npm run build`  clean build of both.

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

# Bundle Architecture

This document explains how the extension is built in development vs production, how the Web UI and MCP server are bundled, and what files are produced.

## TL;DR

- Web UI (Preact) is built by Vite into `out/` with a manifest file.
- Extension code (TypeScript) is compiled by `tsc` into `out/`.
- MCP stdio server is bundled into a single CommonJS file with esbuild at `out/mcp/mcpStdioServer.cjs`.
- Dev watch builds all three in the background; packaged builds do a clean, one-shot compile.

## Source layout

- Extension (Node/VS Code host): `src/**/*.ts`
- MCP server (stdio): `src/mcp/mcpStdioServer.ts`
- Web UI (webviews): `web/src/**/*.tsx`

## Outputs

All build products go to `out/`:

- Extension host JS: `out/extension.js` (+ maps)
- MCP server bundle: `out/mcp/mcpStdioServer.cjs`
- Web UI bundles:
  - `out/sidebar.js`, `out/sidebar.css`
  - `out/dashboard.js`, `out/dashboard.css`
  - Vite manifest: `out/.vite/manifest.json`

## Development build (watch)

Command: `npm run watch`

What runs concurrently:

- `vite build --watch --config web/vite.config.ts` – builds web assets to `out/` and updates on change
- `tsc -watch -p ./` – compiles TypeScript in `src/` to `out/`
- `esbuild ... --watch` – bundles the MCP server to `out/mcp/mcpStdioServer.cjs`

The extension is launched in Debug (F5). When you interact with MCP features, the provider resolves the server script file and spawns it via the VS Code MCP API.

### Runtime server path resolution

The provider (`src/mcp/mcpProvider.ts`) resolves the server script from these candidates in order:

1. `out/mcp/mcpStdioServer.cjs`
2. `out/mcp/mcpStdioServer.js`
3. `out/mcp/mcpStdioServer.mjs`

This makes debug resilient even if you built the server a different way. During watch, the `.cjs` bundle is produced continuously, so option 1 should exist.

### Web assets in dev

- Vite also emits `out/.vite/manifest.json`. The helper `src/ui-providers/asset-manifest.ts` reads this to inject correct JS/CSS into the webviews.
- If the manifest is temporarily missing (e.g., first run), the helper falls back to predictable names like `out/sidebar.js` and `out/sidebar.css`.

## Production build (packaging)

Command: `npm run package` (which runs `vscode:prepublish` → `npm run build`).

`npm run build` performs:

1. `npm run clean` – removes `out/`
2. `npm run clean:web` – removes old web JS/CSS artifacts under `web/`
3. `npm run compile` – runs, in sequence:
   - `vite build --config web/vite.config.ts` – outputs web assets to `out/`
   - `tsc -p ./` – compiles extension TS into `out/`
   - `npm run bundle:mcp` – bundles the MCP server to `out/mcp/mcpStdioServer.cjs`

The packaged `.vsix` contains the minimal `out/` tree and does not include `node_modules` for the MCP server. The MCP server is self-contained in a single `.cjs` file (~500 KB) that includes the MCP SDK and any transitive code needed at runtime.

## Why the MCP server is bundled

- Avoids shipping a large `node_modules` inside the `.vsix`.
- Ensures the MCP entrypoint can be launched by Node without resolving ESM/CJS ambiguities or requiring local dependencies.
- Keeps the dev and prod behavior aligned (same single-file entrypoint).

Build command (referenced by scripts):

```
esbuild src/mcp/mcpStdioServer.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node18 \
  --outfile=out/mcp/mcpStdioServer.cjs
```

## Scripts overview (package.json)

- `watch`: runs Vite watch, tsc watch, and esbuild watch
- `compile`: one-shot Vite build, tsc build, then MCP bundle
- `build`: clean + compile
- `package`: creates the `.vsix`
- `bundle:mcp`: one-shot MCP bundle
- `watch:mcp`: MCP bundle in watch mode

## Troubleshooting

- Error: `Cannot find module '.../out/mcp/mcpStdioServer.cjs'`
  - Ensure `npm run watch` is running (which includes `watch:mcp`), or run `npm run bundle:mcp` once before launching debug.
  - Check the resolved path in the log: "Kiro MCP server script resolved to: ...".

- Webview shows missing CSS/JS in dev:
  - Make sure Vite watch is running (it’s part of `npm run watch`).
  - If the manifest is missing on first run, the asset helper falls back to predictable names; a quick restart after the first Vite emit may help.

## Notes on Node targets

- Extension TS compiles to ES2022 with `module` set to `Node16` (see `tsconfig.json`).
- MCP server bundle targets Node 18 for broad compatibility with VS Code’s runtime, but works on newer versions as well. We use `--format=cjs` so it can be executed directly via the host Node (`process.execPath`).

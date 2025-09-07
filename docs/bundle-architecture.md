# Bundle Architecture

This document explains how the extension is built in development vs production, how the Web UI and MCP server are bundled, and what files are produced.

## TL;DR

- Web UI (Preact) is built by Vite into `out/` with a manifest file.
- Extension code (TypeScript) is compiled by `tsc` into `out/`.
- MCP stdio server is bundled into a single CommonJS file with esbuild at `out/mcp/mcpStdioServer.cjs`.
- Dev watch builds all three in the background; packaged builds do a clean, one-shot compile.
- If the VS Code MCP API isn’t available (e.g., in Kiro IDE), the extension falls back to writing a workspace config at `.kiro/settings/mcp.json` that points to the bundled server.

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

## MCP setup (VS Code vs Kiro)

The extension supports two ways to expose the MCP stdio server:

- VS Code (with MCP API): Registers a provider using `vscode.lm.registerMcpServerDefinitionProvider` and `McpStdioServerDefinition`. The server is launched by the host using the resolved Node executable and the bundled entrypoint. Provider id: `kiro-constellation`.
- Kiro IDE or missing MCP API: Falls back to writing a workspace-local config at `.kiro/settings/mcp.json`. Kiro reads this file and starts the MCP server directly.

Example of the written `mcp.json`:

```json
{
  "mcpServers": {
    "kiro-constellation": {
      "command": "/path/to/node",
      "args": ["/path/to/workspace/out/mcp/mcpStdioServer.cjs"],
      "disabled": false
    }
  }
}
```

Notes:
- Writes are idempotent: the file is only updated if `command`, first `args` entry (the script path), or `disabled` differ.
- Logs are prefixed with `[Kiro MCP]` to make diagnosis easy.
- The config directory can be overridden with `KIRO_MCP_CONFIG_DIR` (relative to the first workspace folder). Default: `.kiro/settings`.
- The Node binary can be overridden with `KIRO_MCP_NODE`.

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

The same resolution is used when writing the Kiro fallback `mcp.json` if the MCP API is unavailable.

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

- `mcp.json` is not created in Kiro:
  - Ensure a workspace folder is open (the file is written under the first workspace root).
  - Check the logs for `[Kiro MCP]` messages indicating why the write was skipped or failed.
  - If you want a different location, set `KIRO_MCP_CONFIG_DIR` (e.g., `export KIRO_MCP_CONFIG_DIR=".kiro/settings"`).
  - Verify write permissions in the workspace directory.

- Kiro is launching Node from an unexpected path:
  - Set `KIRO_MCP_NODE` to point to the desired Node binary (e.g., `/opt/homebrew/bin/node`).

## Notes on Node targets

- Extension TS compiles to ES2022 with `module` set to `Node16` (see `tsconfig.json`).
- MCP server bundle targets Node 18 for broad compatibility with VS Code’s runtime, but works on newer versions as well. We use `--format=cjs` so it can be executed directly via the host Node (`process.execPath`).
  - At runtime, the extension resolves Node in this order: `KIRO_MCP_NODE` env → `process.execPath` if it’s Node → common system paths → `node`.

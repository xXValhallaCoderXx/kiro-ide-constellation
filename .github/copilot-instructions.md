# Kiro IDE Constellation — AI Coding Agent Guide

Focus on these project-specific patterns and workflows to be productive quickly.

## Overview
- Architecture: VS Code extension with two webviews (Sidebar, Dashboard). Extension ↔ Webviews communicate via a typed message bus. External processes can emit events via a local HTTP bridge. An MCP stdio server is bundled and exposed via `vscode.lm` when available.
- Activation: `onStartupFinished`; main entry `./out/extension.js`.
- Key paths: `src/extension.ts`, `src/services/message-bus.service.ts`, `src/shared/events.ts`, `src/ui-providers/**`, `web/**`, `src/services/http-bridge.service.ts`, `src/mcp/*`.

## Dev Workflows
- Install: `npm install`
- Watch (dev): `npm run watch` (Vite web bundle + `tsc -w` + MCP esbuild watch). Press F5 to launch the Extension Development Host.
- Build (clean): `npm run build` (cleans, builds web + extension + MCP bundle).
- MCP bundle (one-off): `npm run bundle:mcp` (generates `out/mcp/mcpStdioServer.cjs`) if debug logs complain about a missing MCP bundle.
- Lint/Tests: `npm run lint` / `npm run test`.

## Messaging (critical)
- Contracts: Define events in `src/shared/events.ts` (`Events`, `EventPayloads`, `BusEvent`). Avoid magic strings elsewhere.
- Extension bus: `src/services/message-bus.service.ts` with `register`, `broadcast`, `sendTo`, `on`, `receive`.
- Inbound vs Outbound: Use `receive(source, event)` for inbound messages (from webviews/HTTP bridge) to trigger extension handlers via `on(...)`. Use `broadcast`/`sendTo` to send messages to webviews.
- Sticky events: `Events.DashboardOpened` replays to late-joining webviews; cleared by `Events.DashboardClosed`.
- Sources: Common `source` values are `sidebar`, `dashboard`, `http-bridge`.

## Webviews
- Providers: `src/ui-providers/sidebar/*`, `src/ui-providers/health-dashboard/*` (Activity Bar container `kiroConstellation`, view id `kiroConstellation.sidebar`).
- Registering: Always use `registerWebviewWithBus(id, webview)` from `src/shared/utils/event-bus-register.utils.ts` to wire `onDidReceiveMessage` and register with the bus.
- Assets: Use `getEntryUris(context, webview, 'sidebar'|'dashboard')` from `src/ui-providers/asset-manifest.ts` to load Vite-built JS/CSS; falls back to `out/<entry>.{js,css}` when manifest is missing.
- CSP/Nonce: Generate a nonce via `getNonce()` and set CSP in provider HTML. Include `media` and `out` in `localResourceRoots`. Dashboard uses `retainContextWhenHidden: true`.
- Webview bus: `web/src/services/message-bus.service.ts` provides `on(type, handler)` and `emit(type, payload)`; webview code cannot import Node APIs.

## HTTP Bridge (external → extension)
- Server: Started by `startHttpBridge(context)` on activation. Default bind `http://127.0.0.1:39237`.
- Endpoint: `POST /events` with JSON `{ "type": string, "payload"?: any }`. Types must match values in `Events`.
- Env vars: `KIRO_MCP_BRIDGE_HOST`, `KIRO_MCP_BRIDGE_PORT` override bind. If port is in use, the bridge disables itself with a warning.
- Example: `curl -s -X POST http://127.0.0.1:39237/events -H 'Content-Type: application/json' -d '{"type":"openDashboard"}'`.

## MCP Provider
- Provider: `src/mcp/mcp.provider.ts` registers a stdio server via proposed `vscode.lm`; otherwise writes a fallback `.kiro/settings/mcp.json` in the workspace.
- Bundle: MCP entry `src/mcp/mcp-stdio.server.ts` bundles to `out/mcp/mcpStdioServer.cjs`; resolver picks the first existing candidate.
- Node/config overrides: Set `KIRO_MCP_NODE` to point to a Node binary; `KIRO_MCP_CONFIG_DIR` to change where `.kiro/settings/mcp.json` is written.

## Vite Asset Manifest
- Manifest: `out/.vite/manifest.json` maps source entries (e.g., `web/src/main-sidebar.tsx`, `web/src/main-dashboard.tsx`) to built assets.
- New entry: Add to `web/vite.config.ts` `rollupOptions.input`, create `web/src/main-<name>.tsx`, then consume via `getEntryUris(..., '<name>')` in your provider.

## Adding Events (pattern)
1) Contract: Add name to `Events` and payload to `EventPayloads` in `src/shared/events.ts`.
2) Extension handler: `messageBus.on(Events.YourEvent, (e) => { ... })` if the extension should react.
3) Webview emit: `messageBus.emit(Events.YourEvent, payload)` from `web/*`.
4) External emit: POST to the HTTP bridge with `{ type: Events.YourEvent, payload }`.

## Helpful References
- `src/extension.ts` (activation + global handlers)
- `src/ui-providers/health-dashboard/health-dashboard.panel.ts` (sticky open/close flow)
- `src/ui-providers/sidebar/sidebar.provider.ts` (registration + CSP + assets)

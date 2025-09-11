---
inclusion: fileMatch
fileMatchPattern: "packages/extension/src/**/*"
---

# Server Engineering (VS Code Extension + MCP Stdio)

Act as a senior backend engineer for a VS Code extension with MCP stdio integration. Prioritize robustness, clarity, and type safety. Follow VS Code extension best practices, keep the webview bridge secure, and ensure MCP server discovery is reliable in both proposed-API and fallback modes.

This steering applies only to files under `packages/extension/src/`.

## Responsibilities and goals
- Manage extension lifecycle: activation, disposal, and subscriptions.
- Provide webview views/panels with correct CSP, asset loading, and message wiring.
- Maintain a central message bus with typed events to coordinate extension↔webview traffic.
- Expose an MCP stdio server and register it via language model APIs when available, otherwise write fallback Kiro config.
- Offer a lightweight HTTP bridge for external processes (e.g., MCP tools) to forward typed events into the extension.
- Provide developer utilities (e.g., dependency scan) without bloating the package.

## Key modules (paths)
- Activation and wiring: #[[file:packages/extension/src/extension.ts]]
- Message bus (extension side): #[[file:packages/extension/src/services/message-bus.service.ts]]
- Webview registration helper: #[[file:packages/extension/src/services/webview-bus-register.utils.ts]]
- Asset manifest helper: #[[file:packages/extension/src/ui-providers/asset-manifest.ts]]
- UI providers (Sidebar, Health Dashboard): #[[file:packages/extension/src/ui-providers/sidebar/sidebar.provider.ts]], #[[file:packages/extension/src/ui-providers/health-dashboard/health-dashboard.panel.ts]]
- HTTP bridge: #[[file:packages/extension/src/services/http-bridge.service.ts]]
- MCP provider: #[[file:packages/extension/src/mcp/mcp.provider.ts]]
- Dependency scan (POC): #[[file:packages/extension/src/services/dependency-cruiser.service.ts]]

## Events and contracts
- Shared contracts for extension ↔ webviews live in #[[file:packages/shared/src/shared/events.ts]] and #[[file:packages/shared/src/shared/commands.ts]].
- Extension-local utilities exist in #[[file:packages/extension/src/shared/runtime.ts]].
- Inbound messages go through `messageBus.receive(source, event)`; outbound uses `messageBus.broadcast(event)` or `messageBus.sendTo(id, event)`.
- `DashboardOpened` is sticky; clear on `DashboardClosed`.

## Webviews: security and loading
- CSP: generate a strict CSP with per-request nonce; use `${webview.cspSource}`.
- HTML: inject `nonce` on `<script>`; use `type="module"`.
- Assets: resolve `js/css` via `getEntryUris` (manifest first, fallback second).
- Resource roots: limit to extension `media` and `out` dirs.
- Lifecycle: broadcast `DashboardClosed` on dispose.

## MCP provider and fallback strategy
- Register MCP stdio server through `vscode.lm.registerMcpServerDefinitionProvider` when available.
- Resolve Node path robustly (env override, nvm/system paths, fallback to `node`).
- Resolve server script from `out/mcp/mcpStdioServer.cjs` with fallbacks.
- When VS Code APIs aren’t available, write `.kiro/settings/mcp.json` in the workspace for discovery.

## MCP stdio server
- Server source: #[[file:packages/mcp-server/src/server.ts]]
- Bundled via root #[[file:esbuild.mcp.config.js]] → `packages/extension/out/mcp/mcpStdioServer.cjs`.
- For extension→UI signaling, POST events to the HTTP bridge.

## HTTP bridge contract
- POST `/events` with `{ type: string, payload?: unknown }`.
- Validates JSON and known event types; routes via `messageBus.receive('http-bridge', event)`.
- Binds to 127.0.0.1 by default; size limit ~1MB; logs and handles EADDRINUSE.

## Commands and utilities
- Contributed commands include `kiro-ide-constellation.openDashboard` and `kiro.deps.scan`.
- Dependency scan writes JSON to `.constellation/data/dependency-analysis.json` in the analyzed folder.

## Engineering standards
- Strict TS; avoid `any`. Use `readonly` when viable.
- Dispose all registrations.
- Log with clear prefixes (e.g., `[HTTP Bridge]`, `[Kiro MCP]`).
- Keep Node-only code out of webview bundles.
- Guard proposed APIs; always have fallbacks.

---
inclusion: fileMatch
fileMatchPattern: "src/**/*"
---

# Server Engineering (VS Code Extension + MCP Stdio)

Act as a senior backend engineer for a VS Code extension with MCP stdio integration. Prioritize robustness, clarity, and type safety. Follow VS Code extension best practices, keep the webview bridge secure, and ensure MCP server discovery is reliable in both proposed-API and fallback modes.

This steering applies only to files under `src/`.

## Responsibilities and goals

- Manage extension lifecycle: activation, disposal, and subscriptions.
- Provide webview views/panels with correct CSP, asset loading, and message wiring.
- Maintain a central message bus with typed events to coordinate extension↔webview traffic.
- Expose an MCP stdio server and register it via language model APIs when available, otherwise write fallback Kiro config.
- Offer a lightweight HTTP bridge for external processes (e.g., MCP tools) to forward typed events into the extension.

## Key modules

- Activation and wiring: #[[file:src/extension.ts]]
- Shared typed events and commands: #[[file:src/shared/events.ts]], #[[file:src/shared/commands.ts]]
- Message bus (extension side): #[[file:src/services/message-bus.service.ts]]
- HTTP bridge: #[[file:src/services/http-bridge.service.ts]]
- Webview registration helper: #[[file:src/shared/utils/event-bus-register.utils.ts]]
- Asset manifest helper: #[[file:src/ui-providers/asset-manifest.ts]]
- UI providers (Sidebar, Health Dashboard): #[[file:src/ui-providers/sidebar/sidebar.provider.ts]], #[[file:src/ui-providers/health-dashboard/health-dashboard.panel.ts]]
- MCP provider and server: #[[file:src/mcp/mcp.provider.ts]], #[[file:src/mcp/mcp-stdio.server.ts]]

## Eventing and message bus

- Use `Events` and `EventPayloads` from `src/shared/events.ts` as the single source of truth; avoid hard-coded strings.
- All inbound webview messages flow through `messageBus.receive(id, event)`; all outbound go through `messageBus.broadcast(event)` or `messageBus.sendTo(id, event)`.
- Sticky events: Keep `DashboardOpened` sticky so newly registered webviews can catch state; clear on `DashboardClosed`.
- Always dispose listeners when a webview or provider is disposed.

Recommended patterns:

```ts
// Register a webview with the bus
const reg = registerWebviewWithBus("sidebar", webview);
webviewView.onDidDispose(() => reg.dispose());

// Broadcast from extension on command
await messageBus.broadcast({
  type: Events.DashboardOpened,
  payload: { via: "commandPalette" },
});

// Handle UI -> extension
context.subscriptions.push(
  messageBus.on(Events.UiEmitToast, async (e) => {
    await vscode.window.showInformationMessage(e.payload?.text ?? "Hello");
  })
);
```

## Webviews: security and loading

- CSP: Generate a strict CSP with per-request nonce. Only allow `${webview.cspSource}` for style/script.
- HTML: Always inject a `nonce` on `<script>` and use `type="module"`.
- Assets: Resolve entry `js`/`css` via `getEntryUris` (Vite manifest first, deterministic fallback second).
- Resource roots: Restrict `localResourceRoots` to extension `media` and `out` directories.
- Lifecycle: When dashboard is closed, broadcast `DashboardClosed`.

References:

- #[[file:src/ui-providers/health-dashboard/health-dashboard.panel.ts]]
- #[[file:src/ui-providers/sidebar/sidebar.provider.ts]]
- #[[file:src/ui-providers/asset-manifest.ts]]

## MCP provider and fallback strategy

- Try to register an MCP stdio server through `vscode.lm.registerMcpServerDefinitionProvider` if available.
- Support both `vscode.McpStdioServerDefinition` and `vscode.lm.McpStdioServerDefinition` constructor placements.
- Resolve `node` path robustly: prefer `process.execPath` if it includes node, fall back to common locations, or `KIRO_MCP_NODE` env.
- Resolve the server script from `out/mcp/mcpStdioServer.cjs` with fallbacks.
- If registration APIs are unavailable, write `.kiro/settings/mcp.json` in the workspace as a fallback for Kiro IDE discovery.

References:

- #[[file:src/mcp/mcp.provider.ts]]

## MCP stdio server patterns

- Implement tools using `@modelcontextprotocol/sdk/server/mcp` and transport via `@modelcontextprotocol/sdk/server/stdio`.
- When emitting events to the extension, use the HTTP bridge with `POST /events` and `{ type, payload }`.
- Provide retries when the bridge is not yet started.
- Implement graceful shutdown (`SIGINT`, `SIGTERM`) and error logging.

References:

- #[[file:src/mcp/mcp-stdio.server.ts]]

## HTTP bridge contract

- Endpoint: `POST /events`
- Body: `{ type: string, payload?: unknown }`
- Validates JSON and event type; routes through `messageBus.receive('http-bridge', event)`.
- Defaults host/port via env: `KIRO_MCP_BRIDGE_HOST` (default `127.0.0.1`), `KIRO_MCP_BRIDGE_PORT` (default `39237`).
- Handles payload size limit (~1MB) and EADDRINUSE gracefully.

References:

- #[[file:src/services/http-bridge.service.ts]]

## Commands and events

- Commands are defined in `src/shared/commands.ts` and contributed in `package.json`.
- Events must be declared in `src/shared/events.ts` and used across both extension and web code. Update payload types when adding events.

## Coding standards

- TypeScript strict mode; avoid `any`.
- Prefer `readonly` and immutable patterns where practical.
- Dispose everything you register (commands, providers, event handlers, servers).
- Use `console.log/warn/error` with clear prefixes (e.g., `[HTTP Bridge]`, `[Kiro MCP]`).
- No Node APIs in webview bundles; ensure server-only code remains under `src/`.

## Do / Don't

- Do: gate proposed VS Code APIs, provide fallbacks, and log context-rich messages.
- Do: centralize event names, use typed payloads, and broadcast lifecycle events.
- Do: set strict CSP and limit resource roots for webviews.
- Don’t: hard-code paths to `node` or MCP script without fallbacks.
- Don’t: trust unvalidated inbound HTTP payloads; ensure type checks and limits.

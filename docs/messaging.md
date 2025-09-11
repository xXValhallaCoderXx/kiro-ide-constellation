# Messaging (extension ↔ webviews ↔ external)

Single, typed message bus connects:
- Extension host (VS Code extension)
- Webviews (Sidebar, Dashboard)
- External processes via a local HTTP bridge

Key paths
- Event contracts: packages/shared/src/shared/events.ts
- Extension bus: packages/extension/src/services/message-bus.service.ts
- Webview bus: packages/webview/src/services/message-bus.service.ts
- HTTP bridge: packages/extension/src/services/http-bridge.service.ts
- Webview registration helper: packages/extension/src/services/webview-bus-register.utils.ts

Core concepts
- Contracts: All event names and payload types live in packages/shared/src/shared/events.ts. Avoid hard-coded strings.
- Inbound vs outbound paths in the extension:
  - inbound: messageBus.receive(source, event) → triggers extension-side handlers registered with messageBus.on
  - outbound: messageBus.broadcast(event) or messageBus.sendTo(id, event) → sends to webviews
- Sticky events: Last-known state messages replay to late-joining webviews. Currently, Events.DashboardOpened is sticky and is cleared when Events.DashboardClosed is broadcast.

Extension-side API (message-bus.service.ts)
- register(id: string, webview: vscode.Webview): Disposable
  Adds/replaces the webview and immediately replays any sticky events. Dispose unregisters.
- broadcast({ type, payload }): Promise<void>
  Sends to all registered webviews; stores sticky events; clears DashboardOpened when DashboardClosed is broadcast.
- sendTo(id: string, { type, payload }): Promise<void>
  Sends to a specific webview id.
- on(type, handler): Disposable
  Subscribe to inbound events (from webviews/bridge). Handler receives { type, payload, source }.
- receive(source, { type, payload }): Promise<void>
  Inbound path that invokes handlers registered via on(...).

Webview-side API (packages/webview/src/services/message-bus.service.ts)
- on(type, handler): () => void
  Listen for messages posted from the extension.
- emit(type, payload): void
  Post a message to the extension via acquireVsCodeApi().
- events
  Re-export of Events from the shared contracts for convenience.

HTTP bridge (external → extension)
- File: packages/extension/src/services/http-bridge.service.ts
- Endpoint: POST http://127.0.0.1:39237/events with JSON { type, payload? }
- Env:
  - KIRO_MCP_BRIDGE_HOST (default 127.0.0.1)
  - KIRO_MCP_BRIDGE_PORT (default 39237)
- Flow: Bridge validates type against Events → messageBus.receive('http-bridge', { type, payload }) → extension handlers run.
- Safety: Loopback-only by default, ~1 MB body limit, graceful handling of EADDRINUSE, invalid JSON, unknown types.

Sticky events (details)
- Stored types: Events.DashboardOpened
- Clearing: When Events.DashboardClosed is broadcast, the stored DashboardOpened is removed.
- Why: Late-joining webviews (e.g., Sidebar after Dashboard opens) can immediately reflect current state.

Adding/updating events
1) Add the event name to packages/shared/src/shared/events.ts (Events constant) and its payload to EventPayloads.
2) If the extension should react, register a handler with messageBus.on(Events.YourEvent, (e) => { ... }).
3) Webviews emit with messageBus.emit(Events.YourEvent, payload).
4) External processes can POST to the HTTP bridge with { type: Events.YourEvent, payload }.

Common ids and sources
- Webview ids: 'sidebar', 'dashboard' (used in register and sendTo)
- Sources on inbound events: 'sidebar', 'dashboard', 'http-bridge'

Registration helper
- File: packages/extension/src/services/webview-bus-register.utils.ts
- Usage: registerWebviewWithBus('sidebar' | 'dashboard', webview) wires onDidReceiveMessage → messageBus.receive(id, msg) and registers the webview for outbound broadcasts.


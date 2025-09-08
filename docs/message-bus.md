# Message Bus

Single, typed message bus connecting the extension host, webviews, and external processes.

- Extension bus: `src/services/message-bus.service.ts`
- Webview bus: `web/src/services/message-bus.service.ts`
- HTTP bridge: `src/services/http-bridge.service.ts`
- Register helper: `src/shared/utils/event-bus-register.utils.ts`
- Event contracts: `src/shared/events.ts`

## Core API (extension bus)

- `register(id, webview) => Disposable` — adds/replaces a webview and replays sticky events.
- `broadcast({ type, payload })` — send to all registered webviews. Stores sticky events.
- `sendTo(id, { type, payload })` — target a single webview.
- `on(type, handler)` — subscribe to inbound events (from webviews/bridge).
- `receive(source, { type, payload })` — inbound path that triggers `on(...)` handlers.

Notes

- Sources include: `sidebar`, `dashboard`, `http-bridge`.
- Sticky events: `Events.DashboardOpened` (cleared by `Events.DashboardClosed`).

## Webview bus

`web/src/services/message-bus.service.ts` wraps `acquireVsCodeApi` with `on/emit`:

- `on(type, handler) => off` — listen to messages from extension.
- `emit(type, payload)` — post a message to extension.

## HTTP bridge (external → extension)

`startHttpBridge(context)` exposes a tiny local server for external emitters (e.g., MCP stdio):

- POST `http://127.0.0.1:39237/events` with JSON `{ type, payload? }`.
- Validates `type` against `Events` and calls `messageBus.receive('http-bridge', { ... })`.
- Env: `KIRO_MCP_BRIDGE_HOST`, `KIRO_MCP_BRIDGE_PORT`.

## Add a new event

1. Declare in `src/shared/events.ts` (name in `Events`, payload in `EventPayloads`).
2. Extension-side handler (if needed): `messageBus.on(Events.X, (e) => { ... })`.
3. Webview emit: `messageBus.emit(Events.X, payload)`.
4. External process: POST to the bridge with `{ type: Events.X, payload }`.

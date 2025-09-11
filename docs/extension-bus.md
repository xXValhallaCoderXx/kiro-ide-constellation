# Extension-side Message Bus (moved)

This document has been consolidated into ./messaging.md.

Please see: [Messaging](./messaging.md)

File: `src/services/message-bus.service.ts`

Central hub for routing messages between the extension host, webviews, and external processes via the HTTP bridge.

## API

- `register(id: string, webview: vscode.Webview): vscode.Disposable`

  - Adds or replaces the webview for `id`.
  - Replays sticky events to the webview immediately.
  - Returns a Disposable that unregisters the id when disposed.

- `broadcast(event: BusEvent): Promise<void>`

  - Sends to all registered webviews.
  - Stores sticky events so late-joining webviews receive the latest value.
  - Clears sticky `DashboardOpened` when `DashboardClosed` is broadcast.

- `sendTo(id: string, event: BusEvent): Promise<void>`

  - Sends to a specific webview id.

- `on(type: EventType, handler: (event & { source: string })) => vscode.Disposable`

  - Subscribe to specific events. `source` is the sender id (e.g., `sidebar`, `dashboard`).

- `receive(source: string, event: BusEvent): Promise<void>`
  - Inbound path. Called by providers/adapters to forward messages received from outside the bus (e.g., webviews, HTTP bridge). Triggers `on(...)` handlers in the extension.

### Inbound vs outbound (important)

- Inbound: Use `receive(source, event)` when a message comes from outside the bus into the extension (e.g., a webview posting `vscode.postMessage`, or the HTTP bridge receiving an HTTP POST). This path notifies extension listeners registered via `messageBus.on(...)`.
- Outbound: Use `broadcast(event)` to fan out a message to all registered webviews, or `sendTo(id, event)` to target a specific webview. This path does not invoke extension `on(...)` handlers.

## Sticky events

Sticky events are state-like messages where the last known value should be replayed to webviews that register later. This helps late-joining UIs "catch up" without waiting for the next broadcast.

The bus maintains a set of sticky event types:

```ts
private readonly stickyTypes = new Set<EventType>([Events.DashboardOpened]);
```

How it works:

- When `broadcast(event)` is called and `event.type` is in `stickyTypes`, the bus stores that event in an internal `stickyEvents` map.
- When a provider registers a webview via `register(id, webview)`, the bus replays any stored sticky events to that webview immediately. This is why a Sidebar that loads late can still show the current state (e.g., "Dashboard open via command").
- When a closing or resetting event is broadcast (e.g., `Events.DashboardClosed`), the bus clears the sticky value for `Events.DashboardOpened` so newly registered webviews won't get stale state.

Current sticky:

- `Events.DashboardOpened` — indicates the Dashboard is open and how it was opened. Cleared by `Events.DashboardClosed`.

When to use sticky events:

- Use for idempotent, global state where "last value wins" is meaningful (e.g., panel open/close, environment connected, current project selection).
- Avoid for transient, one-shot signals like toasts, pings, or logs. Those should not be replayed to late joiners.

Targeted vs sticky:

- Sticky behavior only applies to `broadcast(event)`, not `sendTo(id, event)`. Targeted messages are inherently ephemeral and not stored for replay.

To add another sticky type, include it in `stickyTypes` and, if applicable, make sure to clear it when an opposite/reset event is broadcast.

## Targeted vs broadcast

- Use `sendTo('sidebar', event)` to target a single webview.
- Use `broadcast(event)` to notify all registered webviews.

## Sources and registration helpers

Each inbound message is tagged with a `source` string so consumers can differentiate origins.

Common sources:

- `sidebar` — messages originating from the Sidebar webview.
- `dashboard` — messages originating from the Dashboard webview.
- `http-bridge` — messages originating from the local HTTP bridge (external processes, like the MCP stdio server).

Registering a webview with the bus:

- Helper: `registerWebviewWithBus(id: string, webview: vscode.Webview)` (File: `src/shared/utils/event-bus-register.utils.ts`)
  - Wires `webview.onDidReceiveMessage` → `messageBus.receive(id, ...)`
  - Registers the webview so it can receive outbound messages via `broadcast`/`sendTo`.

## HTTP Bridge adapter (MCP → Extension)

File: `src/services/http-bridge.service.ts`

Purpose: Allow external processes (e.g., the MCP stdio server) to emit events into the extension’s bus over localhost HTTP.

- Activation: `startHttpBridge(context)` is called in `src/extension.ts` during activation.
- Endpoint: `POST /events`
- Request body: JSON `{ type: string, payload?: any }`
- Default bind: `http://127.0.0.1:39237`
- Environment variables:
  - `KIRO_MCP_BRIDGE_HOST` — host/interface to bind (default `127.0.0.1`)
  - `KIRO_MCP_BRIDGE_PORT` — port to bind (default `39237`)

Flow:

1. External process sends HTTP POST to `/events` with `{ type, payload }`.
2. The bridge validates the event type against `Events` and calls:
   - `messageBus.receive('http-bridge', { type, payload })` (inbound path)
3. Extension listeners registered via `messageBus.on(...)` run. For example:
   - `Events.OpenDashboard` handler opens the dashboard and broadcasts `Events.DashboardOpened`.

Error handling and safety:

- If the port is already in use (`EADDRINUSE`), the bridge logs a warning and disables itself for the session (it does not crash activation).
- Payload size is limited (~1 MB). Invalid JSON or unknown event types return `400`.
- By default, the server binds to `127.0.0.1` only (loopback) to avoid exposing the endpoint externally.

### Example: open the Dashboard from an external process

Request:

```bash
curl -s -X POST http://127.0.0.1:39237/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"openDashboard"}'
```

Effect:

- Bridge calls `messageBus.receive('http-bridge', { type: 'openDashboard' })`
- Extension handler for `Events.OpenDashboard` calls `showHealthDashboard(...)` and then:
  - `messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'other' } })`
- Any registered webviews receive the sticky `DashboardOpened` state.

### Example: emit a UI toast from external process

Request:

```bash
curl -s -X POST http://127.0.0.1:39237/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"ui:emitToast","payload":{"text":"Hello from MCP"}}'
```

Effect:

- Bridge routes inbound via `receive('http-bridge', ...)` → extension `on(Events.UiEmitToast, ...)` handler → shows a VS Code information message.

## Adding new events

1. Add the event name to `src/shared/events.ts` (`Events` constant) and its payload to `EventPayloads`.
2. Register an extension-side handler with `messageBus.on(Events.YourEvent, (e) => { ... })` if the extension should react.
3. Webviews can emit using `postMessage({ type: Events.YourEvent, payload })` and will be wired via `registerWebviewWithBus`.
4. External processes can emit by POSTing to the HTTP bridge. The bridge will forward any event whose type matches a value in `Events`.

Notes:

- The HTTP bridge passes payloads through untyped at runtime. Validate payloads in your handlers if needed.
- Use `broadcast` only when you want to fan out to webviews. Use `receive` to flow inbound messages into extension handlers.

# Extension-side Message Bus

File: `src/services/messageBus.ts`

Central hub for routing messages between the extension host and webviews.

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
  - Called by providers to forward messages received from a webview.

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

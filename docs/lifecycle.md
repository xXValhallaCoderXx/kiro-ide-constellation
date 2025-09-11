# Webview Provider Lifecycle

Responsibilities

1) Configure webview options (CSP, localResourceRoots)
2) Render HTML that loads built JS/CSS via `getEntryUris`
3) Register the webview with the message bus
4) Forward messages from the webview to the bus
5) Dispose everything on webview destroy

Helper

- `packages/extension/src/services/webview-bus-register.utils.ts`
- `registerWebviewWithBus(id, webview, onDispose?) => Disposable`
  - Registers with the bus, wires `onDidReceiveMessage` → `messageBus.receive(id, msg)`
  - Disposes wiring and registration

Examples

- Sidebar: `registerWebviewWithBus('sidebar', webview)` and dispose on `webviewView.onDidDispose`
- Dashboard: `registerWebviewWithBus('dashboard', panel.webview)`; on dispose you may broadcast `Events.DashboardClosed` so other UIs update

Sticky events

- `Events.DashboardOpened` is sticky and replays to late joiners
- Cleared by `Events.DashboardClosed`

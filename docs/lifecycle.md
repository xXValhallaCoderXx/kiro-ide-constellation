# Webview Provider Lifecycle

Providers are responsible for:

1. Configuring webview options (CSP, localResourceRoots, etc.).
2. Producing HTML that loads the built JS/CSS via `getEntryUris`.
3. Registering the webview with the central message bus.
4. Forwarding messages from the webview to the bus.
5. Disposing of resources when the webview is destroyed.

## Helper

Use the helper to reduce boilerplate:

- File: `src/ui-providers/registerWithBus.ts`
- API: `registerWebviewWithBus(id, webview, onDispose?) => Disposable`
  - Registers with the bus
  - Forwards `onDidReceiveMessage` to `messageBus.receive(id, msg)`
  - Disposes both registration and forwarding when disposed

## Sidebar example

```ts
const registration = registerWebviewWithBus("sidebar", webview);
webviewView.onDidDispose(() => registration.dispose());
```

## Dashboard example

```ts
const registration = registerWebviewWithBus("dashboard", currentPanel.webview);
currentPanel.onDidDispose(() => {
  registration.dispose();
  // If applicable, broadcast a close event so other UIs can update
  void messageBus.broadcast({
    type: Events.DashboardClosed,
    payload: undefined,
  });
});
```

## Sticky events and late joiners

- Some events (like `DashboardOpened`) are sticky; newly registered webviews receive them immediately.
- When `DashboardClosed` is broadcast, the sticky state for `DashboardOpened` is cleared.

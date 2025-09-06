# Webview-side Message Bus

File: `web/src/services/messageBus.ts`

A thin wrapper around the VS Code webview API (`acquireVsCodeApi`) providing a consistent `on`/`emit` API analogous to the extension bus.

## API

- `messageBus.on(type, handler): () => void`

  - Subscribe to messages coming from the extension.
  - Returns an unsubscribe function.

- `messageBus.emit(type, payload): void`

  - Post a message to the extension.

- `events`
  - Re-export of `Events` from `src/shared/events.ts` for convenience.

## Example

```ts
import { messageBus, events } from "../services/messageBus";

// Emit to extension
messageBus.emit(events.UiEmitToast, { text: "hello" });

// Listen from extension
const off = messageBus.on(events.DashboardOpened, (e) => {
  console.log("opened via", e.payload?.via);
});

// Later
off();
```

## Notes

- The webview runtime cannot import `vscode` or Node modules.
- Communication uses `window.postMessage` under the hood; wrapping provides type-friendly ergonomics and parity with the extension bus.

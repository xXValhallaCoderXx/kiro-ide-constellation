# Events and Message Contracts

All event names and payloads are centralized in `src/shared/events.ts` to avoid hard-coded strings and ensure type safety on both extension and webview sides.

## Declaring events

Edit `src/shared/events.ts`:

- Add the event name to the `Events` const.
- Add the payload type in `EventPayloads`.
- The generic `BusEvent` ties `type` to the specific payload.

Example:

```ts
export const Events = {
  OpenDashboard: "openDashboard",
  UiEmitToast: "ui:emitToast",
  DashboardOpened: "dashboard:opened",
  DashboardClosed: "dashboard:closed",
} as const;

export type EventPayloads = {
  [Events.OpenDashboard]: undefined;
  [Events.UiEmitToast]: { text: string };
  [Events.DashboardOpened]: { via: "commandPalette" | "other" };
  [Events.DashboardClosed]: undefined;
};
```

## Usage patterns

- Extension side: `messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'commandPalette' } })`.
- Webview side: `messageBus.emit(Events.UiEmitToast, { text: 'hello' })`.

## Sticky events

Some events represent state that late-joining webviews should receive immediately. The extension bus maintains a sticky map for these events.

- Currently sticky: `Events.DashboardOpened`.
- When `Events.DashboardClosed` is broadcast, the sticky `DashboardOpened` state is cleared so newly registered webviews do not show stale state.

To add another sticky event, extend `stickyTypes` in `src/services/messageBus.ts`.

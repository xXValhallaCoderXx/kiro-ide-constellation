# Events and contracts

All events are centralized in `src/shared/events.ts` for type safety across extension and webviews.

Define events

- Add name in `Events`
- Add payload type in `EventPayloads`
- `BusEvent` ties `type` to payload

Usage

- Extension: `messageBus.broadcast({ type: Events.X, payload })`
- Webview: `messageBus.emit(Events.X, payload)`

Sticky

- Sticky events replay to late-joining webviews
- Current: `Events.DashboardOpened` (cleared by `Events.DashboardClosed`)
- To add one, extend `stickyTypes` in `src/services/message-bus.service.ts`

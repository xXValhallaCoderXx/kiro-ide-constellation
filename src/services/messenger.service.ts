// Centralized message broker for webview <-> extension communication
// Define allowed message shapes in one place.

export type InboundMessage =
  | { type: 'open-graph-view' }
  | { type: 'ping' }

export function handleWebviewMessage(msg: unknown, ctx: { revealGraphView: () => void; log: (s: string) => void }) {
  if (!msg || typeof (msg as any).type !== 'string') return
  const m = msg as InboundMessage
  switch (m.type) {
    case 'open-graph-view':
      ctx.revealGraphView()
      break
    case 'ping':
      ctx.log('webview ping')
      break
    default:
      break
  }
}


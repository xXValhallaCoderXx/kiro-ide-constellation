// Simple message bus for the webview UI
// Centralized here so views/components can communicate and post to extension

type Message =
  | { type: 'open-graph-view' }
  | { type: 'ping' }

function getApi() {
  return typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined
}

class Messenger {
  private api = getApi()

  post<T extends Message['type']>(type: T, payload?: Extract<Message, { type: T }> extends { [K in keyof any]: never } ? never : Omit<Extract<Message, { type: T }>, 'type'>) {
    this.api?.postMessage?.({ type, ...(payload as any) })
  }

  on(handler: (msg: Message) => void) {
    window.addEventListener('message', (e) => {
      const msg = e.data as Message
      if (msg && typeof (msg as any).type === 'string') handler(msg)
    })
  }
}

export const messenger = new Messenger()


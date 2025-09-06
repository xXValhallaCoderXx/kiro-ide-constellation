import { Events, EventType, BusEvent, EventPayloads } from '../../../src/shared/events';
import { getVsCodeApi } from '../vscode';

type Handler<K extends EventType = EventType> = (event: BusEvent<K>) => void | Promise<void>;

class WebviewMessageBus {
  private readonly vscode = getVsCodeApi<BusEvent>();
  private readonly handlers = new Map<EventType, Set<Handler>>();

  constructor() {
    window.addEventListener('message', (e: MessageEvent<BusEvent>) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) {
        return;
      }
      const set = this.handlers.get(msg.type as EventType);
      if (!set) {
        return;
      }
      for (const h of set) {
        Promise.resolve(h(msg as any));
      }
    });
  }

  on<K extends EventType>(type: K, handler: Handler<K>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)! as Set<Handler<K>>;
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends EventType>(type: K, payload: EventPayloads[K]): void {
    this.vscode.postMessage({ type, payload } as BusEvent<K>);
  }

  // Alias for clarity
  send = this.emit.bind(this);
}

export const events = Events;
export const messageBus = new WebviewMessageBus();
export type { EventType, BusEvent };

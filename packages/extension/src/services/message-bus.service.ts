import * as vscode from 'vscode';
import { BusEvent, EventType, Events } from '@kiro/shared';

type Handler<K extends EventType = EventType> = (event: BusEvent<K> & { source: string }) => void | Promise<void>;

class ExtensionMessageBus {
    private readonly webviews = new Map<string, vscode.Webview>();
    private readonly handlers = new Map<EventType, Set<Handler>>();
    private readonly stickyTypes = new Set<EventType>([Events.DashboardOpened]);
    private readonly stickyEvents = new Map<EventType, BusEvent>();

    register(id: string, webview: vscode.Webview): vscode.Disposable {
        this.webviews.set(id, webview);
        // Replay sticky events to newly registered webview so it can catch up
        for (const [, event] of this.stickyEvents) {
            try {
                void webview.postMessage(event);
            } catch {
                // ignore
            }
        }
        return new vscode.Disposable(() => this.unregister(id));
    }

    unregister(id: string): void {
        this.webviews.delete(id);
    }

    async broadcast<K extends EventType>(event: BusEvent<K>): Promise<void> {
        if (this.stickyTypes.has(event.type)) {
            this.stickyEvents.set(event.type, event);
        }
        // If dashboard is closing, clear the sticky opened state
        if (event.type === Events.DashboardClosed) {
            this.stickyEvents.delete(Events.DashboardOpened);
        }
        for (const [, webview] of this.webviews) {
            try {
                await webview.postMessage(event);
            } catch {
                // ignore failures from disposed webviews
            }
        }
    }

    async sendTo<K extends EventType>(targetId: string, event: BusEvent<K>): Promise<void> {
        const webview = this.webviews.get(targetId);
        if (webview) {
            try {
                await webview.postMessage(event);
            } catch {
                // ignore failures
            }
        }
    }

    on<K extends EventType>(type: K, handler: Handler<K>): vscode.Disposable {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        const set = this.handlers.get(type)! as Set<Handler<K>>;
        set.add(handler);
        return new vscode.Disposable(() => set.delete(handler));
    }

    async receive(source: string, event: BusEvent): Promise<void> {
        const set = this.handlers.get(event.type);
        if (!set || set.size === 0) {
            return;
        }
        const enriched = { ...event, source } as any;
        for (const handler of set) {
            await Promise.resolve((handler as Handler)(enriched));
        }
    }
}

export const messageBus = new ExtensionMessageBus();

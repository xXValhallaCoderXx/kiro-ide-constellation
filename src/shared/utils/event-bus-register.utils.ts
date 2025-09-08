import * as vscode from 'vscode';
import { messageBus } from '../../services/message-bus.service';

/**
 * Registers a webview with the central message bus, forwards messages, and handles disposal.
 * Returns a Disposable that cleans up all listeners and unregisters the webview from the bus.
 */
export function registerWebviewWithBus(
    id: string,
    webview: vscode.Webview,
    onDispose?: () => void
): vscode.Disposable {
    const subs: vscode.Disposable[] = [];
    subs.push(messageBus.register(id, webview));
    subs.push(
        webview.onDidReceiveMessage(async (msg) => {
            await messageBus.receive(id, msg as any);
        })
    );
    return new vscode.Disposable(() => {
        try {
            onDispose?.();
        } finally {
            subs.forEach((d) => d.dispose());
        }
    });
}

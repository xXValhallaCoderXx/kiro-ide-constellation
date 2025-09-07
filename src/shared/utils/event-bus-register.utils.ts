import * as vscode from 'vscode';
import { messageBus } from '../../services/messageBus';

/**
 * Registers a webview with the central message bus, forwards messages, and handles disposal.
 * Returns a Disposable that cleans up all listeners and unregisters the webview from the bus.
 */
export function registerWebviewWithBus(
    id: string,
    webview: vscode.Webview,
    onDispose?: () => void
): vscode.Disposable {
    console.log('[KIRO-CONSTELLATION] Registering webview with message bus, id:', id);

    try {
        const subs: vscode.Disposable[] = [];

        console.log('[KIRO-CONSTELLATION] Registering webview with message bus...');
        subs.push(messageBus.register(id, webview));

        console.log('[KIRO-CONSTELLATION] Setting up message listener...');
        subs.push(
            webview.onDidReceiveMessage(async (msg) => {
                console.log('[KIRO-CONSTELLATION] Message received from webview:', id, msg);
                await messageBus.receive(id, msg as any);
            })
        );

        console.log('[KIRO-CONSTELLATION] Webview registration completed for:', id);

        return new vscode.Disposable(() => {
            console.log('[KIRO-CONSTELLATION] Disposing webview registration for:', id);
            try {
                onDispose?.();
            } finally {
                subs.forEach((d) => d.dispose());
            }
        });
    } catch (error) {
        console.error('[KIRO-CONSTELLATION] Error registering webview with bus:', error);
        throw error;
    }
}

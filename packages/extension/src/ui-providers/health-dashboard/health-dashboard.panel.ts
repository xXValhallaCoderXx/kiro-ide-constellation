import * as vscode from 'vscode';
import { getNonce, Events } from '@kiro/shared';
import { getEntryUris } from '../asset-manifest';
import { messageBus } from '../../services/message-bus.service';
import { registerWebviewWithBus } from '../../services/webview-bus-register.utils';

let currentPanel: vscode.WebviewPanel | undefined;

export function showHealthDashboard(context: vscode.ExtensionContext) {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Active);
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'kiroConstellation.healthDashboard',
        'Kiro Constellation — Dashboard',
        { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                context.extensionUri,
                vscode.Uri.joinPath(context.extensionUri, 'media'),
                vscode.Uri.joinPath(context.extensionUri, 'out')
            ]
        }
    );

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
        // Announce dashboard closed so listeners (e.g., sidebar) can update UI
        void messageBus.broadcast({ type: Events.DashboardClosed, payload: undefined });
    }, null, context.subscriptions);

    currentPanel.webview.html = getHtml(context, currentPanel.webview);

    // Register dashboard with the central message bus
    const registration = registerWebviewWithBus('dashboard', currentPanel.webview);
    currentPanel.onDidDispose(() => {
        registration.dispose();
    });

}

function getHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const { script: scriptUri, css } = getEntryUris(context, webview, 'dashboard');
    const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'global.css'));
    const nonce = getNonce();
    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource} 'strict-dynamic';`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${globalCssUri}">
    ${css.map((u) => `<link rel="stylesheet" href="${u}">`).join('\n')}
        <title>Dashboard</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

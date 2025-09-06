import * as vscode from 'vscode';
import { getNonce } from '../../shared/nonce';

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
                vscode.Uri.joinPath(context.extensionUri, 'dist')
            ]
        }
    );

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
    }, null, context.subscriptions);

    currentPanel.webview.html = getHtml(context, currentPanel.webview);
}

function getHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'dashboard.js'));
    const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'global.css'));
    const nonce = getNonce();
    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="${globalCssUri}">
        <title>Dashboard</title>
    </head>
    <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

import * as vscode from 'vscode';

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
    const nonce = getNonce();
    const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'global.css'));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.css'));
    
    // Load the Preact bundle
    const healthDashboardJsUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'health-dashboard.js'));
    const jsxRuntimeUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'assets', 'jsxRuntime.module.js'));
    
    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="${globalCssUri}">
        <link rel="stylesheet" href="${cssUri}">
        <title>Dashboard</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="${jsxRuntimeUri}"></script>
        <script type="module" src="${healthDashboardJsUri}"></script>
    </body>
    </html>`;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

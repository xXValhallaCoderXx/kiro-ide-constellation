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
        }
    );

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
    }, null, context.subscriptions);

    currentPanel.webview.html = getHtml(currentPanel.webview);
}

function getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

    const styles = `
        :root { color-scheme: light dark; }
        body { font-family: var(--vscode-font-family); margin: 0; padding: 16px; color: var(--vscode-foreground); }
        h2 { margin: 0 0 12px; }
        p { opacity: 0.9; }
        .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; }
    `;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${styles}</style>
        <title>Dashboard</title>
    </head>
    <body>
        <h2>Health Dashboard</h2>
        <div class="card">
            <p>This is a starter dashboard webview. You can render status, metrics, or logs here.</p>
        </div>
        <script nonce="${nonce}">
            // Placeholder for future dashboard scripts
        </script>
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

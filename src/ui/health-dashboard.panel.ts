import * as vscode from 'vscode';

class HealthDashboardPanel {
    public static readonly viewType = 'kiroConstellation.healthDashboard';

    public static show(context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel(
            HealthDashboardPanel.viewType,
            'Health Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getHtml(panel.webview, context.extensionUri);
    }

    private static getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'webview.js')
        );

        const styles = `
            :root { color-scheme: light dark; }
            body { font-family: var(--vscode-font-family); margin: 0; padding: 12px; }
            .hello { color: var(--vscode-foreground); }
        `;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>${styles}</style>
                <title>Health Dashboard</title>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

export function registerHealthDashboardPanel(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'kiro-ide-constellation.openHealthDashboard',
            () => HealthDashboardPanel.show(context)
        )
    );
}

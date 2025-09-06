import * as vscode from 'vscode';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'kiroConstellation.sidebar';

    constructor(private readonly context: vscode.ExtensionContext) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg?.type === 'openDashboard') {
                vscode.commands.executeCommand('kiro-ide-constellation.openDashboard');
            }
        });
    }

    private getHtml(): string {
        const styles = `
            :root { color-scheme: light dark; }
            body { font-family: var(--vscode-font-family); margin: 0; padding: 12px; }
            .hello { color: var(--vscode-foreground); }
            .actions { margin-top: 12px; }
            button { padding: 6px 10px; cursor: pointer; }
        `;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>${styles}</style>
                <title>Kiro Constellation</title>
            </head>
            <body>
                <h3 class="hello">Hello World</h3>
                <div class="actions">
                    <button id="open-dashboard">Open Dashboard</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('open-dashboard')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'openDashboard' });
                    });
                </script>
            </body>
            </html>`;
    }
}

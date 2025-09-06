import * as vscode from 'vscode';
import * as path from 'path';

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
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'out'))]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);
    }

    private getHtml(webview: vscode.Webview): string {
        const scriptPath = vscode.Uri.file(
            path.join(this.context.extensionPath, 'out', 'webview.js')
        );
        const scriptUri = webview.asWebviewUri(scriptPath);

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
                <title>Kiro Constellation</title>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

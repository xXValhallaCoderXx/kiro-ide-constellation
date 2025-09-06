import * as vscode from 'vscode';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'kiroConstellation.sidebar';

    constructor(private readonly context: vscode.ExtensionContext) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        const webview = webviewView.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri,
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ]
        };

        webview.html = this.getHtml(webview);

        webview.onDidReceiveMessage((msg) => {
            if (msg?.type === 'openDashboard') {
                vscode.commands.executeCommand('kiro-ide-constellation.openDashboard');
            }
        });
    }

    private getHtml(webview: vscode.Webview): string {
        const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'global.css'));
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'sidebar.css'));
        
        // Load the Preact bundle
        const sidebarJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'sidebar.js'));
        const jsxRuntimeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'assets', 'jsxRuntime.module.js'));
        
        const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';`;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-Security-Policy" content="${csp}">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="stylesheet" href="${globalCssUri}">
                <link rel="stylesheet" href="${cssUri}">
                <title>Kiro Constellation</title>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="${jsxRuntimeUri}"></script>
                <script type="module" src="${sidebarJsUri}"></script>
            </body>
            </html>`;
    }
}

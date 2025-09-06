import * as vscode from 'vscode';
import { getNonce } from '../../shared/nonce';
import { getEntryUris } from '../asset-manifest';

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
                vscode.Uri.joinPath(this.context.extensionUri, 'out')
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
        const { script: scriptUri, css } = getEntryUris(this.context, webview, 'sidebar');
        const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'global.css'));
        const nonce = getNonce();
        const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource};`;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-Security-Policy" content="${csp}">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="stylesheet" href="${globalCssUri}">
                ${css.map((u) => `<link rel="stylesheet" href="${u}">`).join('\n')}
                <title>Kiro Constellation</title>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

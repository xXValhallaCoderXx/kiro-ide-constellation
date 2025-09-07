import * as vscode from 'vscode';
import { getNonce } from '../../shared/utils/generate-nonce.utils';
import { getEntryUris } from '../asset-manifest';
import { registerWebviewWithBus } from '../../shared/utils/event-bus-register.utils';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'kiroConstellation.sidebar';

    constructor(private readonly context: vscode.ExtensionContext) {
        console.log('[KIRO-CONSTELLATION] SidebarViewProvider constructor called');
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        console.log('[KIRO-CONSTELLATION] resolveWebviewView called for sidebar');
        
        try {
            const webview = webviewView.webview;
            console.log('[KIRO-CONSTELLATION] Setting webview options...');
            
            webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    this.context.extensionUri,
                    vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                    vscode.Uri.joinPath(this.context.extensionUri, 'out')
                ]
            };
            console.log('[KIRO-CONSTELLATION] Webview options set');

            console.log('[KIRO-CONSTELLATION] Generating HTML...');
            webview.html = this.getHtml(webview);
            console.log('[KIRO-CONSTELLATION] HTML set for webview');

            console.log('[KIRO-CONSTELLATION] Registering webview with message bus...');
            const registration = registerWebviewWithBus('sidebar', webview);
            webviewView.onDidDispose(() => {
                console.log('[KIRO-CONSTELLATION] Sidebar webview disposed');
                registration.dispose();
            });
            console.log('[KIRO-CONSTELLATION] Sidebar webview setup completed');
        } catch (error) {
            console.error('[KIRO-CONSTELLATION] Error in resolveWebviewView:', error);
            throw error;
        }
    }

    private getHtml(webview: vscode.Webview): string {
        console.log('[KIRO-CONSTELLATION] Getting entry URIs for sidebar...');
        const { script: scriptUri, css } = getEntryUris(this.context, webview, 'sidebar');
        console.log('[KIRO-CONSTELLATION] Script URI:', scriptUri.toString());
        console.log('[KIRO-CONSTELLATION] CSS URIs:', css.map(u => u.toString()));
        
        const globalCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'global.css'));
        console.log('[KIRO-CONSTELLATION] Global CSS URI:', globalCssUri.toString());
        
        const nonce = getNonce();
        const csp = `default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource};`;
        
        const html = `<!DOCTYPE html>
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
        
        console.log('[KIRO-CONSTELLATION] Generated HTML length:', html.length);
        return html;
    }
}

// Centralized helpers for rendering VS Code webviews that reuse the same bundle.
import * as vscode from 'vscode'

function nonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))
  return text
}

export function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri, view: 'sidepanel' | 'graph', title: string) {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'ui', 'main.js'))
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'ui', 'style.css'))
  const n = nonce()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${n}' ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>${title}</title>
  <style>body,html{margin:0;padding:0}#root{padding:8px;font-family: var(--vscode-font-family); color: var(--vscode-foreground);}</style>
</head>
<body>
  <div id="root" data-view="${view}"></div>
  <script nonce="${n}" src="${scriptUri}"></script>
</body>
</html>`
}


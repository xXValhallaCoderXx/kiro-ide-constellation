import * as vscode from "vscode";
import { renderHtml } from "./services/webview.service.js";

export class SidePanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "constellation.sidePanel";

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    const { webview } = webviewView;

    // Handle messages from the webview (e.g., open Graph View)
    webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'open-graph-view') {
        void vscode.commands.executeCommand('constellation.openGraphView');
      }
    });
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "out"),
        vscode.Uri.joinPath(this.extensionUri, "out", "ui"),
      ],
    };

    webview.html = renderHtml(webview, this.extensionUri, "sidepanel", "Constellation");
  }
}

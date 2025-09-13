import * as vscode from "vscode";
import { renderHtml } from "./services/webview.service.js";

export class GraphViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "constellation.graphView";

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    const { webview } = webviewView;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "out"),
        vscode.Uri.joinPath(this.extensionUri, "out", "ui"),
      ],
    };

    // Handle messages if needed (e.g., future graph interactions)
    webview.onDidReceiveMessage((msg) => {
      // Placeholder for graph-specific messages
    });

    webview.html = renderHtml(webview, this.extensionUri, "graph", "Constellation Graph");
  }
}


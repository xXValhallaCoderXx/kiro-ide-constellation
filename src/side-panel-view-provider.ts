import * as vscode from "vscode";
import { renderHtml } from "./services/webview.service.js";

export class SidePanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "constellation.sidePanel";

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    const { webview } = webviewView;

    // Handle messages via centralized messenger
    webview.onDidReceiveMessage((msg) => {
      import('./services/messenger.service.js').then(({ handleWebviewMessage }) =>
        handleWebviewMessage(msg, {
          revealGraphView: () => void vscode.commands.executeCommand('constellation.openGraphView'),
          log: (s) => console.log(s),
        })
      ).catch(() => {/* ignore */})
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

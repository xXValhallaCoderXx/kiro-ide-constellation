import * as vscode from "vscode";
import { renderHtml } from "./services/webview.service.js";

export class SidePanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "constellation.sidePanel";

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extensionContext?: vscode.ExtensionContext
  ) {}

  private getExtensionContext(): vscode.ExtensionContext {
    if (!this.extensionContext) {
      throw new Error('Extension context not available');
    }
    return this.extensionContext;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    const { webview } = webviewView;

    // Handle messages via centralized router
    const { configureGraphMessaging } = await import('./services/message-router.service.js');
    configureGraphMessaging(webview, {
      revealGraphView: () => void vscode.commands.executeCommand('constellation.openGraphView'),
      log: (s) => console.log(s),
      postMessage: (message) => webview.postMessage(message),
      extensionContext: this.getExtensionContext(),
      openFile: async (path: string) => {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          console.error('Failed to open file:', path, error);
        }
      },
      triggerScan: async () => {
        const { runScan } = await import('./services/dependency-cruiser.service.js');
        await runScan(this.getExtensionContext());
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

import * as vscode from "vscode";
import { renderHtml } from "./services/webview.service.js";
import { AgentModeService } from "./services/agent-mode.service.js";

export class SidePanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "constellation.sidePanel";
  private webview?: vscode.Webview;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extensionContext?: vscode.ExtensionContext,
    private readonly onboardingModeService?: any,
    private readonly onboardingWalkthroughService?: any,
    private readonly agentModeService?: any
  ) {}

  public postMessage(message: any): void {
    this.webview?.postMessage(message);
  }

  private getExtensionContext(): vscode.ExtensionContext {
    if (!this.extensionContext) {
      throw new Error('Extension context not available');
    }
    return this.extensionContext;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    const { webview } = webviewView;
    this.webview = webview;

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
      },
      onboardingModeService: this.onboardingModeService,
      onboardingWalkthroughService: this.onboardingWalkthroughService,
      agentModeService: this.agentModeService
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

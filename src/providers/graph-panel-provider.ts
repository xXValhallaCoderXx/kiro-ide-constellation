import * as vscode from "vscode";
import { renderHtml } from "../services/webview.service.js";
import { configureGraphMessaging } from "../services/message-router.service.js";

export type ImpactPayload = { sourceFile: string; affectedFiles: string[] };

export class GraphPanelProvider {
  private panel: vscode.WebviewPanel | undefined;
  private ready = false;
  private pendingImpact: ImpactPayload | null = null;
  private messageDisposable: vscode.Disposable | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async ensureOpen() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Active, true);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'constellation.graphPanel',
      'Constellation Graph',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'out'),
          vscode.Uri.joinPath(this.context.extensionUri, 'out', 'ui'),
        ],
      }
    );

    this.ready = false;

    this.messageDisposable = configureGraphMessaging(this.panel.webview, {
      revealGraphView: () => void vscode.commands.executeCommand('constellation.openGraphView'),
      log: (s) => console.log(s),
      postMessage: (message) => this.panel?.webview.postMessage(message),
      extensionContext: this.context,
      openFile: async (path: string) => {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          console.error('Failed to open file:', path, error);
        }
      },
      triggerScan: async () => {
        const { runScan } = await import('../services/dependency-cruiser.service.js');
        await runScan(this.context);
      }
    });

    // Intercept readiness handshake to flush pending impact payload
    this.panel.webview.onDidReceiveMessage((msg) => {
      try {
        if (msg && typeof msg.type === 'string' && msg.type === 'graph/ready') {
          this.ready = true;
          if (this.pendingImpact && this.panel) {
            this.panel.webview.postMessage({ type: 'graph/impact', payload: this.pendingImpact });
            this.pendingImpact = null;
          }
        }
      } catch {/* ignore */}
    });

    this.panel.webview.html = renderHtml(this.panel.webview, this.context.extensionUri, 'graph', 'Constellation Graph');

    this.panel.onDidDispose(() => {
      this.messageDisposable?.dispose();
      this.panel = undefined;
      this.ready = false;
      this.pendingImpact = null;
    });
  }

  async postImpact(payload: ImpactPayload) {
    this.pendingImpact = payload;
    await this.ensureOpen();

    const trySend = () => {
      if (this.panel && this.ready && this.pendingImpact) {
        this.panel.webview.postMessage({ type: 'graph/impact', payload: this.pendingImpact });
        this.pendingImpact = null;
        return true;
      }
      return false;
    };

    if (trySend()) return;

    const retries = [100, 250, 500, 1000];
    for (const delay of retries) {
      await new Promise((r) => setTimeout(r, delay));
      if (trySend()) return;
    }
    console.warn('[Constellation] Impact payload not sent yet; queued awaiting graph/ready');
  }
}


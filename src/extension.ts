import * as vscode from "vscode";
import { getEffectiveServerId, resolveNodeBin } from "./services/extension-config.service.js";
import { upsertUserMcpConfig, maybeWriteWorkspaceConfig, selfTest } from "./services/mcp-config.service.js";
import { isNodeVersionSupported } from "./services/node-version.service.js";
import { SidePanelViewProvider } from "./side-panel-view-provider.js";
import { runScan } from "./services/dependency-cruiser.service.js";
import { startHttpBridge } from "./services/http-bridge.service.js";

let graphPanel: vscode.WebviewPanel | undefined;
let graphWebviewReady = false;
let pendingImpactPayload: { sourceFile: string; affectedFiles: string[] } | null = null;

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Register side panel webview provider (visible when user clicks the Activity Bar icon)
    const provider = new SidePanelViewProvider(context.extensionUri, context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidePanelViewProvider.viewType, provider)
    );

    // Run MCP setup in the background so activation (and the panel) doesn't block
    void (async () => {
      try {
        // Node 18+ requirement
        const { ok, found } = isNodeVersionSupported(18);
        if (!ok) {
          vscode.window.showErrorMessage(
            `Kiro Constellation: Node 18+ required (found ${found}).`
          );
          return;
        }

        // Path to compiled MCP server file
        const serverJs = vscode.Uri.joinPath(context.extensionUri, "out", "mcp.server.js").fsPath;

        // Start local HTTP bridge for webview commands
        const { port: bridgePort, token: bridgeToken } = await startHttpBridge(context);

        // Server ID (namespacing)
        const serverId = getEffectiveServerId();

        // Write/merge Kiro MCP user config
        const nodeBin = resolveNodeBin();
        const extraEnv = { CONSTELLATION_BRIDGE_PORT: String(bridgePort), CONSTELLATION_BRIDGE_TOKEN: bridgeToken };
        const userCfgPath = await upsertUserMcpConfig(nodeBin, serverJs, serverId, extraEnv);

        // Optionally write workspace config
        await maybeWriteWorkspaceConfig(nodeBin, serverJs, serverId, extraEnv);

        // Self-test: can we boot the server quickly?
        const okTest = await selfTest(nodeBin, serverJs);
        if (!okTest) {
          vscode.window.showErrorMessage(
            "Kiro Constellation setup failed: Could not start local MCP server. Ensure Node 18+ is installed or set Constellation: Node Path.")
          return;
        }

        // Success toast (do not block activation)
        void vscode.window.showInformationMessage(
          "Kiro Constellation is set up. Reload Kiro to start the MCP server.",
          "Reload Window",
          "Open MCP Config"
        ).then(async (choice) => {
          if (choice === "Reload Window") {
            void vscode.commands.executeCommand("workbench.action.reloadWindow");
          } else if (choice === "Open MCP Config") {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(userCfgPath));
            void vscode.window.showTextDocument(doc);
          }
        });

        // Run dependency scan in background (non-blocking)
        try {
          void runScan(context);
        } catch (err: any) {
          // Log error but don't disrupt extension functionality
          console.error('Dependency scan failed during activation:', err?.message ?? String(err));
        }

        // Commands
        context.subscriptions.push(
          vscode.commands.registerCommand("constellation.selfTest", async () => {
            const ok2 = await selfTest(nodeBin, serverJs);
            void vscode.window.showInformationMessage(`Self-test: ${ok2 ? "OK" : "FAILED"}`);
          }),
          vscode.commands.registerCommand("constellation.openUserMcpConfig", async () => {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(userCfgPath));
            void vscode.window.showTextDocument(doc);
          }),
          vscode.commands.registerCommand("constellation.scanDependencies", async () => {
            try {
              await runScan(context);
              void vscode.window.showInformationMessage("Dependency scan completed successfully");
            } catch (err: any) {
              console.error('Manual dependency scan failed:', err?.message ?? String(err));
              void vscode.window.showErrorMessage(`Dependency scan failed: ${err?.message ?? String(err)}`);
            }
          }),
          vscode.commands.registerCommand("constellation.openGraphView", async () => {
            // Singleton: if already open, just reveal
            if (graphPanel) {
              graphPanel.reveal(vscode.ViewColumn.Active, true);
              return;
            }
            graphPanel = vscode.window.createWebviewPanel(
              'constellation.graphPanel',
              'Constellation Graph',
              vscode.ViewColumn.Active,
              {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                  vscode.Uri.joinPath(context.extensionUri, 'out'),
                  vscode.Uri.joinPath(context.extensionUri, 'out', 'ui'),
                ],
              }
            );
            
            // Reset readiness for a newly created panel
            graphWebviewReady = false;
            
            // Set up message handling for graph panel
            const messageDisposable = graphPanel.webview.onDidReceiveMessage((msg) => {
              // Intercept webview readiness handshake
              try {
                if (msg && typeof msg.type === 'string' && msg.type === 'graph/ready') {
                  graphWebviewReady = true;
                  if (pendingImpactPayload && graphPanel) {
                    graphPanel.webview.postMessage({
                      type: 'graph/impact',
                      payload: pendingImpactPayload,
                    });
                    pendingImpactPayload = null;
                  }
                }
              } catch {/* ignore */}

              import('./services/messenger.service.js').then(({ handleWebviewMessage }) =>
                handleWebviewMessage(msg, {
                  revealGraphView: () => void vscode.commands.executeCommand('constellation.openGraphView'),
                  log: (s) => console.log(s),
                  postMessage: (message) => graphPanel?.webview.postMessage(message),
                  extensionContext: context,
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
                    await runScan(context);
                  }
                })
              ).catch(() => {/* ignore */})
            });
            
            const { renderHtml } = await import('./services/webview.service.js');
            graphPanel.webview.html = renderHtml(graphPanel.webview, context.extensionUri, 'graph', 'Constellation Graph');
            
            // Ensure proper cleanup of message handlers on panel disposal
            graphPanel.onDidDispose(() => { 
              messageDisposable.dispose();
              graphPanel = undefined; 
              graphWebviewReady = false;
              pendingImpactPayload = null;
            });
          }),
          vscode.commands.registerCommand("constellation.showImpact", async (payload: { sourceFile: string; affectedFiles: string[] }) => {
            // Store payload so we can deliver it after webview is ready
            pendingImpactPayload = payload;

            // Ensure graph panel exists and is visible
            await vscode.commands.executeCommand('constellation.openGraphView');
            
            // If ready, send immediately; otherwise, it will send on graph/ready
            if (graphPanel && graphWebviewReady && pendingImpactPayload) {
              graphPanel.webview.postMessage({
                type: 'graph/impact',
                payload: pendingImpactPayload
              });
              pendingImpactPayload = null;
            }
          })
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Kiro Constellation error: ${err?.message ?? String(err)}`);
      }
    })();
  } catch (err: any) {
    vscode.window.showErrorMessage(`Kiro Constellation error: ${err?.message ?? String(err)}`);
  }
}

export function deactivate() { /* noop */ }

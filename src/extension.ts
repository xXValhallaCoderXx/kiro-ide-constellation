import * as vscode from "vscode";
import { getEffectiveServerId, resolveNodeBin } from "./services/extension-config.service.js";
import { upsertUserMcpConfig, maybeWriteWorkspaceConfig, selfTest } from "./services/mcp-config.service.js";
import { isNodeVersionSupported } from "./services/node-version.service.js";
import { SidePanelViewProvider } from "./side-panel-view-provider.js";
import { runScan } from "./services/dependency-cruiser.service.js";
import * as path from "node:path";

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Register side panel webview provider (visible when user clicks the Activity Bar icon)
    const provider = new SidePanelViewProvider(context.extensionUri);
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

        // Server ID (namespacing)
        const serverId = getEffectiveServerId();

        // Write/merge Kiro MCP user config
        const nodeBin = resolveNodeBin();
        const userCfgPath = await upsertUserMcpConfig(nodeBin, serverJs, serverId);

        // Optionally write workspace config
        await maybeWriteWorkspaceConfig(nodeBin, serverJs, serverId);

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
            // Open a new editor tab with a webview that renders GraphView
            const panel = vscode.window.createWebviewPanel(
              'constellation.graph',
              'Constellation Graph',
              vscode.ViewColumn.Active,
              {
                enableScripts: true,
                localResourceRoots: [
                  vscode.Uri.joinPath(context.extensionUri, 'out'),
                  vscode.Uri.joinPath(context.extensionUri, 'out', 'ui'),
                ],
              }
            );

            const scriptUri = panel.webview.asWebviewUri(
              vscode.Uri.joinPath(context.extensionUri, 'out', 'ui', 'main.js')
            );
            const styleUri = panel.webview.asWebviewUri(
              vscode.Uri.joinPath(context.extensionUri, 'out', 'ui', 'style.css')
            );
            const nonce = Math.random().toString(36).slice(2);

            panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} https:; style-src 'unsafe-inline' ${panel.webview.cspSource}; script-src 'nonce-${nonce}' ${panel.webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Constellation Graph</title>
  <style>body,html{margin:0;padding:0}#root{padding:8px;font-family: var(--vscode-font-family); color: var(--vscode-foreground);}</style>
</head>
<body>
  <div id="root" data-view="graph"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
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

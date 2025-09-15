import * as vscode from "vscode";
import { getEffectiveServerId, resolveNodeBin } from "./services/extension-config.service.js";
import { upsertUserMcpConfig, maybeWriteWorkspaceConfig, selfTest } from "./services/mcp-config.service.js";
import { isNodeVersionSupported } from "./services/node-version.service.js";
import { SidePanelViewProvider } from "./side-panel-view-provider.js";
import { runScan } from "./services/dependency-cruiser.service.js";
import { startHttpBridge } from "./services/http-bridge.service.js";
import { OnboardingModeService } from "./services/onboarding-mode.service.js";
import { OnboardingWalkthroughService } from "./services/onboarding-walkthrough.service.js";

// Graph panel provider singleton instance (lazily imported)
let graphProvider: any | null = null;

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize onboarding services (legacy) and generic agent mode service
    const onboardingModeService = OnboardingModeService.getInstance();
    const onboardingWalkthroughService = new OnboardingWalkthroughService();
    const { AgentModeService } = await import('./services/agent-mode.service.js');
    const agentModeService = AgentModeService.getInstance();

    // Register side panel webview provider (visible when user clicks the Activity Bar icon)
    const provider = new SidePanelViewProvider(context.extensionUri, context, onboardingModeService, onboardingWalkthroughService, agentModeService);
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

        // Start local HTTP bridge for webview commands with onboarding services
        const { port: bridgePort, token: bridgeToken } = await startHttpBridge(context, onboardingWalkthroughService, provider);

        // Server ID (namespacing)
        const serverId = getEffectiveServerId();

        // Write/merge Kiro MCP user config
        const nodeBin = resolveNodeBin();
        const extraEnv: Record<string, string> = { 
          CONSTELLATION_BRIDGE_PORT: String(bridgePort), 
          CONSTELLATION_BRIDGE_TOKEN: bridgeToken 
        };
        
        // Add workspace root to environment if available
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
          extraEnv.CONSTELLATION_WORKSPACE_ROOT = workspaceRoot;
        }
        
        const userCfgPath = await upsertUserMcpConfig(nodeBin, serverJs, serverId, extraEnv);

        // Optionally write workspace config
        await maybeWriteWorkspaceConfig(nodeBin, serverJs, serverId, extraEnv);

        // Self-test: can we boot the server quickly?
        const okTest = await selfTest(nodeBin, serverJs);
        if (!okTest) {
          vscode.window.showErrorMessage(
            "Kiro Constellation setup failed: Could not start local MCP server. Ensure Node 18+ is installed or set Constellation: Node Path.");
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

        // Also refresh 90-day Git metrics in the background (non-blocking)
        try {
          const { ensureGitMetrics } = await import('./services/git-metrics.service.js');
          void ensureGitMetrics(context);
        } catch (err: any) {
          console.warn('Git metrics refresh failed during activation:', err?.message ?? String(err));
        }

        // Commands
        context.subscriptions.push(
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
            const { GraphPanelProvider } = await import('./providers/graph-panel-provider.js');
            if (!graphProvider) {
              graphProvider = new GraphPanelProvider(context);
            }
            await graphProvider.ensureOpen();
          }),
          vscode.commands.registerCommand("constellation.showImpact", async (payload: { sourceFile: string; affectedFiles: string[] }) => {
            const { GraphPanelProvider } = await import('./providers/graph-panel-provider.js');
            if (!graphProvider) {
              graphProvider = new GraphPanelProvider(context);
            }
            await graphProvider.postImpact(payload);
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

export function deactivate() {
  // Cleanup is handled by context.subscriptions.push() calls
  // HTTP bridge server is disposed via context subscription
  // Onboarding services will be garbage collected
}

import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';
import { showHealthDashboard } from './ui-providers/health-dashboard/health-dashboard.panel';
import { messageBus } from './services/messageBus';
import { Events } from './shared/events';
// NOTE: Keep MCP startup simple: start server and expose Copy URL command. No auto-registration.

let currentMcpUrl: string | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kiro-ide-constellation" is now active!');

	// Register the side panel view provider
	registerSidebarViews(context);
	// Register the health dashboard command/view
	registerHealthDashboard(context);

	// Global handler: show a VS Code toast when UI requests it
	context.subscriptions.push(
		messageBus.on(Events.UiEmitToast, async (e) => {
			const text = e.payload?.text ?? 'Hello from UI';
			await vscode.window.showInformationMessage(text);
		})
	);

	// Global handler: when any webview requests opening the dashboard, execute the command
	context.subscriptions.push(
		messageBus.on(Events.OpenDashboard, async (_e) => {
			// Open dashboard due to UI event (not palette), then broadcast with via: 'other'
			showHealthDashboard(context);
			await messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'other' } });
		})
	);

	// Start MCP server automatically with the extension (lazy import to avoid blocking UI if MCP fails)
	(async () => {
		try {
			const kiroCfg = vscode.workspace.getConfiguration('kiro');
			const port = kiroCfg.get<number>('mcp.port') ?? 0;
			const path = kiroCfg.get<string>('mcp.path') ?? '/mcp';
			const { createAndStartMcpServer } = await import('./mcp/mcp.server.js');
			const controller = await createAndStartMcpServer({ port, path });
			context.subscriptions.push({ dispose: () => controller.dispose() });
			console.log(`[MCP] Ready at ${controller.url}`);

			// Expose the server URL directly (no auto-registration)
			currentMcpUrl = controller.url;
		} catch (err) {
			console.error('[MCP] Failed to start', err);
		}
	})();

	// Helper MCP commands
	context.subscriptions.push(
		vscode.commands.registerCommand('kiro-ide-constellation.mcp.copyUrl', async () => {
			if (!currentMcpUrl) {
				await vscode.window.showWarningMessage('MCP server URL is not available yet.');
				return;
			}
			await vscode.env.clipboard.writeText(currentMcpUrl);
			await vscode.window.showInformationMessage('MCP URL copied to clipboard.');
		})
	);

}

// This method is called when your extension is deactivated
export function deactivate() { }

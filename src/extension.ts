import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';
import { showHealthDashboard } from './ui-providers/health-dashboard/health-dashboard.panel';
import { messageBus } from './services/messageBus';
import { Events } from './shared/events';
import { createAndStartMcpServer } from './mcp/mcp.server';

let currentMcpUrl: string | undefined;

async function registerMcpInSettings(url: string) {
	const label = 'Kiro Constellation';
	const entry = { transport: 'sse', url } as const;
	const apply = async (section: string) => {
		const cfg = vscode.workspace.getConfiguration(section);
		const current = (cfg.get<Record<string, unknown>>('servers') ?? {});
		if (JSON.stringify(current[label]) !== JSON.stringify(entry)) {
			await cfg.update('servers', { ...current, [label]: entry }, vscode.ConfigurationTarget.Global);
		}
	};
	await apply('mcp');
	await apply('modelcontextprotocol');
}

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

	// Start MCP server automatically with the extension
	(async () => {
		try {
			const kiroCfg = vscode.workspace.getConfiguration('kiro');
			const port = kiroCfg.get<number>('mcp.port') ?? 0;
			const path = kiroCfg.get<string>('mcp.path') ?? '/mcp';
			const controller = await createAndStartMcpServer({ port, path });
			context.subscriptions.push({ dispose: () => controller.dispose() });
			console.log(`[MCP] Ready at ${controller.url}`);
			currentMcpUrl = controller.url;

			// Auto-register server in VS Code MCP settings so it shows up in MCP UI
			await registerMcpInSettings(controller.url);
		} catch (err) {
			console.error('[MCP] Failed to start', err);
		}
	})();

}

// This method is called when your extension is deactivated
export function deactivate() { }

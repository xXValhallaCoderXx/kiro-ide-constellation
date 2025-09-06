import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';
import { showHealthDashboard } from './ui-providers/health-dashboard/health-dashboard.panel';
import { messageBus } from './services/messageBus';
import { Events } from './shared/events';
// NOTE: We lazy-import the MCP server module inside activate to ensure any MCP runtime issues do not block UI activation

let currentMcpUrl: string | undefined;

async function registerMcpInSettings(url: string) {
	const label = 'Kiro Constellation';
	const entry = { transport: 'sse', url } as const;
	const apply = async (section: string) => {
		const cfg = vscode.workspace.getConfiguration(section);
		const isRegistered = typeof (cfg as any).inspect === 'function'
			? !!cfg.inspect('servers')
			: (typeof (cfg as any).has === 'function' ? (cfg as any).has('servers') : false);
		if (!isRegistered) {
			return false;
		}
		const current = (cfg.get<Record<string, unknown>>('servers') ?? {});
		if (JSON.stringify(current[label]) !== JSON.stringify(entry)) {
			try {
				await cfg.update('servers', { ...current, [label]: entry }, vscode.ConfigurationTarget.Global);
			} catch (e) {
				console.warn(`[MCP] Failed to update ${section}.servers:`, e);
				return false;
			}
		}
		return true;
	};
	const wroteMcp = await apply('mcp');
	const wroteAlt = await apply('modelcontextprotocol');
	if (!wroteMcp && !wroteAlt) {
		console.warn('[MCP] Neither mcp.servers nor modelcontextprotocol.servers is registered. Skipping auto-registration.');
	}
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

			// Compute external URL for UI/remote clients to reach the server
			let externalUrl: string = controller.url;
			try {
				const ext = await vscode.env.asExternalUri(vscode.Uri.parse(controller.url));
				externalUrl = ext.toString(true);
			} catch (e) {
				console.warn('[MCP] asExternalUri failed, falling back to local URL:', e);
			}
			currentMcpUrl = externalUrl;
			if (externalUrl !== controller.url) {
				console.log(`[MCP] External URL: ${externalUrl}`);
			}

			// Auto-register server in VS Code MCP settings so it shows up in MCP UI
			await registerMcpInSettings(externalUrl);
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
		}),
		vscode.commands.registerCommand('kiro-ide-constellation.mcp.reregister', async () => {
			if (!currentMcpUrl) {
				await vscode.window.showWarningMessage('MCP server URL is not available yet.');
				return;
			}
			await registerMcpInSettings(currentMcpUrl);
			await vscode.window.showInformationMessage('MCP server re-registered in settings.');
		})
	);

}

// This method is called when your extension is deactivated
export function deactivate() { }

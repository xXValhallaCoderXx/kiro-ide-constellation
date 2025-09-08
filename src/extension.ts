import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';
import { showHealthDashboard } from './ui-providers/health-dashboard/health-dashboard.panel';
import { messageBus } from './services/message-bus.service';
import { Events } from './shared/events';
import { registerMcpProvider } from './mcp/mcp.provider';
import { startHttpMcpServer } from './mcp/mcp-http.server';
import { startHttpEventListener, stopHttpEventListener } from './services/http-event-listener.service';

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

	// Register the MCP server provider (guarded for proposed API availability)
	registerMcpProvider(context);

	// Removed on-demand ping command; SSE will react to LM-initiated tool completions

	// Note: no auto-ping on activation to avoid opening dashboard at startup.

	// Start HTTP MCP server explicitly (no-op if already running)
	try { startHttpMcpServer(); } catch (e) { console.error('[MCP HTTP] Failed to start:', e); }

	// File-based watcher removed; SSE listener handles LM-initiated events

	// Start HTTP event listener (SSE) for full HTTP migration path
	startHttpEventListener(context);
	context.subscriptions.push(new vscode.Disposable(() => stopHttpEventListener()));
}

// This method is called when your extension is deactivated
export function deactivate() { }

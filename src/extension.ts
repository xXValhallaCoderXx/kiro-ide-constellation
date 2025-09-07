import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';
import { showHealthDashboard } from './ui-providers/health-dashboard/health-dashboard.panel';
import { messageBus } from './services/messageBus';
import { Events } from './shared/events';

// Log immediately when the module is loaded
console.log('[KIRO-CONSTELLATION] Extension module loaded - this should appear even before activation');

export function activate(context: vscode.ExtensionContext) {
	console.log('[KIRO-CONSTELLATION] Extension activation started');
	console.log('[KIRO-CONSTELLATION] Extension URI:', context.extensionUri.toString());
	console.log('[KIRO-CONSTELLATION] Extension path:', context.extensionPath);
	
	try {
		console.log('[KIRO-CONSTELLATION] Registering sidebar views...');
		registerSidebarViews(context);
		console.log('[KIRO-CONSTELLATION] Sidebar views registered successfully');
		
		console.log('[KIRO-CONSTELLATION] Registering health dashboard...');
		registerHealthDashboard(context);
		console.log('[KIRO-CONSTELLATION] Health dashboard registered successfully');
		
		// Register a simple test command
		console.log('[KIRO-CONSTELLATION] Registering test command...');
		const testCommand = vscode.commands.registerCommand('kiro-ide-constellation.test', () => {
			console.log('[KIRO-CONSTELLATION] Test command executed!');
			vscode.window.showInformationMessage('Kiro Constellation extension is working!');
		});
		context.subscriptions.push(testCommand);
		console.log('[KIRO-CONSTELLATION] Test command registered successfully');
	} catch (error) {
		console.error('[KIRO-CONSTELLATION] Error during registration:', error);
		vscode.window.showErrorMessage(`Kiro Constellation activation failed: ${error}`);
		throw error;
	}

	try {
		console.log('[KIRO-CONSTELLATION] Setting up message bus handlers...');
		
		// Global handler: show a VS Code toast when UI requests it
		context.subscriptions.push(
			messageBus.on(Events.UiEmitToast, async (e) => {
				console.log('[KIRO-CONSTELLATION] Toast event received:', e);
				const text = e.payload?.text ?? 'Hello from UI';
				await vscode.window.showInformationMessage(text);
			})
		);

		// Global handler: when any webview requests opening the dashboard, execute the command
		context.subscriptions.push(
			messageBus.on(Events.OpenDashboard, async (_e) => {
				console.log('[KIRO-CONSTELLATION] Dashboard open event received');
				// Open dashboard due to UI event (not palette), then broadcast with via: 'other'
				showHealthDashboard(context);
				await messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'other' } });
			})
		);
		
		console.log('[KIRO-CONSTELLATION] Message bus handlers set up successfully');
		console.log('[KIRO-CONSTELLATION] Extension activation completed successfully');
	} catch (error) {
		console.error('[KIRO-CONSTELLATION] Error setting up message handlers:', error);
		vscode.window.showErrorMessage(`Kiro Constellation message bus setup failed: ${error}`);
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('[KIRO-CONSTELLATION] Extension deactivated');
}

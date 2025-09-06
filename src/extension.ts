import * as vscode from 'vscode';
import { registerSidebarViews } from './ui/sidebar';
import { registerHealthDashboard } from './ui/health-dashboard';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kiro-ide-constellation" is now active!');

	// Register the side panel view provider(s)
	registerSidebarViews(context);

	// Register the dashboard command/view
	registerHealthDashboard(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }

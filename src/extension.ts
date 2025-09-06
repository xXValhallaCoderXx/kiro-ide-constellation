import * as vscode from 'vscode';
import { registerSidebarViews } from './ui-providers/sidebar';
import { registerHealthDashboard } from './ui-providers/health-dashboard';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kiro-ide-constellation" is now active!');

	// Register the side panel view provider
	registerSidebarViews(context);
	// Register the health dashboard command/view
	registerHealthDashboard(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }

import * as vscode from 'vscode';
import { registerSidebarViews } from './ui/sidebar';
import { registerHealthDashboardPanel } from './ui/health-dashboard.panel';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kiro-ide-constellation" is now active!');
	const disposable = vscode.commands.registerCommand('kiro-ide-constellation.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from kiro-ide-constellation!');
	});

	context.subscriptions.push(disposable);

	// Register the side panel view provider(s)
        registerSidebarViews(context);
        registerHealthDashboardPanel(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }

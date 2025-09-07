import * as vscode from 'vscode';

console.log('[KIRO-CONSTELLATION-MINIMAL] Module loaded');

export function activate(context: vscode.ExtensionContext) {
	console.log('[KIRO-CONSTELLATION-MINIMAL] Activation started');
	
	// Just register a simple command
	const disposable = vscode.commands.registerCommand('kiro-ide-constellation.test', () => {
		console.log('[KIRO-CONSTELLATION-MINIMAL] Test command executed');
		vscode.window.showInformationMessage('Minimal extension works!');
	});
	
	context.subscriptions.push(disposable);
	console.log('[KIRO-CONSTELLATION-MINIMAL] Activation completed');
}

export function deactivate() {
	console.log('[KIRO-CONSTELLATION-MINIMAL] Deactivated');
}
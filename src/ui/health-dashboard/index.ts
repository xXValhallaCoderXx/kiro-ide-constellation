import * as vscode from 'vscode';
import { HealthDashboardPanel } from './healthDashboardPanel';

export function registerHealthDashboard(context: vscode.ExtensionContext) {
    // Register a command to show the health dashboard
    const disposable = vscode.commands.registerCommand(
        'kiro-ide-constellation.showHealthDashboard',
        () => {
            HealthDashboardPanel.createOrShow(context.extensionUri);
        }
    );

    context.subscriptions.push(disposable);
}
import * as vscode from 'vscode';
import { showHealthDashboard } from './healthDashboard';

export const OPEN_DASHBOARD_COMMAND = 'kiro-ide-constellation.openDashboard';

export function registerHealthDashboard(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(OPEN_DASHBOARD_COMMAND, () => {
        showHealthDashboard(context);
    });
    context.subscriptions.push(disposable);
}

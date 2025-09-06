import * as vscode from 'vscode';
import { showHealthDashboard } from './health-dashboard.panel';
import { OPEN_DASHBOARD_COMMAND } from '../../shared/commands';


export function registerHealthDashboard(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(OPEN_DASHBOARD_COMMAND, () => {
        showHealthDashboard(context);
    });
    context.subscriptions.push(disposable);
}

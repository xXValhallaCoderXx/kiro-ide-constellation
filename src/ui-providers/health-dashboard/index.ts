import * as vscode from 'vscode';
import { showHealthDashboard } from './health-dashboard.panel';
import { OPEN_DASHBOARD_COMMAND } from '../../shared/commands';
import { messageBus } from '../../services/message-bus.service';
import { Events } from '../../shared/events';


export function registerHealthDashboard(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(OPEN_DASHBOARD_COMMAND, () => {
        showHealthDashboard(context);
        // Broadcast that the dashboard was opened via the command palette
        void messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'commandPalette' } });
    });
    context.subscriptions.push(disposable);
}

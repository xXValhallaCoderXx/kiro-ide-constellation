import * as vscode from 'vscode';
import { showHealthDashboard } from './health-dashboard.panel';
import { OPEN_DASHBOARD_COMMAND } from '../../shared/commands';
import { messageBus } from '../../services/messageBus';
import { Events } from '../../shared/events';


export function registerHealthDashboard(context: vscode.ExtensionContext) {
    console.log('[KIRO-CONSTELLATION] Registering health dashboard command:', OPEN_DASHBOARD_COMMAND);
    
    try {
        const disposable = vscode.commands.registerCommand(OPEN_DASHBOARD_COMMAND, () => {
            console.log('[KIRO-CONSTELLATION] Dashboard command executed');
            showHealthDashboard(context);
            // Broadcast that the dashboard was opened via the command palette
            void messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'commandPalette' } });
        });
        
        context.subscriptions.push(disposable);
        console.log('[KIRO-CONSTELLATION] Health dashboard command registered successfully');
    } catch (error) {
        console.error('[KIRO-CONSTELLATION] Error registering health dashboard:', error);
        throw error;
    }
}

import * as vscode from 'vscode';
import { SidebarViewProvider } from './sidebar.provider';

export function registerSidebarViews(context: vscode.ExtensionContext) {
    console.log('[KIRO-CONSTELLATION] Creating sidebar provider...');
    console.log('[KIRO-CONSTELLATION] Sidebar view type:', SidebarViewProvider.viewType);
    
    try {
        const sidebarProvider = new SidebarViewProvider(context);
        console.log('[KIRO-CONSTELLATION] Sidebar provider created successfully');
        
        const registration = vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebarProvider);
        console.log('[KIRO-CONSTELLATION] Webview view provider registered');
        
        context.subscriptions.push(registration);
        console.log('[KIRO-CONSTELLATION] Sidebar registration added to subscriptions');
    } catch (error) {
        console.error('[KIRO-CONSTELLATION] Error registering sidebar views:', error);
        throw error;
    }
}

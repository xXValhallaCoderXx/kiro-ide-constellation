import * as vscode from 'vscode';
import { SidebarViewProvider } from './sidebar.provider';

export function registerSidebarViews(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebarProvider)
    );
}

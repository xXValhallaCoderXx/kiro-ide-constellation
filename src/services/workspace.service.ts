import * as vscode from "vscode";

export function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0].uri.fsPath;
}

export function getWorkspaceRootOrThrow(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error('No workspace folder open. Open a project to view dependencies.');
  }
  return root;
}


import * as vscode from 'vscode';
import * as fs from 'fs';

type Manifest = Record<string, { file: string; css?: string[]; assets?: string[] }>;

let cached: Manifest | null = null;

export function loadManifest(context: vscode.ExtensionContext): Manifest | null {
  if (cached) {
    return cached;
  }
  try {
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'out', '.vite', 'manifest.json');
    const json = fs.readFileSync(manifestUri.fsPath, 'utf-8');
    cached = JSON.parse(json) as Manifest;
    return cached;
  } catch {
    return null;
  }
}

export function getEntryUris(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  entry: 'sidebar' | 'dashboard'
) {
  const manifest = loadManifest(context);
  if (!manifest) {
    // Fallback to deterministic names when manifest not available
    const base = vscode.Uri.joinPath(context.extensionUri, 'out');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`));
    const css = [webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.css`))];
    return { script, css };
  }
  // Look up by source path key as Vite uses input path keys
  const key = `web/src/main-${entry}.tsx`;
  const info = manifest[key] ?? Object.values(manifest).find((m) => m.file.endsWith(`${entry}.js`));
  if (!info) {
    const base = vscode.Uri.joinPath(context.extensionUri, 'out');
    return {
      script: webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`)),
      css: [webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.css`))],
    };
  }
  const script = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', info.file));
  const css = (info.css ?? []).map((c) => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', c)));
  return { script, css };
}

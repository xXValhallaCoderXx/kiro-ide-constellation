import * as vscode from 'vscode';
import * as fs from 'fs';

type Manifest = Record<string, { file: string; css?: string[]; assets?: string[] }>;

let cached: Manifest | null = null;

export function loadManifest(context: vscode.ExtensionContext): Manifest | null {
  console.log('[KIRO-CONSTELLATION] Loading manifest...');
  
  if (cached) {
    console.log('[KIRO-CONSTELLATION] Using cached manifest');
    return cached;
  }
  
  try {
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'out', '.vite', 'manifest.json');
    console.log('[KIRO-CONSTELLATION] Manifest path:', manifestUri.fsPath);
    
    const json = fs.readFileSync(manifestUri.fsPath, 'utf-8');
    console.log('[KIRO-CONSTELLATION] Manifest file read successfully, length:', json.length);
    
    cached = JSON.parse(json) as Manifest;
    console.log('[KIRO-CONSTELLATION] Manifest parsed successfully, keys:', Object.keys(cached));
    return cached;
  } catch (error) {
    console.error('[KIRO-CONSTELLATION] Failed to load manifest:', error);
    return null;
  }
}

export function getEntryUris(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  entry: 'sidebar' | 'dashboard'
) {
  console.log('[KIRO-CONSTELLATION] Getting entry URIs for:', entry);
  
  const manifest = loadManifest(context);
  if (!manifest) {
    console.log('[KIRO-CONSTELLATION] No manifest found, using fallback paths');
    // Fallback to deterministic names when manifest not available
    const base = vscode.Uri.joinPath(context.extensionUri, 'out');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`));
    const css = [webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.css`))];
    console.log('[KIRO-CONSTELLATION] Fallback script:', script.toString());
    console.log('[KIRO-CONSTELLATION] Fallback CSS:', css.map(c => c.toString()));
    return { script, css };
  }
  
  // Look up by source path key as Vite uses input path keys
  const key = `web/src/main-${entry}.tsx`;
  console.log('[KIRO-CONSTELLATION] Looking for manifest key:', key);
  
  const info = manifest[key] ?? Object.values(manifest).find((m) => m.file.endsWith(`${entry}.js`));
  console.log('[KIRO-CONSTELLATION] Found manifest info:', info);
  
  if (!info) {
    console.log('[KIRO-CONSTELLATION] No manifest info found, using fallback');
    const base = vscode.Uri.joinPath(context.extensionUri, 'out');
    return {
      script: webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`)),
      css: [webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.css`))],
    };
  }
  
  const script = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', info.file));
  const css = (info.css ?? []).map((c) => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', c)));
  
  console.log('[KIRO-CONSTELLATION] Manifest-based script:', script.toString());
  console.log('[KIRO-CONSTELLATION] Manifest-based CSS:', css.map(c => c.toString()));
  
  return { script, css };
}

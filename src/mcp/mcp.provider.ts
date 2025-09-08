import * as vscode from 'vscode';
import * as path from 'path';

// Removed stdio and JSON fallbacks; HTTP-only provider

export class KiroConstellationMCPProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  // VS Code will call this to retrieve available MCP servers
  provideMcpServerDefinitions(_token: vscode.CancellationToken) {
    const lm: any = (vscode as any).lm;
    if (!lm) {
      console.warn('Language model API (vscode.lm) not available. No MCP servers provided.');
      return [];
    }

    // Prefer HTTP server definition if supported
    const McpHttpCtor: any = (vscode as any).McpHttpServerDefinition ?? lm.McpHttpServerDefinition;
    const defs: any[] = [];
    if (typeof McpHttpCtor === 'function') {
      const port = process.env.KIRO_MCP_HTTP_PORT ? parseInt(process.env.KIRO_MCP_HTTP_PORT, 10) : 34011;
      const uri = vscode.Uri.parse(`http://127.0.0.1:${port}/mcp`);
      const httpDef = new McpHttpCtor('Kiro Constellation HTTP', uri, {}, '0.0.1');
      defs.push(httpDef);
    }

    // No stdio fallback in HTTP-only mode
  return defs;
  }
}

export function registerMcpProvider(context: vscode.ExtensionContext) {
  const lm: any = (vscode as any).lm;
  if (!lm?.registerMcpServerDefinitionProvider) {
    console.warn('Language model API (vscode.lm) not available. MCP provider not registered.');
    return;
  }

  try {
    const provider = new KiroConstellationMCPProvider(context);
    // The id must match contributes.mcpServerDefinitionProviders[0].id in package.json
    const disposable = lm.registerMcpServerDefinitionProvider('kiro-constellation', provider);
    context.subscriptions.push(disposable);
    console.log('Kiro Constellation MCP Provider registered successfully.');
  } catch (e) {
    console.error('Failed to register MCP provider.', e);
  }
}

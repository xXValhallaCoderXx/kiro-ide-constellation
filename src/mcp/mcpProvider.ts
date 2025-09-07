import * as vscode from 'vscode';
import * as path from 'path';

export class KiroConstellationMCPProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  // VS Code will call this to retrieve available MCP servers
  provideMcpServerDefinitions(_token: vscode.CancellationToken) {
    const lm: any = (vscode as any).lm;
    if (!lm) {
      console.warn('Language model API (vscode.lm) not available. No MCP servers provided.');
      return [];
    }

    // The constructor may live on vscode (top-level) or under vscode.lm depending on build
    const McpStdioCtor: any = (vscode as any).McpStdioServerDefinition ?? lm.McpStdioServerDefinition;
    if (typeof McpStdioCtor !== 'function') {
      console.warn('McpStdioServerDefinition constructor not available on this VS Code build. No MCP servers provided.');
      return [];
    }

    const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'mcpStdioServer.js');
    const label = 'Kiro Constellation POC';
    const command = process.execPath; // use the running Node binary
    const args = [serverScript];

    const stdioDef = new McpStdioCtor(label, command, args);
    // Optionally you can pass env/version in ctor if supported by current VS Code build

    return [stdioDef];
  }
}

export function registerMcpProvider(context: vscode.ExtensionContext) {
  const lm: any = (vscode as any).lm;
  if (!lm?.registerMcpServerDefinitionProvider) {
    console.warn('Language model API (vscode.lm) not available. MCP provider not registered.');
    return;
  }

  const provider = new KiroConstellationMCPProvider(context);
  // The id must match contributes.mcpServerDefinitionProviders[0].id in package.json
  const disposable = lm.registerMcpServerDefinitionProvider('kiro-constellation', provider);
  context.subscriptions.push(disposable);
  console.log('Kiro Constellation MCP Provider registered successfully.');
}

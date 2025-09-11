import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
type KiroMcpConfig = {
  mcpServers: Record<string, {
    command: string;
    args: string[];
    disabled: boolean;
  }>;
};

function resolveServerScript(context: vscode.ExtensionContext): string {
  const outMcpDir = path.join(context.extensionPath, 'out', 'mcp');
  console.log('[Kiro MCP] Extension path:', context.extensionPath);
  console.log('[Kiro MCP] MCP directory path:', outMcpDir);
  
  // Check if the MCP directory exists
  if (!fs.existsSync(outMcpDir)) {
    console.warn('[Kiro MCP] MCP directory does not exist:', outMcpDir);
  } else {
    console.log('[Kiro MCP] MCP directory exists, listing contents...');
    try {
      const files = fs.readdirSync(outMcpDir);
      console.log('[Kiro MCP] MCP directory contents:', files);
    } catch (e) {
      console.error('[Kiro MCP] Failed to read MCP directory:', e);
    }
  }
  
  const candidates = [
    path.join(outMcpDir, 'mcpStdioServer.cjs'),
    path.join(outMcpDir, 'mcpStdioServer.js'),
    path.join(outMcpDir, 'mcpStdioServer.mjs'),
  ];
  
  console.log('[Kiro MCP] Checking candidates:', candidates);
  const existing = candidates.find((p) => {
    const exists = fs.existsSync(p);
    console.log('[Kiro MCP] Candidate', p, 'exists:', exists);
    return exists;
  });
  
  const chosen = existing ?? candidates[0];
  console.log('[Kiro MCP] Server script resolved to:', chosen);
  if (!existing) {
    console.warn('[Kiro MCP] Preferred MCP bundle not found yet. Expected one of:', candidates);
    console.warn('[Kiro MCP] This may indicate a packaging issue or file permission problem.');
    console.warn('[Kiro MCP] Extension will still attempt to use the first candidate path.');
  }
  
  // Additional check: try to access the chosen file to verify it's readable
  try {
    const stats = fs.statSync(chosen);
    console.log('[Kiro MCP] Chosen file stats - size:', stats.size, 'bytes, readable:', stats.isFile());
  } catch (e) {
    console.error('[Kiro MCP] Cannot access chosen file:', chosen, 'Error:', e);
  }
  
  return chosen;
}

function resolveNodeCommand(): string {
  const fromEnv = process.env.KIRO_MCP_NODE;
  if (fromEnv && fs.existsSync(fromEnv)) {
    console.log('[Kiro MCP] Using node from KIRO_MCP_NODE:', fromEnv);
    return fromEnv;
  }

  // In VS Code server environments, process.execPath points to VS Code's node binary
  // We need to find the system Node.js instead
  const execBase = path.basename(process.execPath).toLowerCase();
  if (execBase.includes('node') && !process.execPath.includes('vscode-server')) {
    console.log('[Kiro MCP] Using process.execPath:', process.execPath);
    return process.execPath;
  }

  // Try common Node.js installation paths, including nvm paths
  const common = [
    // Check nvm paths first (most common in development)
    path.join(process.env.HOME || '', '.nvm/versions/node/v22.17.0/bin/node'),
    path.join(process.env.HOME || '', '.nvm/versions/node/*/bin/node'),
    // Standard system paths
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/node',
  ];
  
  for (const p of common) {
    if (p.includes('*')) {
      // Handle glob pattern for nvm versions
      const nvmDir = path.dirname(path.dirname(p));
      if (fs.existsSync(nvmDir)) {
        try {
          const versions = fs.readdirSync(nvmDir).filter(v => v.startsWith('v'));
          if (versions.length > 0) {
            const latestVersion = versions.sort().pop();
            const nodePath = path.join(nvmDir, latestVersion!, 'bin/node');
            if (fs.existsSync(nodePath)) {
              console.log('[Kiro MCP] Using nvm node:', nodePath);
              return nodePath;
            }
          }
        } catch (e) {
          // Continue to next option
        }
      }
    } else if (fs.existsSync(p)) {
      console.log('[Kiro MCP] Using system node:', p);
      return p;
    }
  }
  
  // Fallback to 'node' command and hope it's in PATH
  console.log('[Kiro MCP] Falling back to "node" command in PATH');
  return 'node';
}

function getWorkspaceRoot(): string | undefined {
  const wf = vscode.workspace.workspaceFolders;
  if (!wf || wf.length === 0) {
    return undefined;
  }
  return wf[0].uri.fsPath;
}

function getKiroConfigPath(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) {
    return undefined;
  }
  const relDir = process.env.KIRO_MCP_CONFIG_DIR && process.env.KIRO_MCP_CONFIG_DIR.trim() !== ''
    ? process.env.KIRO_MCP_CONFIG_DIR
    : '.kiro/settings';
  const dir = path.join(root, relDir);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.error('[Kiro MCP] Failed to create config directory:', dir, e);
    return undefined;
  }
  return path.join(dir, 'mcp.json');
}

function readExistingConfig(configPath: string): KiroMcpConfig | undefined {
  try {
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as KiroMcpConfig;
  } catch (e) {
    console.warn('[Kiro MCP] Failed to read existing MCP config, will overwrite:', e);
    return undefined;
  }
}

function shouldRewrite(existing: KiroMcpConfig | undefined, command: string, script: string): boolean {
  if (!existing) {
    return true;
  }
  const entry = existing.mcpServers?.['kiro-constellation'];
  if (!entry) {
    return true;
  }
  if (entry.disabled !== false) {
    return true;
  }
  if (entry.command !== command) {
    return true;
  }
  if (!Array.isArray(entry.args) || entry.args[0] !== script) {
    return true;
  }
  return false;
}

function writeKiroMcpJson(context: vscode.ExtensionContext): boolean {
  const configPath = getKiroConfigPath();
  if (!configPath) {
    console.warn('[Kiro MCP] No workspace folder; cannot write kiro mcp.json');
    return false;
  }
  const command = resolveNodeCommand();
  const script = resolveServerScript(context);
  const existing = readExistingConfig(configPath);
  if (!shouldRewrite(existing, command, script)) {
    console.log('[Kiro MCP] Existing mcp.json is up-to-date; no changes written.');
    return true;
  }

  const data: KiroMcpConfig = {
    mcpServers: {
      'kiro-constellation': {
        command,
        args: [script],
        disabled: false,
      },
    },
  };

  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(configPath, json, 'utf-8');
    console.log('[Kiro MCP] Wrote fallback MCP config to', configPath);
    return true;
  } catch (e) {
    console.error('[Kiro MCP] Failed to write MCP config:', e);
    return false;
  }
}

export class KiroConstellationMCPProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  // VS Code will call this to retrieve available MCP servers
  provideMcpServerDefinitions(_token: vscode.CancellationToken) {
    const lm: any = (vscode as any).lm;
    if (!lm) {
      console.warn('Language model API (vscode.lm) not available. No MCP servers provided.');
      // Fallback: write Kiro MCP JSON so Kiro IDE can discover the server
      writeKiroMcpJson(this.context);
      return [];
    }

    // The constructor may live on vscode (top-level) or under vscode.lm depending on build
    const McpStdioCtor: any = (vscode as any).McpStdioServerDefinition ?? lm.McpStdioServerDefinition;
    if (typeof McpStdioCtor !== 'function') {
      console.warn('McpStdioServerDefinition constructor not available on this VS Code build. No MCP servers provided.');
      // Fallback: write JSON for Kiro discovery
      writeKiroMcpJson(this.context);
      return [];
    }

  // Resolve the bundled server script (.cjs in package, with dev fallbacks)
  const serverScript = resolveServerScript(this.context);
    const label = 'Kiro Constellation POC';
    const command = resolveNodeCommand();
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
    // Fallback: write Kiro JSON so Kiro IDE can start the server via workspace file
    writeKiroMcpJson(context);
    return;
  }

  try {
    const provider = new KiroConstellationMCPProvider(context);
    // The id must match contributes.mcpServerDefinitionProviders[0].id in package.json
    const disposable = lm.registerMcpServerDefinitionProvider('kiro-constellation', provider);
    context.subscriptions.push(disposable);
    console.log('Kiro Constellation MCP Provider registered successfully.');
  } catch (e) {
    console.error('Failed to register MCP provider. Falling back to Kiro JSON:', e);
    writeKiroMcpJson(context);
  }
}

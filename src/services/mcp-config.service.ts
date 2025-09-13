import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export async function upsertUserMcpConfig(nodeBin: string, serverJs: string, serverId: string): Promise<string> {
  const userDir = path.join(os.homedir(), ".kiro", "settings");
  const userCfgPath = path.join(userDir, "mcp.json");
  await fs.mkdir(userDir, { recursive: true });

  let cfg: any = { mcpServers: {} };
  try {
    const raw = await fs.readFile(userCfgPath, "utf8");
    cfg = JSON.parse(raw);
    if (!cfg.mcpServers || typeof cfg.mcpServers !== "object") cfg.mcpServers = {};
  } catch {
    cfg = { mcpServers: {} };
  }

  cfg.mcpServers[serverId] = {
    command: nodeBin,
    args: [serverJs],
    env: { CONSTELLATION_SERVER_ID: serverId },
    disabled: false,
    autoApprove: ["ping", "echo"],
  };

  await fs.writeFile(userCfgPath, JSON.stringify(cfg, null, 2), "utf8");
  return userCfgPath;
}

export async function maybeWriteWorkspaceConfig(nodeBin: string, serverJs: string, serverId: string): Promise<void> {
  const writeWorkspace = vscode.workspace
    .getConfiguration("constellation")
    .get<boolean>("writeWorkspaceMcpConfig", false);
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!writeWorkspace || !ws) return;

  const wsRoot = ws.uri.fsPath;
  const kiroRoot = path.join(wsRoot, ".kiro");
  const exists = await pathExists(kiroRoot);
  if (!exists) return; // only write if ./.kiro exists

  const wsDir = path.join(kiroRoot, "settings");
  const wsCfgPath = path.join(wsDir, "mcp.json");
  try {
    await fs.mkdir(wsDir, { recursive: true });

    let cfg: any = { mcpServers: {} };
    try {
      const raw = await fs.readFile(wsCfgPath, "utf8");
      cfg = JSON.parse(raw);
      if (!cfg.mcpServers || typeof cfg.mcpServers !== "object") cfg.mcpServers = {};
    } catch {
      cfg = { mcpServers: {} };
    }

    cfg.mcpServers[serverId] = {
      command: nodeBin,
      args: [serverJs],
      env: { CONSTELLATION_SERVER_ID: serverId },
      disabled: false,
      autoApprove: ["ping", "echo"],
    };

    await fs.writeFile(wsCfgPath, JSON.stringify(cfg, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

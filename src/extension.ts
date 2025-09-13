import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

const SERVER_ID = "constellation-mcp";

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Node 18+ requirement
    const major = Number(process.versions.node.split(".")[0]);
    if (!Number.isFinite(major) || major < 18) {
      vscode.window.showErrorMessage(
        `Kiro Constellation: Node 18+ required (found ${process.versions.node}).`
      );
      return;
    }

    const serverJs = vscode.Uri.joinPath(context.extensionUri, "out", "mcpServer.js").fsPath;

    // Write/merge Kiro MCP user config
    const nodeBin = resolveNodeBin();
    const userCfgPath = await upsertUserMcpConfig(nodeBin, serverJs);

    // Optionally write workspace config
    await maybeWriteWorkspaceConfig(nodeBin, serverJs);

    // Self-test: can we boot the server quickly?
    const ok = await selfTest(nodeBin, serverJs);
    if (!ok) {
      vscode.window.showErrorMessage(
        "Kiro Constellation setup failed: Could not start local MCP server. Ensure Node 18+ is installed or set Constellation: Node Path.")
      return;
    }

    // Success toast
    const choice = await vscode.window.showInformationMessage(
      "Kiro Constellation is set up. Reload Kiro to start the MCP server.",
      "Reload Window",
      "Open MCP Config"
    );

    if (choice === "Reload Window") {
      void vscode.commands.executeCommand("workbench.action.reloadWindow");
    } else if (choice === "Open MCP Config") {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(userCfgPath));
      void vscode.window.showTextDocument(doc);
    }

    // Commands
    context.subscriptions.push(
      vscode.commands.registerCommand("constellation.selfTest", async () => {
        const ok2 = await selfTest(nodeBin, serverJs);
        void vscode.window.showInformationMessage(`Self-test: ${ok2 ? "OK" : "FAILED"}`);
      }),
      vscode.commands.registerCommand("constellation.openUserMcpConfig", async () => {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(userCfgPath));
        void vscode.window.showTextDocument(doc);
      })
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(`Kiro Constellation error: ${err?.message ?? String(err)}`);
  }
}

export function deactivate() { /* noop */ }

function resolveNodeBin(): string {
  const cfgPath = vscode.workspace.getConfiguration("constellation").get<string>("nodePath") || "";
  return cfgPath.trim() || "node";
}

async function upsertUserMcpConfig(nodeBin: string, serverJs: string): Promise<string> {
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

  cfg.mcpServers[SERVER_ID] = {
    command: nodeBin,
    args: [serverJs],
    env: {},
    disabled: false,
    autoApprove: ["ping", "echo"],
  };

  await fs.writeFile(userCfgPath, JSON.stringify(cfg, null, 2), "utf8");
  return userCfgPath;
}

async function maybeWriteWorkspaceConfig(nodeBin: string, serverJs: string): Promise<void> {
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

    cfg.mcpServers[SERVER_ID] = {
      command: nodeBin,
      args: [serverJs],
      env: {},
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

async function selfTest(nodeBin: string, serverJs: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn(nodeBin, [serverJs, "--selftest"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let done = false;

    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        resolve(ok);
      }
    };

    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("error", () => finish(false));
    child.on("close", (code) => finish(code === 0 && out.includes("SELFTEST_OK")));

    setTimeout(() => {
      try { child.kill(); } catch {}
      finish(false);
    }, 4000);
  });
}

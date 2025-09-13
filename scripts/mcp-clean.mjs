#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

async function readJson(p) {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(p, obj) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(obj, null, 2), 'utf8');
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    workspace: args.includes('--workspace'),
    serverId: process.env.CONSTELLATION_SERVER_ID || process.env.SERVER_ID || 'constellation-mcp',
    mode: args.includes('--delete') ? 'delete' : 'backup',
  };
}

async function main() {
  const { workspace, serverId, mode } = parseArgs();
  const userCfgPath = path.join(os.homedir(), '.kiro', 'settings', 'mcp.json');

  // Clean user-level config entry for serverId
  const userCfg = (await readJson(userCfgPath)) || { mcpServers: {} };
  if (userCfg.mcpServers && userCfg.mcpServers[serverId]) {
    delete userCfg.mcpServers[serverId];
    if (mode === 'delete') {
      await writeJson(userCfgPath, userCfg);
      console.log(`[clean:mcp] Removed '${serverId}' from ${userCfgPath}`);
    } else {
      // backup mode: write edited file back anyway (no-op if not present)
      await writeJson(userCfgPath, userCfg);
      console.log(`[clean:mcp] Backed up (re-wrote) ${userCfgPath} without '${serverId}'.`);
    }
  } else {
    console.log(`[clean:mcp] No '${serverId}' entry found in ${userCfgPath}`);
  }

  if (workspace) {
    // Optionally clean workspace-level config for the first folder
    const wsRoot = process.cwd();
    const wsCfgPath = path.join(wsRoot, '.kiro', 'settings', 'mcp.json');
    const wsCfg = (await readJson(wsCfgPath)) || { mcpServers: {} };
    if (wsCfg.mcpServers && wsCfg.mcpServers[serverId]) {
      delete wsCfg.mcpServers[serverId];
      await writeJson(wsCfgPath, wsCfg);
      console.log(`[clean:mcp] Removed '${serverId}' from ${wsCfgPath}`);
    } else {
      console.log(`[clean:mcp] No '${serverId}' entry found in ${wsCfgPath}`);
    }
  }
}

main().catch((err) => {
  console.error('[clean:mcp] Error:', err?.message || err);
  process.exit(1);
});


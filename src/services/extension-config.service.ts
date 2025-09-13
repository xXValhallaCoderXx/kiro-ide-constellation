import * as vscode from "vscode";
import { DEFAULT_SERVER_ID, getServerIdFromEnv } from "../shared/constants.js";

export function getEffectiveServerId(): string {
  const envId = getServerIdFromEnv();
  if (envId) return envId;
  return vscode.workspace.getConfiguration("constellation").get<string>("serverId", DEFAULT_SERVER_ID);
}

export function resolveNodeBin(): string {
  const cfgPath = vscode.workspace.getConfiguration("constellation").get<string>("nodePath") || "";
  return cfgPath.trim() || "node";
}

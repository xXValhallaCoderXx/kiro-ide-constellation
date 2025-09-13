export const DEFAULT_SERVER_ID = "constellation-mcp";
export function getServerIdFromEnv(): string | undefined {
  const v = (process.env.CONSTELLATION_SERVER_ID || "").trim();
  return v || undefined;
}


import * as vscode from "vscode";
import * as http from "node:http";
import { randomBytes } from "node:crypto";

export interface BridgeInfo {
  port: number;
  token: string;
}

export async function startHttpBridge(context: vscode.ExtensionContext): Promise<BridgeInfo> {
  const token = randomBytes(32).toString("base64url");

  const server = http.createServer(async (req, res) => {
    try {
      // Only allow loopback requests
      const host = req.socket.remoteAddress || "";
      // IPv6 loopback can be ::1, IPv4 127.0.0.1
      const isLoopback = host === "127.0.0.1" || host === "::1" || host === "::ffff:127.0.0.1";
      if (!isLoopback) {
        res.statusCode = 403; res.end(); return;
      }

      // Very small router
      if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
      if (!req.url) { res.statusCode = 404; res.end(); return; }

      // Auth
      const auth = req.headers["authorization"] || "";
      const expected = `Bearer ${token}`;
      if (auth !== expected) { res.statusCode = 401; res.end(); return; }

      if (req.url.startsWith("/open-graph")) {
        // Reveal or open the graph view via the existing command
        await vscode.commands.executeCommand("constellation.openGraphView");
        res.statusCode = 204; // No Content
        res.end();
        return;
      }

      res.statusCode = 404; res.end();
    } catch {
      try { res.statusCode = 500; res.end(); } catch {}
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  const port = typeof address === "object" && address?.port ? address.port : 0;

  // Dispose on deactivate
  context.subscriptions.push({ dispose: () => server.close() });

  return { port, token };
}

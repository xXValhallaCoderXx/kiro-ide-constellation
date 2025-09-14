import * as vscode from "vscode";
import * as http from "node:http";
import { randomBytes } from "node:crypto";
import { computeImpact } from "./impact-analysis.service.js";

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

      // Auth - Requirements 6.5
      const auth = req.headers["authorization"] || "";
      const expected = `Bearer ${token}`;
      if (auth !== expected) { 
        console.warn('HTTP bridge authentication failed:', { received: auth ? 'Bearer [REDACTED]' : 'none', expected: 'Bearer [REDACTED]' });
        res.statusCode = 401; 
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          error: "Authentication failed", 
          affectedFiles: [] 
        })); 
        return; 
      }

      if (req.url.startsWith("/open-graph")) {
        // Reveal or open the graph view via the existing command
        await vscode.commands.executeCommand("constellation.openGraphView");
        res.statusCode = 204; // No Content
        res.end();
        return;
      }

      if (req.url.startsWith("/impact-analysis")) {
        // Parse request body to get filePath with size limits
        let body = "";
        let bodySize = 0;
        const maxBodySize = 1024 * 1024; // 1MB limit
        
        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > maxBodySize) {
            res.statusCode = 413; // Payload Too Large
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
              error: "Request body too large",
              affectedFiles: []
            }));
            return;
          }
          body += chunk.toString();
        });
        
        req.on("end", async () => {
          try {
            // Parse JSON request body with error handling
            let requestData;
            try {
              requestData = JSON.parse(body);
            } catch (parseError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ 
                error: "Invalid JSON in request body",
                affectedFiles: []
              }));
              return;
            }
            
            const filePath = requestData.filePath;
            
            if (!filePath || typeof filePath !== "string") {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ 
                error: "Missing or invalid filePath in request body. Expected: { filePath: string }",
                affectedFiles: []
              }));
              return;
            }
            
            // Additional validation for empty or whitespace-only paths
            if (filePath.trim().length === 0) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ 
                error: "filePath cannot be empty",
                affectedFiles: []
              }));
              return;
            }
            
            // Compute impact analysis
            const impactResult = await computeImpact(context, filePath);
            
            // Trigger impact display in webview
            await vscode.commands.executeCommand("constellation.showImpact", {
              sourceFile: impactResult.sourceFile,
              affectedFiles: impactResult.affectedFiles
            });
            
            // Return impact analysis results
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              affectedFiles: impactResult.affectedFiles
            }));
            
          } catch (error) {
            // Handle errors gracefully - Requirements 6.5, 6.6
            console.error('HTTP bridge impact analysis error:', error);
            
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            
            let errorMessage = "Unknown error occurred during impact analysis";
            if (error instanceof Error) {
              errorMessage = error.message;
              
              // Provide more specific error codes for different failure types
              if (error.message.includes('No workspace folder open')) {
                res.statusCode = 400; // Bad Request - no workspace
              } else if (error.message.includes('No dependency data available')) {
                res.statusCode = 412; // Precondition Failed - needs scan
              } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
                res.statusCode = 408; // Request Timeout
              } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
                res.statusCode = 403; // Forbidden - permission denied
              }
            }
            
            res.end(JSON.stringify({ 
              error: errorMessage,
              affectedFiles: [] // Return empty array as graceful fallback per requirements 6.5
            }));
          }
        });
        
        return;
      }

      res.statusCode = 404; res.end();
    } catch (error) {
      // Handle unexpected server errors gracefully - Requirements 6.5, 6.6
      console.error('HTTP bridge server error:', error);
      try { 
        res.statusCode = 500; 
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          error: "Internal server error", 
          affectedFiles: [] 
        })); 
      } catch (finalError) {
        console.error('Failed to send error response:', finalError);
      }
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

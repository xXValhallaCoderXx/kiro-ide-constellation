import * as vscode from "vscode";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs";
import { randomBytes } from "node:crypto";
import { computeImpact } from "./impact-analysis.service.js";
import { onboardingModeService, type OnboardingMode } from "./onboarding-mode.service.js";
import { OnboardingWalkthroughService, type OnboardingPlan } from "./onboarding-walkthrough.service.js";
import { SecurityService } from "./security.service.js";
import { runScan } from "./dependency-cruiser.service.js";
import { getWorkspaceRoot } from "./workspace.service.js";

export interface BridgeInfo {
  port: number;
  token: string;
}

export async function startHttpBridge(context: vscode.ExtensionContext, walkthroughService?: OnboardingWalkthroughService, webviewProvider?: any): Promise<BridgeInfo> {
  const token = randomBytes(32).toString("base64url");

  // Use provided walkthrough service or create a new one for backward compatibility
  const walkthrough = walkthroughService || new OnboardingWalkthroughService();

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

      // Auth - Requirements 6.5 with security logging
      const auth = req.headers["authorization"] || "";
      const expected = `Bearer ${token}`;
      if (auth !== expected) {
        // Log security violation with sanitized information
        console.warn('[SECURITY] HTTP bridge authentication failed:', {
          remoteAddress: host,
          userAgent: req.headers['user-agent'] || 'unknown',
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        });

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

      if (req.url.startsWith("/scan")) {
        // Handle dependency scanning requests
        try {
          // Get workspace root for graph file path
          const workspaceRoot = getWorkspaceRoot();
          if (!workspaceRoot) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: "No workspace folder open"
            }));
            return;
          }

          // Trigger dependency scan
          await runScan(context);

          // Poll for graph file existence with 500ms intervals and 30-second timeout
          const graphFilePath = path.join(workspaceRoot, '.constellation', 'data', 'codebase-dependencies.json');
          const startTime = Date.now();
          const timeoutMs = 30000; // 30 seconds
          const pollIntervalMs = 500; // 500ms

          const pollForFile = async (): Promise<boolean> => {
            while (Date.now() - startTime < timeoutMs) {
              try {
                if (fs.existsSync(graphFilePath)) {
                  return true;
                }
              } catch (error) {
                // Continue polling even if file check fails
                console.warn('Error checking graph file existence:', error);
              }

              // Wait for next poll interval
              await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }
            return false;
          };

          // Wait for file to be created or timeout
          const fileExists = await pollForFile();

          if (fileExists) {
            // Success - graph file was created
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              status: 'ok'
            }));
          } else {
            // Timeout - graph file was not created within time limit
            res.statusCode = 504; // Gateway Timeout
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: 'timeout'
            }));
          }

        } catch (error) {
          // Handle scan errors gracefully
          console.error('HTTP bridge scan error:', error);

          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");

          let errorMessage = "Unknown error occurred during dependency scan";
          if (error instanceof Error) {
            errorMessage = error.message;

            // Provide more specific error codes for different failure types
            if (error.message.includes('No workspace folder open')) {
              res.statusCode = 400; // Bad Request - no workspace
            } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
              res.statusCode = 504; // Gateway Timeout
            } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
              res.statusCode = 403; // Forbidden - permission denied
            }
          }

          res.end(JSON.stringify({
            error: errorMessage
          }));
        }

        return;
      }

      if (req.url.startsWith("/impact-analysis")) {
        // Parse request body to get filePath with enhanced security validation
        let body = "";
        let bodySize = 0;
        const maxBodySize = 1024 * 1024; // 1MB limit

        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > maxBodySize) {
            // Log security violation for oversized requests
            console.warn('[SECURITY] Request body size limit exceeded:', {
              size: bodySize,
              maxSize: maxBodySize,
              remoteAddress: host,
              timestamp: new Date().toISOString()
            });

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
            // Parse and validate JSON request body with security checks
            let requestData;
            try {
              requestData = SecurityService.validateJsonInput(body, maxBodySize);
            } catch (parseError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
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

            // Validate file path with security checks
            try {
              const workspaceRoot = SecurityService.validateWorkspace();
              SecurityService.validateAndNormalizePath(filePath, workspaceRoot, false);
            } catch (pathError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: `Invalid file path: ${pathError instanceof Error ? pathError.message : 'Path validation failed'}`,
                affectedFiles: []
              }));
              return;
            }

            // Compute impact analysis
            const impactResult = await computeImpact(context, filePath);

            // Normalize paths to workspace-relative node ids for UI filtering
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
            const toNodeId = (p: string): string | null => {
              try {
                if (!p) { return null; }
                // Normalize slashes
                const slashed = p.replace(/\\/g, '/');
                // If already relative, return as-is
                if (!path.isAbsolute(slashed)) { return slashed; }
                if (!wsRoot) { return null; }
                const rel = path.relative(wsRoot, slashed).replace(/\\/g, '/');
                if (rel.startsWith('..')) { return null; } // outside workspace
                return rel;
              } catch { return null; }
            };

            const normalizedSource = toNodeId(impactResult.sourceFile) ?? impactResult.sourceFile;
            const normalizedAffected = (impactResult.affectedFiles || [])
              .map(toNodeId)
              .filter((x): x is string => !!x);

            // Trigger impact display in webview
            await vscode.commands.executeCommand("constellation.showImpact", {
              sourceFile: normalizedSource,
              affectedFiles: normalizedAffected
            });

            // Return impact analysis results
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              affectedFiles: normalizedAffected
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

      if (req.url.startsWith("/persona")) {
        // Handle persona mode switching
        let body = "";
        let bodySize = 0;
        const maxBodySize = 1024 * 1024; // 1MB limit

        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > maxBodySize) {
            // Log security violation for oversized requests
            console.warn('[SECURITY] Persona request body size limit exceeded:', {
              size: bodySize,
              maxSize: maxBodySize,
              remoteAddress: host,
              timestamp: new Date().toISOString()
            });

            res.statusCode = 413; // Payload Too Large
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: "Request body too large",
              success: false
            }));
            return;
          }
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            // Parse and validate JSON request body with security checks
            let requestData;
            try {
              requestData = SecurityService.validateJsonInput(body, maxBodySize);
            } catch (parseError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
                success: false
              }));
              return;
            }

            const action = requestData.action;

            if (!action || typeof action !== "string" || !["enable", "disable"].includes(action)) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: "Missing or invalid action in request body. Expected: { action: 'enable' | 'disable' }",
                success: false
              }));
              return;
            }

            // Perform mode switch
            let newMode: OnboardingMode;
            let message: string;

            if (action === "enable") {
              await onboardingModeService.switchToOnboarding();
              newMode = "Onboarding";
              message = "Successfully switched to Onboarding mode";
            } else {
              await onboardingModeService.switchToDefault();
              newMode = "Default";
              message = "Successfully switched to Default mode";
            }

            // Return success response
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              success: true,
              mode: newMode,
              message
            }));

          } catch (error) {
            console.error('HTTP bridge persona switching error:', error);

            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");

            let errorMessage = "Unknown error occurred during persona switching";
            if (error instanceof Error) {
              errorMessage = error.message;

              // Provide more specific error codes for different failure types
              if (error.message.includes('No workspace folder open')) {
                res.statusCode = 400; // Bad Request - no workspace
              } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
                res.statusCode = 403; // Forbidden - permission denied
              }
            }

            res.end(JSON.stringify({
              error: errorMessage,
              success: false
            }));
          }
        });

        return;
      }

      if (req.url.startsWith("/onboarding/commitPlan")) {
        // Handle onboarding plan commitment
        let body = "";
        let bodySize = 0;
        const maxBodySize = 1024 * 1024; // 1MB limit

        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > maxBodySize) {
            // Log security violation for oversized requests
            console.warn('[SECURITY] CommitPlan request body size limit exceeded:', {
              size: bodySize,
              maxSize: maxBodySize,
              remoteAddress: host,
              timestamp: new Date().toISOString()
            });

            res.statusCode = 413; // Payload Too Large
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: "Request body too large"
            }));
            return;
          }
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            // Parse and validate JSON request body with security checks
            let requestData;
            try {
              requestData = SecurityService.validateJsonInput(body, maxBodySize);
            } catch (parseError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
              }));
              return;
            }

            const plan = requestData.plan as OnboardingPlan;

            if (!plan) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: "Missing plan in request body. Expected: { plan: OnboardingPlan }"
              }));
              return;
            }

            // Commit plan using walkthrough service
            const result = await walkthrough.commitPlan(plan);

            // Return success response
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));

          } catch (error) {
            console.error('HTTP bridge commit plan error:', error);

            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");

            let errorMessage = "Unknown error occurred during plan commitment";
            if (error instanceof Error) {
              errorMessage = error.message;

              // Provide more specific error codes for different failure types
              if (error.message.includes('No workspace folder open')) {
                res.statusCode = 400; // Bad Request - no workspace
              } else if (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('required')) {
                res.statusCode = 400; // Bad Request - validation error
              } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
                res.statusCode = 403; // Forbidden - permission denied
              } else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
                res.statusCode = 404; // Not Found - file doesn't exist
              }
            }

            res.end(JSON.stringify({
              error: errorMessage
            }));
          }
        });

        return;
      }

      if (req.url.startsWith("/onboarding/nextStep")) {
        // Handle onboarding step progression
        try {
          // Advance to next step using walkthrough service
          const result = await walkthrough.nextStep();

          // Return success response
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));

        } catch (error) {
          console.error('HTTP bridge next step error:', error);

          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");

          let errorMessage = "Unknown error occurred during step progression";
          if (error instanceof Error) {
            errorMessage = error.message;

            // Provide more specific error codes for different failure types
            if (error.message.includes('No active walkthrough')) {
              res.statusCode = 412; // Precondition Failed - no active walkthrough
            } else if (error.message.includes('No workspace folder open')) {
              res.statusCode = 400; // Bad Request - no workspace
            } else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
              res.statusCode = 404; // Not Found - file doesn't exist
            } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
              res.statusCode = 403; // Forbidden - permission denied
            }
          }

          res.end(JSON.stringify({
            error: errorMessage
          }));
        }

        return;
      }

      if (req.url.startsWith("/onboarding/finalize")) {
        // Handle onboarding finalization with enhanced security
        let body = "";
        let bodySize = 0;
        const maxBodySize = 1024 * 1024; // 1MB limit

        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > maxBodySize) {
            // Log security violation for oversized requests
            console.warn('[SECURITY] Finalize request body size limit exceeded:', {
              size: bodySize,
              maxSize: maxBodySize,
              remoteAddress: host,
              timestamp: new Date().toISOString()
            });

            res.statusCode = 413; // Payload Too Large
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: "Request body too large",
              status: 'error'
            }));
            return;
          }
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            // Parse and validate JSON request body with security checks
            let requestData;
            try {
              requestData = SecurityService.validateJsonInput(body, maxBodySize);
            } catch (parseError) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
                status: 'error'
              }));
              return;
            }

            // Sanitize and validate chosenAction parameter
            const chosenAction = SecurityService.sanitizeChosenAction(requestData.chosenAction);

            // Generate summary data before cleanup
            const summary = walkthrough.getSummary();

            // Validate workspace and get root with security checks
            const wsRoot = SecurityService.validateWorkspace();

            // Track plan file path before cleanup for response with security validation
            const currentState = walkthrough.getCurrentState();
            let removedPlan: string | null = null;

            if (currentState?.planPath) {
              try {
                // Validate that the plan path is within allowed directories
                const relativePath = path.relative(wsRoot, currentState.planPath);
                SecurityService.validateAndNormalizePath(relativePath, wsRoot, true);
                removedPlan = relativePath;
              } catch (error) {
                // If path validation fails, log security violation and use null
                console.warn('[SECURITY] Plan file path validation failed during finalize:', {
                  planPath: currentState.planPath ? '[REDACTED]' : 'null',
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
                removedPlan = null;
              }
            }

            // Perform cleanup operations
            await walkthrough.cleanup({ removePlan: true });

            // Ensure mode is switched to Default (this is also done in cleanup, but being explicit)
            await onboardingModeService.switchToDefault();

            // Send finalize completion message to webview if provider is available
            if (webviewProvider && webviewProvider.postMessage) {
              const finalizePayload = {
                chosenAction: chosenAction,
                summary: summary,
                cleanup: {
                  mode: 'Default' as const,
                  removedPlan: removedPlan
                }
              };

              webviewProvider.postMessage({
                type: 'onboarding/finalize-complete',
                payload: finalizePayload
              });
            }

            // Return structured response
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              status: 'done',
              chosenAction: chosenAction,
              summary: summary,
              cleanup: {
                mode: 'Default',
                removedPlan: removedPlan
              }
            }));

          } catch (error) {
            console.error('HTTP bridge finalize error:', error);

            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");

            let errorMessage = "Unknown error occurred during finalization";
            if (error instanceof Error) {
              errorMessage = error.message;

              // Provide more specific error codes for different failure types
              if (error.message.includes('No workspace folder open')) {
                res.statusCode = 400; // Bad Request - no workspace
              } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
                res.statusCode = 403; // Forbidden - permission denied
              } else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
                res.statusCode = 404; // Not Found - file doesn't exist
              }
            }

            res.end(JSON.stringify({
              error: errorMessage,
              status: 'error'
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

import * as http from 'node:http';
import type * as vscode from 'vscode';
import { messageBus } from './message-bus.service';
import { Events } from '@kiro/shared';

export interface HttpBridgeOptions {
  host?: string; // defaults to 127.0.0.1
  port?: number; // defaults to 39237
}

/**
 * Starts a tiny local HTTP server to bridge external processes (e.g., MCP stdio)
 * with the extension's internal message bus.
 *
 * POST /events with JSON body: { type: string, payload?: any }
 */
export function startHttpBridge(context: vscode.ExtensionContext, opts: HttpBridgeOptions = {}): void {
  // Allow override via options or environment variables. Ensure values are safe.
  const host = opts.host ?? process.env.KIRO_MCP_BRIDGE_HOST ?? '127.0.0.1';
  const envPort = opts.port ?? Number(process.env.KIRO_MCP_BRIDGE_PORT ?? 39237);
  const port = Number.isFinite(envPort) && (envPort as number) > 0 ? (envPort as number) : 39237;

  const server = http.createServer(async (req, res) => {
    try {
      // Only support POST /events
      if (req.method !== 'POST' || !req.url || !req.url.startsWith('/events')) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      // Read and parse JSON body (limit ~1MB)
      let total = 0;
      let raw = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > 1_000_000) {
            reject(new Error('Payload too large'));
            return;
          }
          raw += chunk.toString('utf8');
        });
        req.on('end', () => resolve());
        req.on('error', (err) => reject(err));
      });

      let body: any = undefined;
      if (raw.length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.end('Invalid JSON');
          return;
        }
      }

      const type: string | undefined = body?.type;
      const payload: unknown = body?.payload;

      if (typeof type !== 'string') {
        res.statusCode = 400;
        res.end('Missing type');
        return;
      }

        // Route inbound events through the bus 'receive' path so extension handlers fire.
        // This mirrors how webviews inject events into the bus.
      if (type === Events.OpenDashboard) {
          await messageBus.receive('http-bridge', { type: Events.OpenDashboard, payload: undefined } as any);
      } else {
        // For unknown types, attempt a generic forward if it matches our Events values
        const values = Object.values(Events) as string[];
        if (values.includes(type)) {
          // Note: we cannot ensure type-safety for payload here; consumers should validate.
            await messageBus.receive('http-bridge', { type: type as any, payload: payload as any });
        } else {
          res.statusCode = 400;
          res.end('Unknown event type');
          return;
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('[HTTP Bridge] Error handling request:', err);
      try {
        res.statusCode = 500;
        res.end('Internal Error');
      } catch {
        // ignore
      }
    }
  });

  // Prevent unhandled 'error' events from crashing the extension host.
  server.on('error', (err: any) => {
    const code = (err && (err as any).code) || 'UNKNOWN';
    if (code === 'EADDRINUSE') {
      console.warn(`[HTTP Bridge] Port ${port} on ${host} is already in use. Bridge will be disabled. Set KIRO_MCP_BRIDGE_PORT to a free port to enable.`);
    } else {
      console.error(`[HTTP Bridge] Server error on http://${host}:${port}:`, err);
    }
  });

  try {
    server.listen(port, host, () => {
      console.log(`[HTTP Bridge] Listening on http://${host}:${port}`);
    });
  } catch (err) {
    // Synchronous errors are rare but guard just in case (e.g., invalid port)
    console.error('[HTTP Bridge] Failed to start:', err);
  }

  context.subscriptions.push({
    dispose: () => {
      try {
        server.close();
      } catch {
        // ignore
      }
    },
  });
}

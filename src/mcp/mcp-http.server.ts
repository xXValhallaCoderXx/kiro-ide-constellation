import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Configuration
const HOST = '127.0.0.1';
const PORT = parseInt(process.env.KIRO_MCP_HTTP_PORT ?? '34011', 10);
function computeAllowedHosts(): string[] {
  return [
    HOST,
    `${HOST}:${PORT}`,
    'localhost',
    `localhost:${PORT}`,
  ];
}

// Initialize MCP server
const mcp = new McpServer({
  name: 'Kiro Constellation MCP (HTTP)',
  version: '0.0.1',
});

// Simple SSE hub for extension notifications (pure Node http)
type SSEClient = { id: number; res: ServerResponse };
const sseClients: SSEClient[] = [];
let nextSseId = 1;
function sseBroadcast(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of [...sseClients]) {
    try {
      client.res.write(payload);
    } catch (err) {
      // On error, drop client
      try {
        client.res.end();
      } catch {}
      const idx = sseClients.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        sseClients.splice(idx, 1);
      }
    }
  }
}

// Tools
mcp.registerTool(
  'constellation_ping',
  {
    title: 'Constellation Ping',
    description: 'A simple health check tool for the Kiro Constellation server.',
  },
  async () => {
    const resultText = 'pong';

    // Side-channel: append a JSON line event to ~/.kiro/constellation/events.jsonl
    try {
      const dir = path.join(os.homedir(), '.kiro', 'constellation');
      const file = path.join(dir, 'events.jsonl');
      fs.mkdirSync(dir, { recursive: true });
      const line = JSON.stringify({ ts: Date.now(), type: 'tool:completed', tool: 'constellation_ping', result: resultText }) + '\n';
      fs.appendFileSync(file, line, { encoding: 'utf-8' });
    } catch (err) {
      console.error('MCP HTTP server: failed to append completion event:', err);
    }

    // Notify SSE listeners (extension) so UI can react even for LM-initiated calls
    sseBroadcast({ ts: Date.now(), type: 'tool:completed', tool: 'constellation_ping', result: resultText });

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }
);

// Restrict origin and hosts (best-effort basic hardening for local dev)
// For local-only, CORS is typically not necessary; Streamable HTTP uses custom headers.

// Session management: map session IDs to transports if needed for diagnostics
const transports: Record<string, StreamableHTTPServerTransport> = {};

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse, bodyObj?: unknown) {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Let transport manage session IDs per request lifecycle
      enableDnsRebindingProtection: true,
      allowedHosts: computeAllowedHosts(),
      allowedOrigins: [],
      onsessioninitialized: (sessionId: string) => {
        transports[sessionId] = transport;
      },
    });

    res.on('close', () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
      transport.close();
    });

    await mcp.connect(transport);
    // The transport knows how to handle the raw request/response
    await (transport as any).handleRequest(req, res, bodyObj);
  } catch (error) {
    console.error('MCP HTTP server error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      }));
    }
  }
}

function createHttpServer() {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = parseUrl(req.url || '/', true);
  const pathName = url.pathname || '/';

  // SSE endpoint for extension-side notifications
  if (req.method === 'GET' && pathName === '/events') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = nextSseId++;
    sseClients.push({ id: clientId, res });

    req.on('close', () => {
      const idx = sseClients.findIndex((c) => c.id === clientId);
      if (idx >= 0) {
        sseClients.splice(idx, 1);
      }
      try {
        res.end();
      } catch {}
    });
    return;
  }

  if (pathName === '/mcp') {
    if (req.method === 'POST') {
      // Accumulate body for POST
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', async () => {
        let bodyObj: unknown = undefined;
        try {
          bodyObj = data ? JSON.parse(data) : undefined;
        } catch (e) {
          res.statusCode = 400;
          res.end('Invalid JSON');
          return;
        }
        await handleMcpRequest(req, res, bodyObj);
      });
      return;
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      await handleMcpRequest(req, res);
      return;
    }
  }

  // Not found
  res.statusCode = 404;
  res.end('Not Found');
  });
}

let httpServer: Server | undefined;
export function startHttpMcpServer(): Server | undefined {
  if (httpServer) {
    return httpServer;
  }
  try {
    httpServer = createHttpServer();
    httpServer.listen(PORT, HOST, () => {
      console.error(`MCP Streamable HTTP server listening at http://${HOST}:${PORT}/mcp`);
    });
    httpServer.on('error', (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`[MCP HTTP] Port ${PORT} already in use; assuming another instance is running.`);
      } else {
        console.error('[MCP HTTP] Server error:', err);
      }
    });
    return httpServer;
  } catch (e) {
    console.error('[MCP HTTP] Failed to start server:', e);
    return undefined;
  }
}

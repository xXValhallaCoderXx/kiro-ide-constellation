import http, { Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { messageBus } from '../services/messageBus';
import { Events } from '../shared/events';

export type McpServerController = {
    url: string;
    port: number;
    dispose: () => Promise<void>;
};

/**
 * Create and start a minimal MCP server over Streamable HTTP.
 * - Registers simple tools for basic connectivity testing.
 * - Binds to 127.0.0.1 on an ephemeral port by default.
 */
export async function createAndStartMcpServer(options?: {
    port?: number;
    path?: string; // HTTP path to mount the transport on, default '/mcp'
    statefulSessions?: boolean; // default false (stateless)
}): Promise<McpServerController> {
    const path = options?.path ?? '/mcp';

    // Minimal capabilities: tools and logging for optional diagnostics
    const serverInfo = { name: 'kiro-ide-constellation', version: '0.0.1' } as const;
    const serverOptions: ServerOptions = {
        capabilities: {
            tools: {},
            logging: {},
        },
        instructions:
            'Kiro Constellation MCP server. Use tools ping/echo to verify connectivity. This server is local-only.',
    };

    const mcp = new McpServer(serverInfo, serverOptions);

    // Register minimal tools
    mcp.tool('ping', async () => ({ content: [{ type: 'text', text: 'pong' }] }));

    mcp.tool(
        'echo',
        'Echo back provided text',
        { text: z.string() },
        async (args: { text: string }) => ({ content: [{ type: 'text', text: String(args.text) }] })
    );

    // Open the Kiro dashboard from a tool call
    mcp.tool(
        'open_dashboard',
        'Open the Kiro Constellation dashboard in VS Code',
        async () => {
            await messageBus.broadcast({ type: Events.OpenDashboard, payload: undefined });
            return { content: [{ type: 'text', text: 'Dashboard opened' }] };
        }
    );

    // Configure transport; prefer stateless for simplicity unless opted-in
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: options?.statefulSessions ? () => randomUUID() : undefined,
    });

    // Create an HTTP server and delegate the specific path to the transport
    const server: HttpServer = http.createServer(async (req, res) => {
        try {
            if (!req.url) {
                res.statusCode = 400;
                res.end('Bad Request');
                return;
            }
            const url = new URL(req.url, 'http://localhost');
            if (url.pathname !== path) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
            }
            await transport.handleRequest(req as any, res);
        } catch (err) {
            try {
                res.statusCode = 500;
                res.end('Internal MCP Server Error');
            } catch {
                // ignore
            }
        }
    });

    // Start listening (ephemeral port by default)
    const port = await new Promise<number>((resolve, reject) => {
        server.once('error', reject);
        server.listen(options?.port ?? 0, '127.0.0.1', () => {
            const addressInfo = server.address();
            if (typeof addressInfo === 'object' && addressInfo && 'port' in addressInfo) {
                resolve(addressInfo.port);
            } else {
                reject(new Error('Unable to determine server port'));
            }
        });
    });

    // Connect MCP server to the transport after HTTP server is ready
    await mcp.connect(transport);

    const url = `http://localhost:${port}${path}`;
    // Useful console for debugging (appears in Extension Host debug console)
    console.log(`[MCP] Server started at ${url}`);

    // Notify clients that tools are available
    try { mcp.sendToolListChanged(); } catch { /* ignore */ }

    return {
        url,
        port,
        dispose: async () => {
            console.log('[MCP] Shutting down server');
            await mcp.close();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
    };
}

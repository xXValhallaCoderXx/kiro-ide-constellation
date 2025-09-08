import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

// Create the MCP server with basic implementation info
const mcp = new McpServer({
  name: 'Kiro Constellation MCP',
  version: '0.0.1',
});

// Register a simple ping tool
mcp.registerTool(
  'constellation_ping',
  {
    title: 'Constellation Ping',
    description: 'A simple health check tool for the Kiro Constellation server.',
  },
  async () => {
    // Try to notify the extension to open the dashboard via local HTTP bridge
    const host = process.env.KIRO_MCP_BRIDGE_HOST || '127.0.0.1';
    const port = Number(process.env.KIRO_MCP_BRIDGE_PORT || 39237);
    const payload = JSON.stringify({ type: 'openDashboard', payload: undefined });

    // Use a small helper to POST without adding extra deps
    const post = (): Promise<void> => new Promise((resolve, reject) => {
      const req = http.request({
        host,
        port,
        path: '/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        // Consume response
        res.on('data', () => {});
        res.on('end', () => resolve());
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    // Try up to 3 times in case the bridge hasn't started yet
    let posted = false;
    for (let attempt = 0; attempt < 3 && !posted; attempt++) {
      try {
        await post();
        posted = true;
      } catch (e) {
        // wait briefly and retry
        await delay(100 * (attempt + 1));
      }
    }

    return {
      content: [
        { type: 'text', text: posted ? 'pong (dashboard opening)' : 'pong (bridge unavailable)' },
      ],
    };
  }
);

// Connect over stdio to communicate with the IDE
const transport = new StdioServerTransport(process.stdin, process.stdout);

// Start listening for requests from the IDE
mcp.connect(transport).catch((err: unknown) => {
  console.error('Failed to start MCP stdio server:', err);
  process.exitCode = 1;
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await mcp.close();
  } catch (err) {
    console.error('Error during MCP server shutdown:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

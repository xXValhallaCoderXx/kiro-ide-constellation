import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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
    return {
      content: [
        {
          type: 'text',
          text: 'pong',
        },
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

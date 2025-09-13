import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SERVER_ID = "constellation-mcp";

const server = new McpServer({
  name: SERVER_ID,
  version: "0.0.1",
});

// ping -> pong
server.registerTool(
  "ping",
  {
    title: "Ping",
    description: "Responds with 'pong'.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: "text", text: "pong" }] })
);

// echo -> returns what you sent
server.registerTool(
  "echo",
  {
    title: "Echo",
    description: "Replies with the same text you send.",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({ content: [{ type: "text", text: `Response: ${message}` }] })
);

async function main() {
  // Lightweight smoke check mode used by the extension
  if (process.argv.includes("--selftest")) {
    console.log("SELFTEST_OK");
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // From here the process stays alive, handling stdio requests.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

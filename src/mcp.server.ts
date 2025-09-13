import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DEFAULT_SERVER_ID, getServerIdFromEnv } from "./shared/constants.js";

const SERVER_ID = getServerIdFromEnv() ?? DEFAULT_SERVER_ID;

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
  async () => {
    // Attempt to notify the extension to open the Graph view via HTTP bridge
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (port && token) {
        await fetch(`http://127.0.0.1:${port}/open-graph`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
    return { content: [{ type: "text", text: "pong" }] };
  }
);

// echo -> returns what you sent
server.registerTool(
  "echo",
  {
    title: "Echo",
    description: "Replies with the same text you send.",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({ content: [{ type: "text", text: message }] })
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


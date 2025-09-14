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


// constellation_impactAnalysis -> analyzes dependency impact of changing a source file
server.registerTool(
  "constellation_impactAnalysis",
  {
    title: "Impact Analysis",
    description: "Analyzes dependency impact of changing a source file",
    inputSchema: {
      filePath: z.string().describe("Path to the source file to analyze (workspace-relative)")
    },
  },
  async ({ filePath }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured.",
              affectedFiles: []
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/impact-analysis`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ filePath })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully - Requirements 6.5, 6.6
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          // Try to parse as JSON to get structured error
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`,
              affectedFiles: []
            })
          }]
        };
      }

      // Parse and return the impact analysis results
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      // Handle network failures and other errors gracefully - Requirements 6.5, 6.6
      let errorMessage = "Unknown error occurred during impact analysis";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing a large project.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      console.error('MCP server: Impact analysis request failed:', error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            affectedFiles: []
          })
        }]
      };
    }
  }
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


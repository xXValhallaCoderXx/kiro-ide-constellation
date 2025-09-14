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


// constellation_onboarding.plan -> generates structured onboarding plans
server.registerTool(
  "constellation_onboarding.plan",
  {
    title: "Generate Onboarding Plan",
    description: "Generates a structured walkthrough plan for onboarding users to specific codebase topics",
    inputSchema: {
      request: z.string().describe("The user's request describing what they want to learn about the codebase")
    },
  },
  async ({ request }) => {
    try {
      // This tool generates plans based on the user's request
      // For Phase 1, we'll create a simple plan structure that can be enhanced later
      
      // Generate a basic plan structure based on the request
      const plan = {
        version: 1,
        topic: request.substring(0, 100), // Truncate topic to reasonable length
        createdAt: new Date().toISOString(),
        steps: [
          {
            filePath: "README.md",
            lineStart: 1,
            lineEnd: 10,
            explanation: `Starting with the project overview to understand ${request}`
          },
          {
            filePath: "package.json",
            lineStart: 1,
            lineEnd: 20,
            explanation: "Examining project dependencies and configuration"
          }
        ]
      };

      // Generate user-friendly summary
      const userSummary = `I've created a walkthrough plan for "${request}". This plan includes ${plan.steps.length} steps that will guide you through relevant files in your codebase. The walkthrough will start with the project overview and then examine key configuration files.`;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            plan,
            userSummary
          })
        }]
      };

    } catch (error) {
      console.error('MCP server: Plan generation failed:', error);
      
      let errorMessage = "Failed to generate onboarding plan";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            plan: null,
            userSummary: "Sorry, I couldn't generate a plan for your request. Please try again with a different topic."
          })
        }]
      };
    }
  }
);

// constellation_onboarding.commitPlan -> commits a plan and starts execution
server.registerTool(
  "constellation_onboarding.commitPlan",
  {
    title: "Commit Onboarding Plan",
    description: "Commits an onboarding plan to persistent storage and begins execution",
    inputSchema: {
      plan: z.object({
        version: z.number(),
        topic: z.string(),
        createdAt: z.string(),
        steps: z.array(z.object({
          filePath: z.string(),
          lineStart: z.number(),
          lineEnd: z.number(),
          explanation: z.string()
        }))
      }).describe("The onboarding plan to commit and execute")
    },
  },
  async ({ plan }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured."
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/commitPlan`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully
        let errorText = "Network error";
        try {
          const responseText = await response.text();
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
              error: `Request failed: ${errorText}`
            })
          }]
        };
      }

      // Parse and return the commit result
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      console.error('MCP server: Plan commit request failed:', error);
      
      let errorMessage = "Unknown error occurred during plan commitment";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the plan.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage
          })
        }]
      };
    }
  }
);

// constellation_onboarding.nextStep -> advances to the next step in the walkthrough
server.registerTool(
  "constellation_onboarding.nextStep",
  {
    title: "Next Onboarding Step",
    description: "Advances to the next step in the active onboarding walkthrough",
    inputSchema: {},
  },
  async () => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured."
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/nextStep`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully
        let errorText = "Network error";
        try {
          const responseText = await response.text();
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
              error: `Request failed: ${errorText}`
            })
          }]
        };
      }

      // Parse and return the step result
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      console.error('MCP server: Next step request failed:', error);
      
      let errorMessage = "Unknown error occurred during step progression";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the step.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage
          })
        }]
      };
    }
  }
);

// constellation_onboarding.finalize -> finalizes onboarding walkthrough with cleanup
server.registerTool(
  "constellation_onboarding.finalize",
  {
    title: "Finalize Onboarding",
    description: "Finalizes the onboarding walkthrough with summary generation and cleanup",
    inputSchema: {
      chosenAction: z.union([
        z.literal("document"),
        z.literal("test-plan"),
        z.null()
      ]).describe("The user's chosen action: 'document', 'test-plan', or null")
    },
  },
  async ({ chosenAction }) => {
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
              status: "error"
            })
          }]
        };
      }

      // Validate chosenAction parameter at MCP level for additional security
      const validActions = ['document', 'test-plan', null];
      if (!validActions.includes(chosenAction)) {
        console.warn('MCP server: Invalid chosenAction parameter:', chosenAction);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Invalid chosenAction parameter. Expected: 'document', 'test-plan', or null",
              status: "error"
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge with validated input
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/finalize`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chosenAction })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully with enhanced logging
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: Finalize HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`,
              status: "error"
            })
          }]
        };
      }

      // Parse and return the finalize results
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      // Handle network failures and other errors gracefully
      let errorMessage = "Unknown error occurred during finalization";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the finalization.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      console.error('MCP server: Finalize request failed:', error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            status: "error"
          })
        }]
      };
    }
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


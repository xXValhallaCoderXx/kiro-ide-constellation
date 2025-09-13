# MCP: Tools

This server currently exposes two tools. Extend by adding more mcp.registerTool(...) registrations in packages/mcp-server/src/server.ts.

constellation_ping
- Title: Constellation Ping
- Purpose: Health check and demo tool.
- Behavior:
  1) Attempts to POST { type: 'openDashboard' } to the extension's HTTP bridge (host/port from env)
  2) Retries up to 3 times with short delays (bridge may not be up yet)
  3) Returns a short text response indicating whether the bridge was reached
- Env used by the tool:
  - KIRO_MCP_BRIDGE_HOST (default 127.0.0.1)
  - KIRO_MCP_BRIDGE_PORT (default 39237)

Example pseudo-invocation (from an IDE/agent that supports MCP):
- Call tool: constellation_ping
- Expected result: "pong (dashboard opening)" if the bridge is up, otherwise "pong (bridge unavailable)"

constellation_analysis
- Title: Constellation Analysis
- Purpose: Analyzes files or paths in the workspace (echo implementation for initial iteration).
- Parameters:
  - input (required): File path or content to analyze (string)
- Behavior:
  1) Validates that the input parameter is provided and is a non-empty string
  2) Returns the input back in the response (echo functionality for first iteration)
  3) Handles error cases with appropriate error messages
- Error scenarios:
  - Missing input: "Error: Input parameter is required"
  - Invalid input type: "Error: Input must be a string"
  - Empty input: "Error: Input cannot be empty"

Example pseudo-invocation (from an IDE/agent that supports MCP):
- Call tool: constellation_analysis with input: "/path/to/file.js"
- Expected result: "Analysis input received: /path/to/file.js"


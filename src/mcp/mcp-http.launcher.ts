// Small helper to start the HTTP MCP server from activation
import { startHttpMcpServer } from './mcp-http.server';
export function ensureHttpServerStarted() {
	startHttpMcpServer();
}

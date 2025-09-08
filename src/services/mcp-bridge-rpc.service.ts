import * as vscode from 'vscode';
import { messageBus } from './message-bus.service';
import { Events } from '../shared/events';

// MCP client SDK imports
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';


/**
 * On-demand ping: starts a temporary MCP client, calls constellation_ping, and
 * upon success emits the OpenDashboard event. Returns true on success.
 */
export async function pingMcpAndOpenDashboard(_context: vscode.ExtensionContext): Promise<boolean> {
	let client: Client | undefined;
	try {
		const port = process.env.KIRO_MCP_HTTP_PORT ? parseInt(process.env.KIRO_MCP_HTTP_PORT, 10) : 34011;
		const baseUrl = new URL(`http://127.0.0.1:${port}/mcp`);
		const transport = new StreamableHTTPClientTransport(baseUrl);
		client = new Client({ name: 'kiro-ide-mcp-bridge', version: '0.0.1' });
		await client.connect(transport);

		const result = await client.callTool({ name: 'constellation_ping', arguments: {} });
		const text = Array.isArray(result.content) && result.content[0]?.type === 'text' ? result.content[0].text : undefined;
		console.log('[Kiro MCP Bridge] constellation_ping result:', text ?? '<no-text>');

		await messageBus.receive('mcp', { type: Events.OpenDashboard, payload: undefined });
		return true;
	} catch (err) {
		console.error('[Kiro MCP Bridge] constellation_ping failed:', err);
		return false;
	} finally {
		try {
			await client?.close();
		} catch {
			// ignore
		}
	}
}


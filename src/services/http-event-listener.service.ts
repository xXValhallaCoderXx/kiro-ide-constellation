import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { messageBus } from './message-bus.service';
import { Events } from '../shared/events';

let req: http.ClientRequest | undefined;
let stopped = true;
let reconnectTimer: NodeJS.Timeout | undefined;

function parseSse(uri: URL) {
  const lib = uri.protocol === 'https:' ? https : http;
  const request = lib.request({
    method: 'GET',
    hostname: uri.hostname,
    port: uri.port ? parseInt(uri.port, 10) : undefined,
    path: uri.pathname + (uri.search || ''),
    headers: {
      Accept: 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  });

  request.on('response', (res) => {
    if (res.statusCode !== 200) {
      console.error(`[HTTP SSE] Unexpected status ${res.statusCode}`);
      res.resume();
      scheduleReconnect(uri);
      return;
    }
    let buffer = '';
    res.setEncoding('utf8');
    res.on('data', (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of raw.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const json = trimmed.slice(5).trimStart();
            try {
              const evt = JSON.parse(json);
              handleEvent(evt);
            } catch (e) {
              console.warn('[HTTP SSE] Failed to parse event JSON:', e);
            }
          }
        }
      }
    });
    res.on('close', () => scheduleReconnect(uri));
    res.on('error', () => scheduleReconnect(uri));
  });

  request.on('error', () => scheduleReconnect(uri));
  request.end();
  return request;
}

function scheduleReconnect(uri: URL) {
  if (stopped) {
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(() => {
    try { req?.destroy(); } catch {}
    req = parseSse(uri);
  }, 1000);
}

function handleEvent(evt: any) {
  if (evt && evt.type === 'tool:completed' && evt.tool === 'constellation_ping') {
    void messageBus.receive('mcp-http', { type: Events.OpenDashboard, payload: undefined });
  }
}

export function startHttpEventListener(_context: vscode.ExtensionContext) {
  if (!stopped) {
    return;
  }
  stopped = false;
  const port = process.env.KIRO_MCP_HTTP_PORT ? parseInt(process.env.KIRO_MCP_HTTP_PORT, 10) : 34011;
  const uri = new URL(`http://127.0.0.1:${port}/events`);
  req = parseSse(uri);
}

export function stopHttpEventListener() {
  stopped = true;
  try { req?.destroy(); } catch {}
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  req = undefined;
  reconnectTimer = undefined;
}

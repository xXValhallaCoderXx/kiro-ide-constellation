# MCP Streamable HTTP Migration Checklist

This document outlines how to reproduce the current functionality using Streamable HTTP instead of stdio, and provides two migration paths:

- Full HTTP: Server + Extension + (optionally) LM over Streamable HTTP
- Hybrid: Keep LM on stdio, add HTTP notifications for the Extension

Pick the path that matches your VS Code LM capabilities and rollout risk tolerance.

## Decision quickstart

- If your target VS Code/LM supports MCP HTTP registrations: prefer Full HTTP.
- If not (or you want incremental change): choose Hybrid (LM stays stdio; Extension gets HTTP notifications).

---

## Common goals (both paths)

- Keep the extension ↔ webview message bus as-is (`src/services/message-bus.service.ts`).
- Open the Dashboard when `constellation_ping` completes, whether called by the extension or the LM.
- Harden security (localhost only, DNS rebinding protection, allowlist event handling).

---

## Full HTTP migration

Convert the MCP server to Streamable HTTP. The Extension and (if supported) the LM both connect via HTTP sessions. The server can push notifications to the Extension to trigger UI events.

### 1) Server: HTTP transport

- Create a new HTTP server entrypoint (example filename):
  - `src/mcp/mcp-http.server.ts`
- Use `StreamableHTTPServerTransport` (from `@modelcontextprotocol/sdk/server/streamableHttp.js`).
- Enable session management and maintain a session registry (see SDK docs). Each client (LM, Extension) receives a session ID.
- Restrict to `127.0.0.1` and enable DNS rebinding protection (`allowedHosts`, `allowedOrigins`).
- Expose request handler routes:
  - `POST /mcp` for client→server
  - `GET /mcp` for server→client notifications (SSE)
  - `DELETE /mcp` for session termination
- On `constellation_ping` completion, emit a notification to the Extension session:
  - Method: `"kiro.events.publish"`
  - Params: `{ type: "MCP/ToolCompleted", tool: "constellation_ping", ts, correlationId? }`
  - Keep an allowlist of notification types.
- Choose a port strategy:
  - Fixed default (e.g., `127.0.0.1:34011`) with env override, OR
  - Dynamic, and write the bound port to `~/.kiro/constellation/port.json` for Extension discovery.

Acceptance:
- Server starts without writing logs to stdout
- Initialization logs on stderr; port is discoverable
- Tool handlers return content as before and emit notifications

### 2) Extension bridge: HTTP client

- Update `src/services/mcp-bridge-rpc.service.ts`:
  - Replace `StdioClientTransport` with `StreamableHTTPClientTransport` (from `@modelcontextprotocol/sdk/client/streamableHttp.js`).
  - Connect to the server’s base URL (read from config or the discovery file).
  - Subscribe to notifications: on `MCP/ToolCompleted` for `constellation_ping`, call:
    - `await messageBus.receive('mcp', { type: Events.OpenDashboard, payload: undefined });`
  - Keep the on-demand command (“Ping MCP and Open Dashboard”) by calling the tool via HTTP and emitting on response.

Acceptance:
- Extension can connect over HTTP, call `constellation_ping`, and open Dashboard on success
- Extension receives server notifications when LM triggers the tool

### 3) Provider (LM): HTTP (if supported)

- If VS Code LM supports HTTP MCP server definitions in your target build, register the HTTP endpoint instead of stdio in `src/mcp/mcp.provider.ts`.
- If not supported yet, skip and use Hybrid (below) for LM-initiated tooling.

Acceptance:
- LM can list and call tools over HTTP

### 4) Build/packaging

- Add any server-side HTTP deps (e.g., `express`) if you use them; otherwise, Node’s `http` is fine.
- Add bundle scripts in `package.json` for `mcp-http.server.ts` (CJS output under `out/mcp/`).
- Do NOT print to stdout from the server. Use stderr or a log file.

Acceptance:
- `npm run build` generates the HTTP bundle (and the web + extension bundles)
- No type or lint errors

### 5) Test plan

- Extension-initiated flow:
  - Run command “Kiro: Ping MCP and Open Dashboard”
  - Expect dashboard to open and sticky `DashboardOpened` broadcast
- LM-initiated flow:
  - Trigger `constellation_ping` via LM (chat/tool UI)
  - Expect extension to receive notification and open Dashboard
- Error handling:
  - Stop HTTP server, ensure the extension shows a friendly error and retries
- Security checks:
  - Verify server binds only on `127.0.0.1`
  - Verify DNS rebinding protection

---

## Hybrid migration (LM stdio, Extension HTTP notifications)

Keep the LM on stdio for compatibility. Add a simple HTTP notification channel for the Extension so the UI can react to LM-triggered tool completions.

### 1) Keep stdio server for LM calls

- Retain `src/mcp/mcp-stdio.server.ts` as-is for LM usage.

### 2) Add an HTTP notifier (minimal)

Pick one of:

- Option A: A tiny HTTP notifier in the same process as the stdio server
  - Start an HTTP server (Node `http` or `express`) listening on `127.0.0.1`.
  - Implement an SSE or WebSocket endpoint (e.g., `GET /events`) to push `tool:completed` messages.
  - In `constellation_ping` handler (and any others), publish a notification message to connected Extension listeners.

- Option B: A separate Streamable HTTP MCP server (second process)
  - Spin up a second MCP server over HTTP with the same tool surface, used only by the Extension.
  - When LM triggers `constellation_ping` on the stdio instance, mirror a notification to the HTTP instance’s connected Extension session (requires a small in-process bridge or shared cache).

Acceptance:
- Running the stdio server still works for LM
- HTTP notifier is reachable locally and pushes at least `constellation_ping` completion events

### 3) Extension listener: subscribe and emit bus events

- Add a small HTTP/SSE client in the Extension to subscribe to events.
- On receiving `tool:completed` for `constellation_ping`, emit `Events.OpenDashboard` via the message bus.
- Keep the on-demand command (tool call + open) working; your Extension can call over stdio (existing) or over HTTP (if you expose it) — either is fine.

Acceptance:
- Dashboard opens on LM-triggered tool completion without user commands

### 4) Build/packaging

- If you used Express or WS, add the dependency (server-side only) and update bundle scripts.
- Maintain both bundles if you ship stdio + HTTP notifier.

Acceptance:
- `npm run build` bundles both artifacts (stdio + notifier / HTTP server)
- No type or lint errors

### 5) Test plan

- LM triggers `constellation_ping` → Extension receives HTTP notification → Dashboard opens
- Extension command still works (either stdio or HTTP call path) → Dashboard opens
- Failure modes: notifier down → Extension retries / shows non-intrusive error

---

## Hardening and guardrails

- Allowlist events: the Extension should only act on known event types (e.g., `MCP/ToolCompleted` for specific tools).
- Payload validation: check shape and size before emitting to the bus.
- Origin stamping: when injecting into the bus, set `origin: 'mcp'` (or equivalent meta) to prevent echo loops.
- Port & discovery: fixed port with env override, or dynamic port + discovery file at `~/.kiro/constellation/port.json`.
- Local-only bindings: `127.0.0.1` only; turn on DNS rebinding protection.

---

## Rollout & rollback

- Branch: develop on a feature branch (e.g., `feature/mcp-http`).
- CI: ensure build, lint, and minimal tests pass.
- Canary: ship as a pre-release VSIX to local testers, verify LM and Extension behaviors.
- Rollback: keep the stdio entry and scripts until HTTP is proven. Revert provider changes first (if any), then HTTP codepaths.

---

## Acceptance checklist (tick before merge)

- [ ] Server exposes Streamable HTTP endpoints (Full HTTP) or an HTTP notifier (Hybrid)
- [ ] Extension connects over HTTP and opens Dashboard on `constellation_ping` completion
- [ ] On-demand command still works and opens Dashboard
- [ ] LM-initiated tool calls trigger Dashboard open (via notifications)
- [ ] Local-only bindings and DNS rebinding protection enabled
- [ ] Events allowlisted and payloads validated
- [ ] Build/lint/tests pass; no stdout logging from server
- [ ] Docs updated (README/recipes) to reflect HTTP setup and troubleshooting

---

## File map (for reference)

- Server
  - New (Full HTTP): `src/mcp/mcp-http.server.ts`
  - Existing (LM stdio): `src/mcp/mcp-stdio.server.ts`
- Extension
  - Bridge: `src/services/mcp-bridge-rpc.service.ts` (switch to HTTP client in Full HTTP)
  - Bus (unchanged): `src/services/message-bus.service.ts`
  - Activation & commands: `src/extension.ts`
- Provider
  - `src/mcp/mcp.provider.ts` (Full HTTP only if VS Code LM supports HTTP definitions)
- Packaging
  - `package.json` scripts: add/update bundle entries for HTTP server

Notes:
- If LM HTTP registration isn’t available in your VS Code channel, use Hybrid now and revisit Full HTTP later.

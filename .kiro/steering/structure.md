# Project Structure

## Root Directory Organization

```
├── src/                    # Extension TypeScript source
├── web/                    # Webview UI source (Preact)
├── out/                    # Build output directory
├── docs/                   # Developer documentation
├── media/                  # Static assets (icons, CSS)
└── scripts/                # Build and utility scripts
```

## Extension Code (`src/`)

```
src/
├── extension.ts            # Main extension entry point
├── mcp/                    # Model Context Protocol integration
│   ├── mcpProvider.ts      # MCP server definition provider
│   └── mcpStdioServer.ts   # MCP stdio server implementation
├── services/               # Core extension services
│   └── messageBus.ts       # Extension-side message bus
├── shared/                 # Shared code between extension and web
│   ├── commands.ts         # VS Code command definitions
│   ├── events.ts           # Message bus event types
│   └── utils/              # Utility functions
├── types/                  # TypeScript type definitions
├── ui-providers/           # Webview providers and panels
│   ├── asset-manifest.ts   # Vite asset resolution helper
│   ├── health-dashboard/   # Dashboard webview provider
│   └── sidebar/            # Sidebar webview provider
└── test/                   # Extension tests
```

## Web UI (`web/`)

```
web/
├── src/
│   ├── main-sidebar.tsx    # Sidebar entry point
│   ├── main-dashboard.tsx  # Dashboard entry point
│   ├── components/         # Reusable UI components
│   ├── services/           # Web-side services
│   │   └── messageBus.ts   # Webview message bus wrapper
│   ├── types/              # Web-specific types
│   ├── views/              # Main view components
│   │   ├── HealthDashboard/
│   │   └── Sidebar/
│   └── vscode.ts           # VS Code API wrapper
├── tsconfig.json           # Web TypeScript config
└── vite.config.ts          # Vite build configuration
```

## Architecture Patterns

### Message Bus Communication
- **Shared Events**: `src/shared/events.ts` defines all message types with `Events` enum and `EventPayloads` type mapping
- **Extension Bus**: `src/services/messageBus.ts` handles extension-side messaging with sticky event support
- **Web Bus**: `web/src/services/messageBus.ts` wraps VS Code webview API with `acquireVsCodeApi`
- **Type Safety**: All messages are strongly typed with payload interfaces

### Sticky Events System
- State-like events (e.g., `DashboardOpened`) are replayed to late-joining webviews
- Sticky events cleared by opposing events (e.g., `DashboardClosed` clears `DashboardOpened`)
- Configured in `stickyTypes` set in `src/services/messageBus.ts`

### UI Provider Pattern
- Each webview has a dedicated provider in `src/ui-providers/`
- Providers use `registerWebviewWithBus(id, webview)` helper for lifecycle management
- Asset resolution via `getEntryUris(context, webview, entry)` from `asset-manifest.ts`
- HTML generation includes correct `<script>` and `<link>` tags for Vite-built assets

### MCP Integration
- MCP server bundled separately to `out/mcp/mcpStdioServer.cjs` (self-contained ~500KB)
- Provider registers with VS Code's MCP API when available
- Fallback configuration written to `.kiro/settings/mcp.json` for Kiro IDE discovery
- Runtime path resolution with multiple candidate locations

## Naming Conventions

- **Files**: kebab-case for directories, camelCase for TypeScript files
- **Components**: PascalCase for Preact components
- **Events**: PascalCase constants in `Events` enum
- **CSS Modules**: Component.module.css pattern for scoped styles
- **Webview IDs**: Use consistent identifiers like "sidebar", "dashboard" for message bus registration

## Development Patterns

### Adding New Webview Entry Points
1. Add input entry in `web/vite.config.ts` under `rollupOptions.input`
2. Create `web/src/main-<name>.tsx` file rendering Preact component to `#root`
3. In webview provider, call `getEntryUris(context, webview, '<name>')` for asset URIs

### Message Bus Usage
- **Extension side**: `messageBus.broadcast({ type: Events.EventName, payload: data })`
- **Webview side**: `messageBus.emit(events.EventName, data)`
- **Listening**: `messageBus.on(Events.EventName, handler)` returns unsubscribe function
- **Targeted messaging**: `messageBus.sendTo(id, event)` for specific webviews

### Provider Lifecycle
1. Configure webview options (CSP, localResourceRoots)
2. Generate HTML with `getEntryUris` for JS/CSS injection
3. Register with bus using `registerWebviewWithBus(id, webview)`
4. Handle disposal to clean up resources and broadcast close events
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
- **Shared Events**: `src/shared/events.ts` defines all message types
- **Extension Bus**: `src/services/messageBus.ts` handles extension-side messaging
- **Web Bus**: `web/src/services/messageBus.ts` wraps VS Code webview API
- **Type Safety**: All messages are strongly typed with payload interfaces

### UI Provider Pattern
- Each webview has a dedicated provider in `src/ui-providers/`
- Providers handle webview lifecycle, HTML generation, and message routing
- Asset resolution via `asset-manifest.ts` for Vite-built resources

### MCP Integration
- MCP server bundled separately to `out/mcp/mcpStdioServer.cjs`
- Provider registers with VS Code's MCP API when available
- Fallback configuration written to `.kiro/settings/mcp.json`

## Naming Conventions

- **Files**: kebab-case for directories, camelCase for TypeScript files
- **Components**: PascalCase for Preact components
- **Events**: PascalCase constants in `Events` enum
- **CSS Modules**: Component.module.css pattern for scoped styles
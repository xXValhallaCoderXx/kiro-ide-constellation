# Project Structure

## Root Directory
```
├── src/                    # TypeScript source code
│   ├── services/           # Service layer abstractions
│   ├── shared/             # Shared constants and utilities
│   └── test/               # VS Code test framework tests
├── webview-ui/             # Preact-based webview UI
│   ├── src/components/     # React/Preact components
│   └── src/styles/         # CSS styling
├── out/                    # Compiled JavaScript output
│   └── ui/                 # Built webview assets (main.js, style.css)
├── docs/                   # Comprehensive documentation
├── scripts/                # Utility scripts (MCP cleanup)
├── media/                  # Extension icons and assets
├── .kiro/                  # Kiro configuration and steering
├── .vscode/                # VS Code workspace settings
└── node_modules/           # Dependencies
```

## Source Code Organization (`src/`)
- **`extension.ts`**: Main VS Code extension entry point
  - Extension activation/deactivation
  - MCP configuration management
  - Command registration and webview provider
  - Node.js version validation
- **`mcp.server.ts`**: Standalone MCP server implementation
  - Tool registration (ping, echo)
  - MCP SDK integration
  - Self-test functionality with `--selftest` flag
- **`side-panel-view-provider.ts`**: Webview panel management
  - Preact UI integration
  - Message passing between extension and webview
- **`services/`**: Service layer abstractions
  - `extension-config.service.ts`: VS Code settings management
  - `mcp-config.service.ts`: Kiro MCP configuration handling
  - `node-version.service.ts`: Node.js version validation
  - `dependency-cruiser.service.ts`: Background dependency scanning integration
- **`shared/constants.ts`**: Shared constants and configuration
- **`test/`**: VS Code test framework integration

## Webview UI Structure (`webview-ui/`)
- **`src/components/`**: Preact components (PascalCase .tsx files)
  - `App.tsx`: Main application component
  - `GraphDashboard.tsx`: Dashboard visualization component
  - `Button.tsx`: Reusable button component
- **`src/main.tsx`**: Preact application entry point
- **`src/styles/global.css`**: Global styling
- **`vite.config.ts`**: Vite build configuration for webview
- **`tsconfig.json`**: TypeScript config for webview components

## Key Configuration Files
- **`package.json`**: Extension manifest with VS Code contributions
  - Commands: self-test, open MCP config, scan dependencies
  - Views: Activity bar container and side panel
  - Settings: Node path, workspace config, server ID
- **`tsconfig.json`**: TypeScript compilation (ES2022, NodeNext modules)
- **`eslint.config.mjs`**: Code style and linting rules
- **`.vscodeignore`**: Files excluded from extension package
- **`.vscode-test.mjs`**: VS Code test runner configuration

## Documentation Structure (`docs/`)
- `README.md`: Project overview and quick start
- `usage.md`: Build/run/verify instructions with webview setup
- `configuration.md`: MCP config details and JSON examples
- `development.md`: Development workflow with UI build process
- `troubleshooting.md`: Common issues and solutions

## Build Output Structure (`out/`)
- **`extension.js`**: Compiled main extension
- **`mcp.server.js`**: Compiled standalone MCP server
- **`ui/`**: Built webview assets
  - `main.js`: Bundled Preact application
  - `style.css`: Compiled styles

## Data Output Structure (`.constellation/`)
- **`data/codebase-dependencies.json`**: Dependency-cruiser scan results

## Architecture Patterns
- **Separation of Concerns**: Extension, MCP server, and UI as distinct layers
- **Service Layer**: Abstracted configuration and system services
- **Configuration Management**: User vs workspace MCP config handling
- **Background Processing**: Non-blocking dependency scanning on activation
- **Error Handling**: Graceful fallbacks with user notifications
- **Environment Awareness**: Dev/prod server ID namespacing
- **Self-Validation**: Built-in server health checks
- **Modern UI**: Preact + Vite for fast webview development

## File Naming Conventions
- TypeScript files: camelCase (e.g., `mcp.server.ts`)
- React/Preact components: PascalCase (e.g., `App.tsx`, `GraphDashboard.tsx`)
- Config files: kebab-case (e.g., `eslint.config.mjs`)
- Documentation: kebab-case (e.g., `troubleshooting.md`)
- Scripts: kebab-case (e.g., `mcp-clean.mjs`)
- Services: kebab-case with suffix (e.g., `mcp-config.service.ts`)
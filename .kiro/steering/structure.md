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
  - Tool registration (ping, constellation_impactAnalysis, constellation_onboarding.plan, constellation_onboarding.commitPlan, constellation_onboarding.nextStep, constellation_onboarding.finalize)
  - MCP SDK integration
  - HTTP bridge communication for UI integration
  - Self-test functionality with `--selftest` flag
- **`side-panel-view-provider.ts`**: Webview panel management
  - Preact UI integration
  - Message passing between extension and webview
- **`services/`**: Service layer abstractions
  - `extension-config.service.ts`: VS Code settings management
  - `mcp-config.service.ts`: Kiro MCP configuration handling
  - `node-version.service.ts`: Node.js version validation
  - `dependency-cruiser.service.ts`: Background dependency scanning integration
  - `impact-analysis.service.ts`: BFS-based dependency impact analysis
  - `http-bridge.service.ts`: Secure loopback HTTP server for MCP communication
  - `graph-data.service.ts`: Dependency data transformation and loading
  - `messenger.service.ts`: Centralized webview message handling
  - `workspace.service.ts`: Workspace validation and utilities
  - `onboarding-mode.service.ts`: Persona switching and steering document backup/restore management
  - `onboarding-walkthrough.service.ts`: Walkthrough plan execution and step progression with file highlighting
- **`shared/constants.ts`**: Shared constants and configuration
- **`test/`**: VS Code test framework integration

## Webview UI Structure (`webview-ui/`)
- **`src/components/`**: Preact components (PascalCase .tsx files)
  - `App.tsx`: Main application component
  - `GraphDashboard.tsx`: Dashboard visualization component
  - `GraphCanvas.tsx`: Cytoscape.js graph rendering component
  - `GraphToolbar.tsx`: Graph interaction controls
  - `Button.tsx`: Reusable button component
  - `OnboardingModeToggle.tsx`: Mode switching UI with confirmation dialogs and backup/restore messaging
  - `OnboardingStatus.tsx`: Walkthrough progress display with step tracking and completion notifications
- **`src/views/`**: Page-level view components
  - `SidePanelView.tsx`: Main side panel interface
- **`src/services/`**: UI service layer
  - `messenger.ts`: Webview-to-extension messaging
  - `graph-styles.service.ts`: Cytoscape styling and layout
  - `file-type.service.ts`: File type detection and icons
  - `extension-config.service.ts`: Extension configuration access
- **`src/types/`**: TypeScript type definitions
  - `vscode-webview.d.ts`: VS Code webview API types
- **`src/main.tsx`**: Preact application entry point
- **`src/styles/global.css`**: Global styling
- **`vite.config.ts`**: Vite build configuration for webview
- **`tsconfig.json`**: TypeScript config for webview components

## Key Configuration Files
- **`package.json`**: Extension manifest with VS Code contributions
  - Commands: open MCP config, scan dependencies, open graph view
  - Views: Activity bar container and side panel
  - Settings: Node path, workspace config, server ID
  - MCP Tools: ping, constellation_impactAnalysis, constellation_onboarding.plan, constellation_onboarding.commitPlan, constellation_onboarding.nextStep, constellation_onboarding.finalize
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
- **`onboarding/`**: Walkthrough plan storage and execution data
  - `plan-YYYY-MM-DDTHH-mm-ss.json`: Timestamped onboarding plan files with step definitions
- **`steering/backup/`**: Persona switching backup storage
  - `YYYY-MM-DDTHH-mm-ss/`: Timestamped backup directories containing steering document snapshots
  - `.backup-metadata.json`: Backup metadata with file counts and timestamps

## Architecture Patterns
- **Separation of Concerns**: Extension, MCP server, and UI as distinct layers
- **Service Layer**: Abstracted configuration and system services
- **Configuration Management**: User vs workspace MCP config handling
- **Background Processing**: Non-blocking dependency scanning on activation
- **Error Handling**: Graceful fallbacks with user notifications
- **Environment Awareness**: Dev/prod server ID namespacing
- **Self-Validation**: Built-in server health checks
- **Modern UI**: Preact + Vite for fast webview development
- **Persona Management**: Embedded onboarding template with backup/restore lifecycle
  - Onboarding persona template embedded in `onboarding-mode.service.ts` for bundle shipping
  - Written to `.kiro/steering/onboarding-guide.md` during mode switching
  - Original steering documents backed up to `.constellation/steering/backup/` with timestamps
  - Automatic restoration and cleanup when switching back to Default mode

For comprehensive onboarding system architecture and workflows, see [onboarding.md](onboarding.md).

## File Naming Conventions
- TypeScript files: camelCase (e.g., `mcp.server.ts`)
- React/Preact components: PascalCase (e.g., `App.tsx`, `GraphDashboard.tsx`)
- Config files: kebab-case (e.g., `eslint.config.mjs`)
- Documentation: kebab-case (e.g., `troubleshooting.md`)
- Scripts: kebab-case (e.g., `mcp-clean.mjs`)
- Services: kebab-case with suffix (e.g., `mcp-config.service.ts`)
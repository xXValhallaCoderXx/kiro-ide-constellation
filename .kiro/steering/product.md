# Product Overview

Kiro IDE Constellation is a VS Code extension packaged within a pnpm/Turbo monorepo. It provides a custom Activity Bar container with sidebar and dashboard webviews, an MCP stdio integration, a typed message bus, and utility commands for developer workflows.

## Key Features
- Activity Bar integration: "Kiro Constellation" container with branded icon
- Sidebar webview: persistent, message-bus connected
- Dashboard webview: opens via command, synchronized via sticky events
- MCP integration: stdio server bundled and registered via VS Code language model APIs (with fallback discovery)
- Message bus: typed contracts shared across extension and webviews
- HTTP bridge: allows external processes (e.g., MCP tools) to trigger extension/UI behavior
- Dependency analysis (POC): command to analyze workspace dependencies and write JSON to `.constellation/data`

## Target Use Cases
- AI-assisted development with MCP
- Custom dashboards and tooling via a lightweight Preact web UI
- Coordinated workflows between extension, webviews, and external processes

## Monorepo Packages
- packages/extension: extension host (tsc → out)
- packages/webview: web UI (Vite → ../extension/out)
- packages/shared: shared contracts
- packages/mcp-server: stdio server (esbuild → ../extension/out/mcp)

## Extension Metadata
- Name: kiro-ide-constellation
- Version: 0.0.5
- Publisher: xXValhallaCoderXx
- Activation: onStartupFinished, onCommand handlers, and view activations

## Commands
- `kiro-ide-constellation.openDashboard`: Open the dashboard
- `kiro.deps.scan`: Run dependency analysis (POC) and write `.constellation/data/dependency-analysis.json` in the analyzed folder

The extension is a foundation for MCP-based AI tooling and UI experiences in VS Code, emphasizing strict typing, clean separation of concerns, and robust fallbacks for varied environments.

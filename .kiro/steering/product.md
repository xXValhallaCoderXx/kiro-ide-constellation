# Product Overview

Kiro Constellation is a VS Code extension that provides a bare-bones MCP (Model Context Protocol) server for Kiro AI assistant integration, complete with a webview-based side panel UI.

## Core Purpose
- Demonstrates MCP server implementation with basic ping/echo tools
- Auto-configures Kiro's MCP settings for seamless integration
- Serves as a template/starting point for custom MCP server development
- Provides a modern Preact-based webview UI as an extension example

## Key Features
- **MCP Server Integration**: Automatic server registration in Kiro configuration
- **Node.js Compatibility**: 18+ version checking and validation
- **Self-Testing**: Built-in server health checks and validation
- **Dual Configuration**: User-level and workspace-level MCP config support
- **Development Workflow**: Dev/prod server ID namespacing for isolation
- **Webview Side Panel**: Modern Preact UI with Vite build system
- **Dependency Analysis**: Background dependency-cruiser integration for codebase scanning
- **Extension Commands**: Self-test, config management, and dependency scanning commands

## Architecture Components
- **VS Code Extension**: Main extension host integration (`src/extension.ts`)
- **MCP Server**: Standalone server with ping/echo tools (`src/mcp.server.ts`)
- **Webview UI**: Preact-based side panel with dashboard components
- **Dependency Scanner**: Background dependency-cruiser integration service
- **Build System**: TypeScript + Vite for extension and UI compilation
- **Configuration**: Automatic Kiro MCP config management

## Target Users
Developers who want to:
- Learn MCP server development patterns
- Create custom tools for Kiro AI assistant
- Build VS Code extensions with webview UIs
- Understand Kiro integration workflows
- Analyze codebase dependencies and structure
- Extend Kiro's capabilities with local services
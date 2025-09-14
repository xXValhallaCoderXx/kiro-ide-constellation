# Product Overview

Kiro Constellation is a VS Code extension that provides a comprehensive MCP (Model Context Protocol) server for Kiro AI assistant integration, featuring interactive dependency graph visualization, impact analysis capabilities, and a modern webview-based side panel UI.

## Core Purpose
- Demonstrates MCP server implementation with ping and impact analysis tools
- Auto-configures Kiro's MCP settings for seamless integration
- Serves as a template/starting point for custom MCP server development
- Provides interactive dependency graph visualization for codebase analysis
- Offers real-time impact analysis for understanding code change effects
- Showcases modern Preact-based webview UI with performance optimizations

## Key Features
- **MCP Server Integration**: Automatic server registration in Kiro configuration
- **Impact Analysis Tool**: Real-time dependency impact analysis via `constellation_impactAnalysis` MCP tool
- **Node.js Compatibility**: 18+ version checking and validation
- **Self-Testing**: Built-in server health checks and validation
- **Dual Configuration**: User-level and workspace-level MCP config support
- **Development Workflow**: Dev/prod server ID namespacing for isolation
- **Interactive Graph Visualization**: Cytoscape.js-powered dependency graphs with performance optimizations
- **Smart Performance Handling**: Adaptive rendering for graphs of all sizes (200+ to 500+ nodes)
- **Real-time Progress Feedback**: Live status updates during scanning and rendering operations
- **Webview Side Panel**: Modern Preact UI with Vite build system and hot reload
- **Dependency Analysis**: Background dependency-cruiser integration with 30-second timeout optimization
- **HTTP Bridge**: Secure loopback communication between MCP tools and extension UI
- **Extension Commands**: Config management, dependency scanning, graph visualization, and impact display

## Architecture Components
- **VS Code Extension**: Main extension host integration (`src/extension.ts`)
- **MCP Server**: Standalone server with ping and impact analysis tools (`src/mcp.server.ts`)
- **Impact Analysis Engine**: BFS-based dependency traversal with workspace validation (`src/services/impact-analysis.service.ts`)
- **Graph Visualization**: Interactive Cytoscape.js-based dependency graph rendering
- **Data Processing**: Intelligent dependency data transformation with performance optimizations
- **Webview UI**: Preact-based side panel with dashboard and graph view components
- **HTTP Bridge**: Secure loopback server for MCP-to-extension communication (`src/services/http-bridge.service.ts`)
- **Dependency Scanner**: Background dependency-cruiser integration with timeout handling
- **Messaging System**: Bidirectional communication between extension and webview
- **Build System**: TypeScript + Vite for extension and UI compilation
- **Configuration**: Automatic Kiro MCP config management

## Target Users
Developers who want to:
- Learn MCP server development patterns
- Create custom tools for Kiro AI assistant
- Build VS Code extensions with webview UIs
- Understand Kiro integration workflows
- Analyze code change impact before making modifications
- Visualize and analyze codebase dependencies interactively
- Explore large codebases with performance-optimized graph visualization
- Implement real-time progress feedback in VS Code extensions
- Handle edge cases and performance optimization in webview applications
- Build secure HTTP bridges for extension-to-tool communication
- Extend Kiro's capabilities with local services
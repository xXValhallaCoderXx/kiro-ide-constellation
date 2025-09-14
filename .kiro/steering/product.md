# Product Overview

Kiro Constellation is a VS Code extension that provides a comprehensive MCP (Model Context Protocol) server for Kiro AI assistant integration, featuring interactive dependency graph visualization, impact analysis capabilities, guided onboarding walkthroughs, and a modern webview-based side panel UI.

## Core Purpose
- Demonstrates MCP server implementation with 6 specialized tools for codebase exploration
- Auto-configures Kiro's MCP settings for seamless integration
- Serves as a template/starting point for custom MCP server development
- Provides interactive dependency graph visualization for codebase analysis
- Offers real-time impact analysis for understanding code change effects
- Enables guided onboarding walkthroughs with persona switching capabilities
- Showcases modern Preact-based webview UI with performance optimizations

## Key Features
- **Complete MCP Tool Suite**: 6 specialized tools for comprehensive codebase exploration
  - `ping`: Connectivity testing and graph view activation
  - `constellation_impactAnalysis`: Real-time dependency impact analysis
  - `constellation_onboarding.plan`: Graph-based walkthrough plan generation
  - `constellation_onboarding.commitPlan`: Plan execution with file highlighting
  - `constellation_onboarding.nextStep`: Step-by-step walkthrough progression
  - `constellation_onboarding.finalize`: Walkthrough completion and cleanup
- **Onboarding Mode System**: Persona switching with automatic backup/restore
  - Default mode for standard development workflows
  - Onboarding mode with embedded persona template for guided exploration
  - Automatic steering document backup and restoration
  - Mode switching UI with confirmation dialogs
- **Guided Walkthrough Execution**: Interactive codebase exploration
  - Graph-based plan generation using BFS traversal
  - File opening and line range highlighting in VS Code
  - Step progression with real-time status updates
  - Walkthrough completion with documentation and testing options
- **MCP Server Integration**: Automatic server registration in Kiro configuration
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
- **MCP Server**: Standalone server with 6 specialized tools (`src/mcp.server.ts`)
  - Graph context service with BFS traversal engine
  - Seed resolution engine for file and topic matching
  - HTTP bridge client for extension communication
- **Onboarding System**: Complete persona switching and walkthrough management
  - **Mode Service**: Backup/restore steering documents (`src/services/onboarding-mode.service.ts`)
  - **Walkthrough Service**: Plan execution and step progression (`src/services/onboarding-walkthrough.service.ts`)
  - **UI Components**: Mode toggle and status display (`webview-ui/src/components/Onboarding*.tsx`)
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

**Onboarding Use Cases:**
- **New Team Members**: Guided exploration of unfamiliar codebases with structured walkthroughs
- **Code Reviewers**: Understanding feature implementation through dependency-aware tours
- **Architects**: Analyzing system structure and component relationships interactively
- **Documentation Writers**: Generating structured documentation from walkthrough experiences
- **QA Engineers**: Creating test plans based on guided code exploration
- **Consultants**: Rapidly understanding client codebases through automated onboarding flows
- **Open Source Contributors**: Learning project structure before making contributions
- **Technical Writers**: Creating onboarding materials and developer guides

For detailed onboarding system documentation, see [onboarding.md](onboarding.md).
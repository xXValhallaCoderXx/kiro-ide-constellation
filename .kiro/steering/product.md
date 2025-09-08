# Product Overview

Kiro IDE Constellation is a VS Code extension that provides a custom Activity Bar container with sidebar and dashboard webviews. The extension serves as a foundation for building AI-powered development tools within VS Code.

## Key Features

- **Activity Bar Integration**: Custom "Kiro Constellation" container with branded SVG icon
- **Sidebar Webview**: Persistent sidebar panel for quick access to tools and controls
- **Dashboard Webview**: Full-featured dashboard that opens as an editor tab via command
- **MCP Integration**: Model Context Protocol support for AI tool integration with server definition provider
- **Message Bus Architecture**: Type-safe communication between extension and webviews with sticky events
- **HTTP Bridge Service**: External communication capabilities for web services integration
- **Atomic Design System**: Component architecture with atoms, molecules, and organisms

## Target Use Cases

- AI-assisted development workflows with MCP server integration
- Custom development dashboards and tooling with Preact-based UI
- Integration with external AI services via MCP protocol
- Enhanced VS Code UI experiences for specialized development tasks
- HTTP-based external service integration through bridge service

## Extension Metadata

- **Name**: kiro-ide-constellation
- **Version**: 0.0.5
- **Publisher**: xXValhallaCoderXx
- **Repository**: https://github.com/xXValhallaCoderXx/kiro-ide-constellation
- **Activation**: onStartupFinished (loads automatically when VS Code starts)

## Commands

- `kiro-ide-constellation.openDashboard`: Opens the main dashboard in an editor tab

The extension is designed as a platform for building sophisticated AI-powered development tools while maintaining clean separation between the VS Code extension host and web-based UI components. It provides a foundation for MCP-based AI tool integration with a modern Preact frontend.
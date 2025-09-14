# VS Code Extension Integration

## Purpose
Guide the agent in understanding and safely modifying VS Code extension host integration, command registration, configuration management, and webview providers. Focus on VS Code API patterns, activation lifecycle, and proper resource management.

## Agent Behavior Guidelines
- **Extension Lifecycle**: Properly handle activation/deactivation and resource cleanup
- **Command Safety**: Validate workspace and user permissions before executing commands
- **Configuration**: Use VS Code configuration API with proper defaults and validation
- **Webview Security**: Follow VS Code webview security best practices and CSP policies
- **Error Handling**: Provide user-friendly error messages through VS Code notification API

## Key Conventions
- **Activation Events**: Use appropriate activation events to minimize startup impact
- **Command Registration**: Register all commands in package.json contributions
- **Configuration Schema**: Define configuration properties with proper types and descriptions
- **Webview Providers**: Implement proper webview lifecycle management and message handling
- **Resource Cleanup**: Always dispose of resources in deactivation handler

## When in Doubt
- Check VS Code API documentation for proper usage patterns
- Use VS Code's built-in validation and error handling mechanisms
- Prefer workspace-scoped operations over global modifications
- Test extension activation/deactivation cycles thoroughly
- Follow VS Code extension security guidelines for webview content

## Inclusion Rules

### Main Extension Entry Point
```
src/extension.ts
```

### Webview Providers
```
src/side-panel-view-provider.ts
src/providers/graph-panel-provider.ts
```

### Extension Configuration
```
package.json
```

### TypeScript Configuration
```
tsconfig.json
```

### Build and Packaging
```
eslint.config.mjs
.vscode-test.mjs
```

### Extension Manifest and Metadata
```
README.md
```

**Why these files**: Core extension integration points, webview providers, configuration schema, and build setup. Focuses on VS Code-specific integration patterns.

**Ranking applied**: Entry point first (extension.ts), then providers, then configuration and build files.

**Files included**: 7 files (under 15 limit)

## Notes
- Excluded service layer files (covered in server.md)
- Excluded webview UI files (covered in ui.md)
- Focus on VS Code extension host integration
- Includes package.json for extension manifest and contributions
- Build configuration for extension compilation and testing
- Extension lifecycle and command registration patterns
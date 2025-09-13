# Project Structure

## Root Directory
```
├── src/                    # TypeScript source code
├── out/                    # Compiled JavaScript output
├── docs/                   # Documentation files
├── scripts/                # Utility scripts
├── .kiro/                  # Kiro configuration and steering
├── .vscode/                # VS Code workspace settings
└── node_modules/           # Dependencies
```

## Source Code Organization (`src/`)
- **`extension.ts`**: Main VS Code extension entry point
  - Extension activation/deactivation
  - MCP configuration management
  - Command registration
  - Node.js version validation
- **`mcpServer.ts`**: Standalone MCP server implementation
  - Tool registration (ping, echo)
  - MCP SDK integration
  - Self-test functionality
- **`test/`**: Test files using VS Code test framework

## Key Files
- **`package.json`**: Extension manifest, dependencies, VS Code contribution points
- **`tsconfig.json`**: TypeScript compilation settings (ES2022, NodeNext)
- **`eslint.config.mjs`**: Code style and linting rules
- **`.vscodeignore`**: Files excluded from extension package

## Documentation Structure (`docs/`)
- `README.md`: Project overview
- `usage.md`: Build/run/verify instructions
- `configuration.md`: MCP config details
- `development.md`: Development workflow
- `troubleshooting.md`: Common issues

## Architecture Patterns
- **Separation of Concerns**: Extension logic separate from MCP server
- **Configuration Management**: User vs workspace MCP config handling
- **Error Handling**: Graceful fallbacks with user notifications
- **Environment Awareness**: Dev/prod server ID namespacing
- **Self-Validation**: Built-in server health checks

## File Naming Conventions
- TypeScript files: camelCase (e.g., `mcpServer.ts`)
- Config files: kebab-case (e.g., `eslint.config.mjs`)
- Documentation: kebab-case (e.g., `troubleshooting.md`)
- Scripts: kebab-case (e.g., `mcp-clean.mjs`)
# Technology Stack

## Core Technologies
- **TypeScript**: Primary language (ES2022 target, NodeNext modules)
- **Node.js**: Runtime (18+ required by MCP SDK)
- **VS Code Extension API**: Host platform integration and webview management
- **MCP SDK**: `@modelcontextprotocol/sdk` for server implementation
- **Zod**: Schema validation and type safety
- **Preact**: Lightweight React alternative for webview UI
- **Vite**: Fast build tool for webview bundling

## Build System
- **TypeScript Compiler**: Direct `tsc` compilation for extension code
- **Vite**: Modern bundler for webview UI with hot reload
- **ESLint**: Code linting with TypeScript rules
- **VS Code Test**: Testing framework integration

## UI Framework Stack
- **Preact**: Component-based UI library (10.24.3)
- **Vite**: Build tool with `@preact/preset-vite` for optimal bundling
- **CSS**: Global styles with component-scoped styling
- **TypeScript**: Full type safety in UI components

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript + build UI
npm run compile      # TypeScript compilation only
npm run build:ui     # Build webview UI only
npm run watch        # Watch mode for TypeScript
npm run watch:dev    # Watch with dev server ID environment
npm run dev:ui       # Watch mode for UI development
```

### Testing & Quality
```bash
npm run lint         # Run ESLint on src/
npm run test         # Run VS Code tests
npm run pretest      # Compile + lint before testing
```

### Extension Management
```bash
npm run package      # Create .vsix package (includes UI build)
npm run clean:mcp    # Clean user MCP config
npm run clean:mcp:ws # Clean workspace MCP config
```

### Development Workflow
- **F5 Launch**: Extension Development Host with dual watch tasks
  - TypeScript watch (`tsc -watch`)
  - UI watch (`vite build --watch`)
- **"Run Extension (Dev MCP)"**: Namespaced development with `constellation-mcp-dev` ID
- **Server Registration**: Auto-registers with configurable server ID
- **UI Development**: Hot reload for webview changes (reload window to see updates)

## Configuration Management
- **Extension Settings**: VS Code configuration API
  - `constellation.nodePath`: Custom Node.js binary path
  - `constellation.writeWorkspaceMcpConfig`: Workspace-level config toggle
  - `constellation.serverId`: Configurable MCP server identifier
- **MCP Configuration**: Automatic Kiro config file management
  - User-level: `~/.kiro/settings/mcp.json`
  - Workspace-level: `./.kiro/settings/mcp.json`

## Code Style & Standards
- **Strict TypeScript**: Full type checking with ES2022 target
- **ESLint Configuration**: TypeScript-aware linting rules
- **Naming Conventions**: 
  - camelCase for TypeScript files and variables
  - PascalCase for React/Preact components and imports
  - kebab-case for config files and documentation
- **Code Quality**: Semicolons required, curly braces enforced, strict equality preferred
- **Module System**: ESM with NodeNext module resolution

## Dependencies
### Runtime Dependencies
- `@modelcontextprotocol/sdk`: ^1.18.0 (MCP server implementation)
- `zod`: ^3.23.8 (Schema validation)
- `preact`: ^10.24.3 (UI framework)

### Development Dependencies
- `typescript`: ^5.9.2 (Language and compiler)
- `vite`: ^5.4.8 (UI build tool)
- `@preact/preset-vite`: ^2.9.1 (Preact integration)
- `eslint`: ^9.34.0 (Code linting)
- `@vscode/test-cli`: ^0.0.11 (Testing framework)
- `vsce`: ^2.15.0 (Extension packaging)
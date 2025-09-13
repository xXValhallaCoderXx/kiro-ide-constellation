# Technology Stack

## Core Technologies
- **TypeScript**: Primary language (ES2022 target, NodeNext modules)
- **Node.js**: Runtime (18+ required)
- **VS Code Extension API**: Host platform integration
- **MCP SDK**: `@modelcontextprotocol/sdk` for server implementation
- **Zod**: Schema validation and type safety

## Build System
- **TypeScript Compiler**: Direct `tsc` compilation
- **ESLint**: Code linting with TypeScript rules
- **VS Code Test**: Testing framework

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run watch        # Watch mode compilation
npm run watch:dev    # Watch with dev server ID
```

### Testing & Quality
```bash
npm run lint         # Run ESLint
npm run test         # Run VS Code tests
npm run pretest      # Compile + lint before testing
```

### Extension Management
```bash
npm run package      # Create .vsix package
npm run clean:mcp    # Clean user MCP config
npm run clean:mcp:ws # Clean workspace MCP config
```

### Development Workflow
- Use F5 in VS Code to launch extension host
- Choose "Run Extension (Dev MCP)" for namespaced development
- Server auto-registers with `constellation-mcp` or `constellation-mcp-dev` ID

## Code Style
- Strict TypeScript configuration
- ESLint with naming conventions (camelCase/PascalCase imports)
- Semicolons required
- Curly braces enforced
- Strict equality (`===`) preferred
# Project Structure

## Root Level
- `src/` - Extension TypeScript code (Node.js runtime)
- `web/` - Webview UI code (Preact components)
- `out/` - Build output directory
- `docs/` - Developer documentation
- `media/` - Static assets (icons, CSS)

## Extension Code (`src/`)
```
src/
├── extension.ts              # Main extension entry point
├── services/
│   └── messageBus.ts        # Extension-side message bus
├── shared/
│   ├── commands.ts          # VS Code command definitions
│   ├── events.ts            # Typed event contracts
│   └── utils/               # Shared utilities
├── ui-providers/            # Webview provider implementations
│   ├── asset-manifest.ts    # Vite asset loading helper
│   ├── health-dashboard/    # Dashboard webview provider
│   └── sidebar/             # Sidebar webview provider
├── tools/                   # Extension tools/utilities
└── test/                    # Extension tests
```

## Web UI Code (`web/`)
```
web/
├── src/
│   ├── main-sidebar.tsx     # Sidebar entry point
│   ├── main-dashboard.tsx   # Dashboard entry point
│   ├── components/          # Reusable UI components
│   │   ├── atoms/           # Basic components
│   │   ├── molecules/       # Composite components
│   │   └── organisms/       # Complex components
│   ├── views/               # Page-level components
│   │   ├── HealthDashboard/ # Dashboard view + styles
│   │   └── Sidebar/         # Sidebar view + styles
│   ├── services/
│   │   └── messageBus.ts    # Webview-side message bus
│   └── types/               # TypeScript definitions
├── tsconfig.json            # Web-specific TypeScript config
└── vite.config.ts           # Vite build configuration
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `Button.tsx`, `HealthDashboard.tsx`)
- **Services**: camelCase (e.g., `messageBus.ts`)
- **Utilities**: kebab-case with `.utils.ts` suffix
- **CSS Modules**: `ComponentName.module.css`

### Architecture Patterns
- **Webview Providers**: Each UI has its own provider in `src/ui-providers/`
- **Entry Points**: Web entries follow `main-{name}.tsx` pattern
- **Shared Code**: Common types and events in `src/shared/`
- **Component Hierarchy**: Atomic design pattern (atoms → molecules → organisms)

### Import Conventions
- Extension code imports from `vscode` API
- Web code imports from `preact` and web APIs
- Shared types imported from `../shared/` in extension code
- Message bus used for all extension ↔ webview communication
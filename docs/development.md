# Development

Requirements
- Node.js 18+ (required by the MCP TypeScript SDK)
- ESM configuration: package.json has "type": "module" and tsconfig uses NodeNext.

UI layer
- Preact app bundled with Vite lives in webview-ui/.
- Output goes to out/ui (main.js, style.css). The webview provider loads from there.
- Components use PascalCase .tsx files (e.g., App.tsx, GraphDashboard.tsx, Button.tsx). Non-components use kebab-case .ts.
- Services layer provides business logic (focus-mode.service.ts, graph-styles.service.ts, etc.)
- Focus mode state managed entirely in UI with performance optimizations

Edit–build loop
- F5 (Run Extension or Run Extension (Dev MCP)) starts two background tasks:
  - TypeScript watch (tsc -w)
  - UI watch (vite build --watch)
- When UI code changes, the Vite watcher rebuilds out/ui; reload the window to pick up the new assets.

Manual commands
```bash
# TypeScript compile once
npm run compile

# Build webview UI once
npm run build:ui

# Watch both (ts + UI) outside of F5
npm run watch & npm run dev:ui
```

Server changes
- For changes in src/mcp.server.ts, rebuild (tsc should handle) and restart constellation-mcp from the MCP panel. No full window reload needed.

Config changes
- For Node path / workspace write setting changes, reload the window so Kiro re-reads configs.

Dependency scan (dev notes)
- The scan runs in the background on activation and does not block the UI.
- By default it excludes: node_modules|dist|out|build|coverage|.git|.vscode|.constellation
- If a dependency-cruiser config exists in the workspace root it will be used (via --config). Otherwise we pass --no-config.
- If tsconfig.json exists in the workspace root it will be passed as --ts-config <abs path>.
- Output path: ./.constellation/data/codebase-dependencies.json
- You can re-run the scan via command palette: "Constellation: Scan Dependencies" or via the MCP-triggered `/scan` bridge endpoint when the graph is missing.

Event architecture (details)
- Webview UI messaging
  - Webview posts messages via messenger.post(type, payload) (webview-ui/src/services/messenger.ts).
  - Providers/Graph panels listen to webview.onDidReceiveMessage and route into src/services/messenger.service.ts.
  - Current inbound messages: 'open-graph-view'. Planned graph messages: 'graph/load', 'graph/open-file', 'graph/scan'.
- HTTP bridge for MCP → extension
  - startHttpBridge in src/services/http-bridge.service.ts creates a small HTTP server (listen(0), loopback only) and a random token.
  - Env injected into MCP config: CONSTELLATION_BRIDGE_PORT, CONSTELLATION_BRIDGE_TOKEN.
  - MCP (Node 18+) uses global fetch to POST http://127.0.0.1:<port>/open-graph with Authorization: Bearer <token>.
  - The handler validates token and runs the command to open/reveal the singleton Graph tab.
- Graph tab singleton
  - The command keeps a module-level WebviewPanel reference; further opens call reveal instead of creating duplicates.

Manual bridge testing
```bash
# View env in ~/.kiro/settings/mcp.json (values are dynamic per run)
# Test the bridge manually (replace <PORT> and <TOKEN>)
curl -s -X POST -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:<PORT>/open-graph -o /dev/null -w "%{http_code}\n"
# Expected: 204
```

Debug profiles
- Run Extension (Dev MCP)
  - Starts the combined watch tasks and sets CONSTELLATION_SERVER_ID=constellation-mcp-dev so user config writes to the dev namespace.
- Run Extension
  - Uses the default namespace from settings (constellation.serverId).

Useful commands (palette)
- Constellation: Open user MCP config — Open ~/.kiro/settings/mcp.json.

Internal self-test
- On activation the extension performs a quick internal self-test to verify the MCP server boots. This is not exposed as a command palette action.

Packaging
```bash
npm run package
```
Produces a .vsix you can install. MCP config stores absolute paths to out/mcp.server.js; if the install location changes, reactivate the extension to upsert the path.

Gotchas
- Using __dirname in ESM: prefer fileURLToPath(import.meta.url) + dirname().
- Tests are excluded from the TS build (tsconfig exclude: src/test/**).

Onboarding mode (implementation map)
- Service: src/services/onboarding-mode.service.ts
  - Embedded template string (ONBOARDING_PERSONA_TEMPLATE)
  - Move ./.kiro/steering → ./.constellation/steering/backup/<timestamp> on enable
  - Write ./.kiro/steering/onboarding-guide.md
  - Restore from backup on disable with fallback to creating an empty ./.kiro/steering when no backup exists
  - Cleanup: remove backups on successful restore; otherwise leave ./.constellation/steering/backup present for manual review
  - Important: backups are stored outside ./.kiro/steering to avoid recursive nesting and ENAMETOOLONG
- Service: src/services/onboarding-walkthrough.service.ts
  - Plan commit and step execution helpers (open + highlight)
- UI: webview-ui/src/components/OnboardingModeToggle.tsx
- UI: webview-ui/src/components/OnboardingStatus.tsx
- Messaging: onboarding/* events (docs/events.md)

## UI Component Development

### Component Architecture
- **Single Responsibility**: Each component has one clear purpose
- **Type Safety**: All props and state use TypeScript interfaces
- **Performance**: Use `useMemo` and `useCallback` for expensive operations
- **Error Boundaries**: Implement error handling for async operations

### Focus Mode Development Patterns
- **Adjacency Maps**: Always use pre-computed adjacency maps for graph traversal
- **BFS Algorithms**: Implement cycle detection and depth limiting
- **Performance Monitoring**: Log operations that exceed 50ms threshold
- **Position Caching**: Maintain node positions during focus changes

### Service Layer Guidelines
- **Pure Functions**: Prefer pure functions for business logic
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Performance**: Monitor timing and implement optimizations

## Atomic Design System Development

### Component Creation Guidelines
- **Atoms First**: Start with the smallest reusable components
- **Composition Over Inheritance**: Build molecules by composing atoms
- **Accessibility**: Include ARIA attributes and keyboard navigation from the start
- **Consistent Props**: Use similar prop patterns across related components

### Development Workflow
1. **Identify Component Type**: Determine if it's an atom, molecule, or organism
2. **Define TypeScript Interface**: Clear prop definitions with proper types
3. **Implement Component**: Follow accessibility and performance guidelines
4. **Add Styling**: Component-specific CSS with consistent naming conventions
5. **Write Tests**: Unit tests for atoms, integration tests for molecules
6. **Document Usage**: Examples and integration patterns

### Git Metrics Integration Patterns
- **Service Integration**: Use `GitMetricsService` for data access
- **Loading States**: Always handle metrics loading and error states
- **Performance**: Cache metrics data and avoid unnecessary re-computation
- **UI Integration**: Display metrics in consistent formats across components

```typescript
// Example metrics integration pattern
const [metrics, setMetrics] = useState<FileGitMetrics90d | null>(null)
const [metricsReady, setMetricsReady] = useState(false)

useEffect(() => {
  loadMetricsForFile(filePath)
    .then(setMetrics)
    .finally(() => setMetricsReady(true))
}, [filePath])
```

### Viewport and Zoom Development
- **Coordinate Systems**: Understand Cytoscape vs DOM coordinate systems
- **Performance**: Throttle viewport change events to prevent excessive updates
- **State Management**: Maintain viewport state consistency across components
- **User Experience**: Provide visual feedback for zoom and pan operations

```typescript
// Example viewport handling pattern
const handleViewportChange = useCallback(
  throttle((bounds: ViewportBounds) => {
    setViewportBounds(bounds)
    onViewportChange?.(bounds)
  }, 100),
  [onViewportChange]
)
```
- **Testing**: Unit tests for all public functions

### Development Workflow
1. **Start UI development**: `npm run dev:ui` for hot reload
2. **Component changes**: Automatic rebuild and browser refresh
3. **Service changes**: Restart extension for service layer updates
4. **Performance testing**: Test with large graphs (1000+ nodes)

### Performance Considerations
- **Large Graphs**: Implement fan-out capping and visibility filtering
- **Memory Management**: Clean up event listeners and cache entries
- **Rendering**: Use `display:none` for hidden nodes (no DOM removal)
- **Layout Stability**: Maintain positions during focus operations


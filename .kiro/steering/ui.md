# Webview UI Development

## Purpose
Guide the agent in understanding and safely modifying the Preact-based webview UI components, styling, and frontend architecture. Focus on component patterns, performance optimizations, and proper messaging integration.

## Agent Behavior Guidelines
- **Component Safety**: Maintain Preact component lifecycle and prop type safety
- **Performance First**: Consider large graph rendering optimizations and memory cleanup
- **Messaging Protocol**: Follow established webview ↔ extension message patterns
- **Accessibility**: Ensure UI components are accessible and keyboard navigable
- **Error Boundaries**: Implement graceful error handling with user-friendly fallbacks

## Key Conventions
- **Component Naming**: PascalCase for components (e.g., `GraphCanvas.tsx`, `OnboardingStatus.tsx`)
- **State Management**: Use Preact hooks for local state, messenger service for extension communication
- **Styling**: Global CSS with component-scoped styling patterns
- **Message Types**: Follow established message type patterns in messenger service
- **Performance**: Cleanup Cytoscape instances and event listeners on unmount

## When in Doubt
- Always clean up resources (Cytoscape instances, event listeners) in useEffect cleanup
- Use performance flags for adaptive rendering based on graph size
- Provide loading states and progress feedback for operations >1 second
- Handle all error states gracefully with retry options
- Test with both small and large datasets to ensure performance

## Inclusion Rules

### Main Application Entry
```
webview-ui/src/main.tsx
```

### Core Components
```
webview-ui/src/components/App.tsx
webview-ui/src/components/Button.tsx
webview-ui/src/components/FocusBreadcrumb.tsx
webview-ui/src/components/GraphCanvas.tsx
webview-ui/src/components/GraphDashboard.tsx
webview-ui/src/components/GraphToolbar.tsx
webview-ui/src/components/OnboardingModeToggle.tsx
webview-ui/src/components/OnboardingStatus.tsx
```

### View Components
```
webview-ui/src/views/SidePanelView.tsx
```

### UI Services
```
webview-ui/src/services/extension-config.service.ts
webview-ui/src/services/file-type.service.ts
webview-ui/src/services/focus-mode.service.ts
webview-ui/src/services/graph-styles.service.ts
webview-ui/src/services/messenger.ts
```

### Type Definitions
```
webview-ui/src/types/vscode-webview.d.ts
```

### Styling
```
webview-ui/src/styles/global.css
```

### Build Configuration
```
webview-ui/vite.config.ts
webview-ui/tsconfig.json
```

**Why these files**: Complete UI component hierarchy, services for UI logic, styling, and build configuration. Excludes generated build outputs.

**Ranking applied**: Entry point first (main.tsx), then core components by dependency order, then services and configuration.

**Files included**: 17 files (under 20 limit)

## Notes
- Excluded `webview-ui/index.html` - static template file
- All TypeScript/TSX files for component development
- Includes build configuration for Vite + Preact setup
- Focus on interactive components and performance patterns
- Cytoscape.js integration patterns for graph visualization
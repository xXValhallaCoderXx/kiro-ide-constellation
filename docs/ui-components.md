# UI Components Architecture

## Overview

Kiro Constellation uses a modern Preact-based webview UI with Vite build system. The architecture separates concerns between components, services, and views while maintaining type safety and performance.

## Component Hierarchy

### Core Components

#### `App.tsx`
- **Purpose**: Root application component and routing
- **Responsibilities**: Global state management, error boundaries
- **Dependencies**: All view components and services

#### `GraphDashboard.tsx`
- **Purpose**: Enhanced graph visualization container with metrics and zoom controls
- **Responsibilities**: Graph data management, focus mode integration, impact analysis, UI orchestration
- **Key Features**:
  - Graph data loading and transformation
  - Focus mode state management with breadcrumb integration
  - Impact analysis integration and highlighting
  - Git metrics integration and display
  - Mini-map panel integration for viewport navigation
  - Zoom control stack for graph interaction
  - File info panel coordination and state management
  - Performance monitoring and optimization

#### `GraphCanvas.tsx`
- **Purpose**: Enhanced Cytoscape.js integration with viewport and zoom management
- **Responsibilities**: Graph visualization, user interactions, layout management, viewport tracking
- **Key Features**:
  - Cytoscape.js lifecycle management with proper cleanup
  - Advanced node/edge styling and interactions
  - Viewport change handling and bounds calculation
  - Zoom functionality with programmatic control
  - Delayed single-click handling to prevent conflicts with double-click
  - Performance optimizations for large graphs (1000+ nodes)
  - Event handling (click, double-click, hover, viewport changes)

#### `GraphToolbar.tsx`
- **Purpose**: Graph control interface
- **Responsibilities**: Graph actions, view controls, export functionality
- **Key Features**:
  - Scan triggers and progress display
  - View reset and refresh controls
  - Export and sharing functionality

#### `FocusBreadcrumb.tsx`
- **Purpose**: Focus mode navigation interface
- **Responsibilities**: Breadcrumb display, depth controls, navigation
- **Key Features**:
  - Clickable breadcrumb trail
  - Depth adjustment controls (+/-)
  - Reset functionality
  - Keyboard navigation support

#### `OnboardingModeToggle.tsx`
- **Purpose**: Persona mode switching interface
- **Responsibilities**: Mode selection, confirmation dialogs, status display
- **Key Features**:
  - Default/Onboarding mode toggle
  - Confirmation dialogs for mode switches
  - Status indicators and error handling

#### `OnboardingStatus.tsx`
- **Purpose**: Walkthrough progress display
- **Responsibilities**: Step tracking, progress indication, navigation controls
- **Key Features**:
  - Current step display
  - Progress bar visualization
  - Step navigation controls
  - Completion status

#### `Button.tsx`
- **Purpose**: Reusable button component with enhanced event handling
- **Responsibilities**: Consistent styling, accessibility, interaction states, event delegation
- **Key Features**:
  - Multiple style variants (primary, secondary, etc.)
  - Loading and disabled states
  - Enhanced event handling with proper delegation
  - Accessibility attributes and keyboard navigation

#### `FileInfoPanel.tsx`
- **Purpose**: File details and metrics display panel
- **Responsibilities**: File information display, Git metrics integration, dependency visualization
- **Key Features**:
  - File path and metadata display
  - Git metrics integration (commits, churn, authors)
  - Dependency degree visualization (in/out connections)
  - Relative time formatting for last modified dates
  - Loading states and error handling

### Atomic Design Components

#### Molecules (`webview-ui/src/components/molecules/`)

##### `ZoomControlStack.tsx`
- **Purpose**: Grouped zoom controls for graph interaction
- **Responsibilities**: Zoom in/out/fit functionality with consistent UI
- **Key Features**:
  - Vertical stack layout with accessibility grouping
  - Customizable button sizing and disabled states
  - ARIA labels and keyboard navigation support

##### `MiniMapPanel.tsx`
- **Purpose**: Mini-map visualization with viewport indicator
- **Responsibilities**: Graph overview display and viewport tracking
- **Key Features**:
  - Viewport rectangle calculation and positioning
  - Responsive scaling based on graph bounds
  - Visual feedback for current view area
  - Graceful handling of missing bounds data

##### `MetricsInline.tsx`
- **Purpose**: Horizontal display of multiple metrics with separators
- **Responsibilities**: Metric visualization with consistent formatting
- **Key Features**:
  - Automatic separator insertion between items
  - Support for color-coded metric variants (purple, green, neutral)
  - Responsive layout adaptation

##### `DataStatusCard.tsx`
- **Purpose**: Status display for data loading, errors, and empty states
- **Responsibilities**: User feedback for data operations
- **Key Features**:
  - Visual status indicators with appropriate icons
  - Error state with retry functionality
  - Loading animations and progress feedback

#### Atoms (`webview-ui/src/components/atoms/`)

##### `ButtonIcon.tsx`
- **Purpose**: Icon-based button with enhanced size handling
- **Responsibilities**: Consistent icon button interactions
- **Key Features**:
  - Customizable sizing with proper scaling
  - Accessibility attributes and ARIA labels
  - Multiple visual variants and states

##### `MetricBullet.tsx`
- **Purpose**: Small metric display with color-coded variants
- **Responsibilities**: Compact metric visualization
- **Key Features**:
  - Color-coded variants (purple, green, neutral)
  - Consistent typography and spacing
  - Semantic meaning through color coding

### View Components

#### `SidePanelView.tsx`
- **Purpose**: Main side panel interface with enhanced component integration
- **Responsibilities**: Layout management, component orchestration, state coordination
- **Key Features**:
  - Responsive layout with atomic design components
  - Enhanced component integration patterns
  - Improved state coordination between molecules and organisms

## Service Layer Architecture

### Core Services

#### `messenger.ts`
- **Purpose**: Webview-to-extension communication
- **Responsibilities**: Message routing, type safety, error handling
- **Key Features**:
  - Type-safe message posting
  - Event listener management
  - Error boundary integration

#### `focus-mode.service.ts`
- **Purpose**: Focus mode logic and algorithms
- **Responsibilities**: BFS traversal, adjacency management, performance optimization

#### `file-type.service.ts`
- **Purpose**: File type detection and icon mapping
- **Responsibilities**: File extension analysis, icon assignment, type categorization

#### `graph-styles.service.ts`
- **Purpose**: Cytoscape.js styling and layout configuration
- **Responsibilities**: Node/edge styling, layout algorithms, theme integration

#### `extension-config.service.ts`
- **Purpose**: Extension configuration access and management
- **Responsibilities**: Settings retrieval, configuration validation, defaults management

## Integration Patterns

### Git Metrics Integration

The UI components integrate with the Git metrics service to provide enhanced file information:

```typescript
// FileInfoPanel integration example
interface FileInfoPanelProps {
  nodeId: string
  node: { id: string; label: string; path: string } | null
  inDegree: number
  outDegree: number
  metrics?: FileGitMetrics90d    // Git metrics integration
  metricsReady?: boolean         // Loading state management
  onOpenFile: () => void
  onClose: () => void
}
```

**Key Integration Points:**
- **Metrics Display**: File commit count, churn, and author information
- **Relative Time Formatting**: Human-readable last modified timestamps
- **Loading States**: Graceful handling of metrics loading and errors
- **Visual Indicators**: Color-coded metrics based on activity levels

### Viewport and Zoom Integration

Enhanced graph interaction through coordinated viewport and zoom management:

```typescript
// GraphCanvas viewport integration
interface ViewportBounds {
  x1: number; y1: number; x2: number; y2: number
  w: number; h: number
}

// MiniMapPanel viewport display
interface MiniMapPanelProps {
  bounds?: ViewportBounds | null     // Graph bounds
  viewport?: ViewportBounds | null   // Current viewport
}
```

**Coordination Patterns:**
- **Viewport Tracking**: Real-time viewport bounds calculation and updates
- **Mini-map Synchronization**: Viewport rectangle display in mini-map
- **Zoom Control Integration**: Programmatic zoom with UI feedback
- **Performance Optimization**: Efficient viewport change handling

### Atomic Design Composition

Components follow atomic design principles for maintainable architecture:

```typescript
// Molecule composition example
export function ZoomControlStack({ onZoomIn, onZoomOut, onFit }: ZoomProps) {
  return (
    <div role="group" aria-label="Zoom controls">
      <ButtonIcon iconName="plus" ariaLabel="Zoom in" onClick={onZoomIn} />
      <ButtonIcon iconName="minus" ariaLabel="Zoom out" onClick={onZoomOut} />
      <ButtonIcon iconName="fullscreen" ariaLabel="Fit to screen" onClick={onFit} />
    </div>
  )
}
```

**Composition Benefits:**
- **Reusability**: Atoms can be composed into different molecules
- **Consistency**: Shared styling and behavior patterns
- **Accessibility**: Built-in accessibility at the atomic level
- **Maintainability**: Clear component hierarchy and responsibilities
- **Key Features**:
  - Graph adjacency building
  - Visibility computation with depth limiting
  - Breadcrumb formatting and management
  - Performance monitoring and optimization

#### `graph-styles.service.ts`
- **Purpose**: Cytoscape.js styling and layout management
- **Responsibilities**: Node/edge styling, layout algorithms, performance optimization
- **Key Features**:
  - Adaptive styling for different graph sizes
  - Performance-optimized layouts
  - Theme and color management
  - Animation and transition handling

#### `file-type.service.ts`
- **Purpose**: File type detection and icon management
- **Responsibilities**: File extension mapping, icon assignment, language detection
- **Key Features**:
  - File type classification
  - Icon and color assignment
  - Language-specific styling

#### `extension-config.service.ts`
- **Purpose**: Extension configuration access
- **Responsibilities**: Settings retrieval, configuration validation
- **Key Features**:
  - VS Code settings integration
  - Configuration caching
  - Type-safe configuration access

## Message Passing Architecture

### Webview → Extension Messages
```typescript
// Graph operations
messenger.post('graph/load')           // Request graph data
messenger.post('graph/scan')           // Trigger dependency scan
messenger.post('graph/open-file', { filePath })  // Open file in editor

// Onboarding operations  
messenger.post('onboarding/change-mode', { mode })  // Switch persona mode
messenger.post('onboarding/get-status')             // Get walkthrough status

// General operations
messenger.post('open-graph-view')      // Open graph visualization tab
```

### Extension → Webview Messages
```typescript
// Graph responses
messenger.on('graph/data', (data) => { ... })      // Graph data payload
messenger.on('graph/status', (status) => { ... })  // Scan progress updates
messenger.on('graph/error', (error) => { ... })    // Error notifications

// Onboarding responses
messenger.on('onboarding/mode-changed', (data) => { ... })  // Mode change confirmation
messenger.on('onboarding/status-update', (data) => { ... }) // Walkthrough progress
messenger.on('onboarding/finalize-complete', (data) => { ... }) // Completion notification
```

## State Management Patterns

### Component State
- **Local state**: Use `useState` for component-specific state
- **Derived state**: Use `useMemo` for computed values
- **Effect management**: Use `useEffect` for side effects and cleanup

### Cross-Component Communication
- **Props drilling**: For parent-child communication
- **Message passing**: For extension communication
- **Service layer**: For shared business logic

### Performance Optimization
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Lazy loading**: Dynamic imports for large components
- **Virtualization**: For large lists and graphs

## Development Guidelines

### Component Development
1. **Single Responsibility**: Each component should have one clear purpose
2. **Type Safety**: Use TypeScript interfaces for all props and state
3. **Error Boundaries**: Implement error handling for all async operations
4. **Accessibility**: Include ARIA attributes and keyboard navigation
5. **Performance**: Monitor render cycles and optimize expensive operations

### Service Development
1. **Pure Functions**: Prefer pure functions for business logic
2. **Error Handling**: Comprehensive error handling with user-friendly messages
3. **Performance**: Monitor operation timing and implement optimizations
4. **Testing**: Unit tests for all public functions
5. **Documentation**: JSDoc comments for all public APIs

### Styling Guidelines
1. **CSS Classes**: Use semantic class names with BEM methodology
2. **Responsive Design**: Support different panel sizes and orientations
3. **Theme Support**: Use CSS custom properties for theming
4. **Performance**: Minimize CSS bundle size and avoid expensive selectors

## Build System Integration

### Vite Configuration
- **Entry Point**: `webview-ui/src/main.tsx`
- **Output**: `out/ui/` directory
- **Assets**: Automatic asset optimization and bundling
- **Development**: Hot reload and fast refresh support

### TypeScript Integration
- **Configuration**: `webview-ui/tsconfig.json`
- **Type Checking**: Strict mode enabled
- **Path Mapping**: Absolute imports for services and components
- **Build Integration**: Type checking during build process

### Development Workflow
1. **Start UI development**: `npm run dev:ui`
2. **Build for production**: `npm run build:ui`
3. **Type checking**: Automatic during development
4. **Hot reload**: Automatic browser refresh on changes

## Testing Strategies

### Component Testing
- **Unit Tests**: Test component logic and rendering
- **Integration Tests**: Test component interactions
- **Visual Tests**: Screenshot testing for UI consistency
- **Accessibility Tests**: Automated accessibility checking

### Service Testing
- **Unit Tests**: Test individual functions and algorithms
- **Performance Tests**: Benchmark critical operations
- **Error Handling Tests**: Test error scenarios and recovery
- **Integration Tests**: Test service interactions

### End-to-End Testing
- **User Workflows**: Test complete user interactions
- **Message Passing**: Test webview-extension communication
- **Error Scenarios**: Test error handling and recovery
- **Performance**: Test with large graphs and datasets

## Performance Considerations

### Rendering Optimization
- **Virtual DOM**: Leverage Preact's efficient virtual DOM
- **Component Memoization**: Prevent unnecessary re-renders
- **Lazy Loading**: Load components on demand
- **Bundle Splitting**: Separate vendor and application code

### Memory Management
- **Event Listeners**: Proper cleanup in useEffect
- **Large Objects**: Efficient handling of graph data
- **Cache Management**: Automatic cleanup of stale data
- **Garbage Collection**: Minimize object creation in hot paths

### Network Optimization
- **Message Batching**: Batch multiple operations when possible
- **Compression**: Efficient data serialization
- **Caching**: Cache frequently accessed data
- **Error Recovery**: Robust error handling and retry logic
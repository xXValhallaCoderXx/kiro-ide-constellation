# Design Document

## Overview

This design transforms the existing GraphView component into a modern, layout-focused interface with a comprehensive toolbar and file-type-based node colorization. The solution maintains all current functionality while introducing a professional UI shell that prepares for future graph features.

The design follows a component-based architecture using Preact, with clear separation between layout orchestration (GraphDashboard), toolbar controls, canvas management, and styling services. All styling respects VS Code theme tokens for seamless integration.

## Architecture

### Component Hierarchy

```
GraphDashboard (new orchestrator)
├── GraphToolbar (new)
│   ├── Search Input (placeholder, read-only)
│   ├── Action Buttons (Fit, Reset, Layout dropdown)
│   ├── Filter Chips (file type filters)
│   └── Re-scan Button (existing functionality)
└── GraphCanvas (refactored wrapper)
    └── Cytoscape Container (existing)
```

### Service Layer

```
Services/
├── extension-config.service.ts (UI configuration)
├── file-type.service.ts (extension detection)
├── graph-styles.service.ts (Cytoscape styling)
└── messenger.ts (existing, unchanged)
```

### Data Flow

1. **Initialization**: GraphDashboard mounts and requests graph data via messenger
2. **Data Processing**: File extensions are extracted and added to node data
3. **Style Generation**: graph-styles.service generates Cytoscape stylesheet with color mappings
4. **Rendering**: GraphCanvas applies styles and renders with performance optimizations
5. **Interaction**: Toolbar actions (Re-scan) trigger existing messaging patterns

## Components and Interfaces

### GraphDashboard Component

**Purpose**: Top-level orchestrator that manages layout and state coordination

**Props**: None (receives data via messenger)

**State**:
- Graph data state (inherited from current GraphView)
- UI configuration flags for toolbar placeholders

**Layout**: Vertical flex container with:
- Fixed-height toolbar at top
- Flexible graph canvas area

### GraphToolbar Component

**Purpose**: Renders all toolbar controls with proper theming and accessibility

**Props**:
```typescript
interface GraphToolbarProps {
  onRescan: () => void
  nodeCount?: number
  edgeCount?: number
  isOptimized?: boolean
}
```

**Features**:
- Search input (read-only, styled with VS Code tokens)
- Action buttons (disabled placeholders with data-placeholder="true")
- Re-scan button (fully functional)
- Responsive layout with control wrapping

### GraphCanvas Component

**Purpose**: Manages Cytoscape instance with enhanced styling and cleanup

**Props**:
```typescript
interface GraphCanvasProps {
  data: GraphData
  isRendering: boolean
  onRenderingChange: (rendering: boolean) => void
}
```

**Enhancements**:
- File-type-aware node styling
- Proper cleanup on unmount
- Performance optimizations for large graphs



## Data Models

### Enhanced Node Interface

```typescript
interface Node {
  id: string
  label: string
  path: string
  language?: 'ts' | 'js' | 'tsx' | 'jsx' | 'json' | 'other'
  ext?: string // Added during processing
}
```

### UI Configuration

```typescript
interface UIConfig {
  toolbar: {
    searchEnabled: boolean // false for this iteration
    fitEnabled: boolean    // false for this iteration
    resetEnabled: boolean  // false for this iteration
    layoutEnabled: boolean // false for this iteration
    filtersEnabled: boolean // false for this iteration
  }
}
```

## Error Handling

### File Type Detection
- **Missing extension**: Falls back to 'other' type
- **Invalid paths**: Graceful handling with console warnings
- **Processing errors**: Continue with default styling

### Toolbar Interactions
- **Disabled controls**: Clear visual feedback with tooltips
- **Re-scan failures**: Existing error handling maintained
- **Responsive layout**: Graceful wrapping on narrow viewports

### Cytoscape Integration
- **Style application errors**: Fallback to default colors
- **Large graph handling**: Existing performance optimizations maintained
- **Memory management**: Enhanced cleanup procedures

## Testing Strategy

### Unit Testing
- **File type detection**: Test extension extraction for various path formats
- **Style generation**: Verify CSS variable usage and color mappings
- **Component rendering**: Test toolbar layout and responsive behavior

### Integration Testing
- **Message flow**: Verify Re-scan functionality remains unchanged
- **Theme integration**: Test with light/dark VS Code themes
- **Performance**: Validate no regression in large graph rendering

### Accessibility Testing
- **Keyboard navigation**: Verify focus order through toolbar controls
- **Screen readers**: Test aria-label and aria-disabled attributes
- **Color contrast**: Validate theme token usage meets accessibility standards

### Visual Testing
- **Responsive layout**: Test toolbar wrapping at various viewport sizes
- **Theme compatibility**: Verify appearance in light/dark/high-contrast themes
- **File type colors**: Validate color mappings across different node types

## Implementation Details

### File Type Color Mapping

```typescript
const FILE_TYPE_COLORS = {
  ts: 'var(--kiro-node-ts, #569CD6)',
  tsx: 'var(--kiro-node-tsx, #4FC1FF)', 
  js: 'var(--kiro-node-js, #E3D300)',
  jsx: 'var(--kiro-node-jsx, #FFBD45)',
  json: 'var(--kiro-node-json, #8DC891)',
  other: 'var(--kiro-node-other, #B180D7)'
}
```

### Cytoscape Style Integration

```typescript
// Enhanced node selector with file type support
{
  selector: 'node[ext = "ts"]',
  style: {
    'background-color': 'var(--kiro-node-ts, #569CD6)'
  }
}
```

### Responsive Toolbar Layout

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-editorWidget-background);
  border-bottom: 1px solid var(--vscode-widget-border);
}

@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    gap: 4px;
  }
}
```

### Performance Considerations

- **File type processing**: O(n) operation during data ingestion, cached in node data
- **Style generation**: Computed once per data load, reused for all nodes
- **Toolbar rendering**: Minimal re-renders using proper React/Preact patterns
- **Memory usage**: Enhanced Cytoscape cleanup prevents memory leaks

### Migration Strategy

1. **Phase 1**: Create new components alongside existing GraphView
2. **Phase 2**: Migrate GraphView logic into GraphCanvas wrapper
3. **Phase 3**: Replace GraphView with GraphDashboard in App.tsx
4. **Phase 4**: Remove old GraphView component

This approach ensures no disruption to existing functionality while enabling incremental testing and validation.
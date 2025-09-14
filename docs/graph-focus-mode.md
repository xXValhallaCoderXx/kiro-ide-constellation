# Graph Focus Mode

## Overview

Graph Focus Mode enables interactive drill-down exploration of dependency graphs through breadcrumb navigation and depth controls. Users can focus on specific nodes and their relationships, making large codebases more navigable and understandable.

## Core Features

### Interactive Navigation
- **Double-click to focus**: Click any node to focus on it and its immediate dependencies
- **Breadcrumb navigation**: Visual trail showing your exploration path with clickable navigation
- **Depth controls**: Adjust the depth of relationships shown (1-3 levels)
- **Reset functionality**: Return to full graph view at any time

### Performance Optimizations
- **Fan-out capping**: Limits display to 100 children per node to maintain performance
- **Cycle detection**: Prevents infinite loops in circular dependencies
- **Position caching**: Maintains node positions during focus changes for stable layouts
- **Performance monitoring**: Warns when operations exceed 50ms threshold

## User Interactions

### Basic Navigation
1. **Focus on a node**: Double-click any node in the graph
2. **Drill deeper**: Double-click a child node to make it the new focus
3. **Navigate back**: Click any breadcrumb to jump to that level
4. **Step back**: Press `Esc` to go back one level
5. **Reset view**: Click "Reset" to return to full graph

### Depth Controls
- **Increase depth**: Click `+` button to show more relationship levels
- **Decrease depth**: Click `-` button to show fewer relationship levels  
- **Depth display**: Shows current depth (1-3) or "All" for full graph

### Breadcrumb Navigation
- **Visual trail**: Shows path like `UserService.ts ▶ AuthController.ts ▶ Database.ts`
- **Clickable crumbs**: Click any breadcrumb to jump directly to that focus level
- **Smart labeling**: Uses file basenames with extension removal for clean display
- **Truncation**: Long paths are truncated in the middle to fit available space

## Integration with Impact Analysis

Focus Mode seamlessly integrates with the impact analysis feature:

1. **Automatic activation**: When impact analysis runs, Focus Mode automatically activates
2. **Source file focus**: The analyzed file becomes the focus root
3. **Impact visualization**: Affected files are highlighted within the focused view
4. **Combined navigation**: Use breadcrumbs to explore impact relationships
5. **Reset behavior**: Reset clears both focus and impact states

## Performance Characteristics

### Optimization Strategies
- **BFS traversal**: Efficient breadth-first search for relationship discovery
- **Adjacency mapping**: Pre-computed maps for fast neighbor lookup
- **Visibility filtering**: Uses `display:none` for hidden nodes (no DOM removal)
- **Layout stability**: Maintains existing positions during focus changes

### Performance Thresholds
- **Target response**: <50ms for focus operations on typical graphs
- **Fan-out limit**: 100 children maximum per node
- **Memory management**: Automatic cleanup of stale position cache entries
- **Large graph handling**: Graceful degradation for graphs >1000 nodes

## Technical Architecture

### Core Services
- **focus-mode.service.ts**: Core BFS algorithms and adjacency management
- **FocusBreadcrumb.tsx**: Breadcrumb navigation component
- **GraphDashboard.tsx**: Main integration point with focus state management

### Key Functions
- `buildAdjacency()`: Creates forward/reverse adjacency maps from graph data
- `computeVisible()`: BFS traversal with depth limiting and cycle detection
- `formatCrumb()`: Generates breadcrumb labels from file paths
- `validateRootNode()`: Ensures focus target exists in graph
- `cleanupPositionCache()`: Memory management for long-running sessions

### Message Flow
- Focus state managed entirely in webview (no extension communication required)
- Position updates sent to Cytoscape.js for layout management
- Performance metrics logged to console for monitoring

## Error Handling

### Common Issues
- **Stale breadcrumbs**: Automatic validation when jumping to breadcrumb levels
- **Empty children**: Graceful handling when focused node has no dependencies
- **Malformed data**: Comprehensive graph data validation before operations
- **Performance degradation**: Automatic warnings and fallback strategies

### Recovery Strategies
- **Invalid focus targets**: Falls back to full graph view
- **Corrupted state**: Reset functionality always available
- **Memory issues**: Automatic cache cleanup and garbage collection
- **Large graphs**: Fan-out capping and performance monitoring

## Development Guidelines

### Adding Focus Features
1. Extend `FocusLens` type for new relationship types
2. Update `computeVisible()` for new traversal patterns
3. Add corresponding UI controls in `FocusBreadcrumb.tsx`
4. Update performance monitoring for new operations

### Performance Considerations
- Always use adjacency maps for neighbor lookup
- Implement cycle detection for any traversal operations
- Monitor operation timing and warn on threshold violations
- Cache positions to maintain layout stability

### Testing Strategies
- Test with graphs of varying sizes (10, 100, 1000+ nodes)
- Verify breadcrumb navigation with deep hierarchies
- Test performance with high fan-out nodes
- Validate error handling with malformed data

## Limitations

### Current Constraints
- **Depth limit**: Maximum 3 levels of depth for performance
- **Fan-out limit**: 100 children maximum per node
- **Lens types**: Currently supports 'children' and 'parents' only
- **Layout**: No automatic re-layout during focus changes

### Future Enhancements
- **Advanced lenses**: Support for custom relationship filters
- **Saved views**: Ability to bookmark and restore focus states
- **Multi-focus**: Support for multiple simultaneous focus points
- **Smart layout**: Automatic layout optimization for focused views

## Troubleshooting

### Performance Issues
- **Slow focus operations**: Check graph size and fan-out ratios
- **Memory growth**: Monitor position cache size and cleanup frequency
- **Layout instability**: Verify position caching is working correctly

### Navigation Problems
- **Breadcrumbs not updating**: Check focus state management in GraphDashboard
- **Esc key not working**: Verify keyboard event listeners are attached
- **Reset not clearing**: Ensure both focus and impact states are cleared

### Integration Issues
- **Impact analysis conflicts**: Verify focus mode activates correctly with impact
- **Graph data problems**: Check graph validation and adjacency building
- **UI component errors**: Monitor console for React/Preact component issues
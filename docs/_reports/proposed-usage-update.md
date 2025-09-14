# Proposed Updates to docs/usage.md

## Current Issues
- No documentation for Graph Focus Mode usage
- Missing interactive navigation instructions
- No guidance on breadcrumb navigation or depth controls

## Proposed Additions

### Add new "Graph Focus Mode Usage" section:

```markdown
## Graph Focus Mode Usage

### Basic Navigation
1. **Open the graph view**: Click the Constellation icon in the Activity Bar
2. **Focus on a node**: Double-click any node in the graph to focus on it
3. **Explore dependencies**: The graph will show only the focused node and its immediate dependencies
4. **Drill deeper**: Double-click any child node to make it the new focus
5. **Navigate back**: Use the breadcrumb trail at the top to jump to previous levels
6. **Reset view**: Click "Reset" to return to the full graph

### Breadcrumb Navigation
- **Visual trail**: Shows your exploration path like `UserService.ts ▶ AuthController.ts ▶ Database.ts`
- **Click to jump**: Click any breadcrumb to jump directly to that focus level
- **Keyboard shortcut**: Press `Esc` to step back one level
- **Smart labels**: File names are cleaned up (extensions removed) for better readability

### Depth Controls
- **Adjust depth**: Use the +/- buttons next to the breadcrumbs to control relationship depth
- **Depth levels**: Choose from 1-3 levels of dependencies, or "All" for full graph
- **Real-time updates**: Depth changes are applied immediately without re-layout
- **Performance**: Higher depths may be slower on large graphs (automatic warnings provided)

### Integration with Impact Analysis
1. **Run impact analysis**: Use `#[constellation-mcp] constellation_impactAnalysis { "filePath": "src/index.ts" }`
2. **Automatic focus**: The graph automatically focuses on the analyzed file
3. **Highlighted relationships**: Affected files are highlighted within the focused view
4. **Combined navigation**: Use breadcrumbs to explore the impact relationships
5. **Reset behavior**: Reset clears both focus and impact highlighting

### Performance Tips
- **Large graphs**: Focus mode automatically caps fan-out at 100 children per node
- **Memory management**: Position cache is automatically cleaned up during long sessions
- **Performance monitoring**: Console warnings appear if operations take >50ms
- **Optimization**: Use lower depths (1-2) for better performance on large codebases
```

### Add to existing "Verify in Kiro" section:

```markdown
### Interactive Graph Exploration
- Open the side panel by clicking the Constellation icon in the Activity Bar
- Try double-clicking nodes to focus and explore dependencies
- Use breadcrumb navigation to move through your exploration history
- Adjust depth controls to see more or fewer relationship levels
- Test the reset functionality to return to full graph view
```

## Rationale
- **User onboarding**: New users need clear instructions for the interactive features
- **Feature discovery**: Many users may not discover double-click navigation without guidance
- **Integration clarity**: The relationship between impact analysis and focus mode needs explanation
- **Performance awareness**: Users should understand the performance characteristics and optimizations
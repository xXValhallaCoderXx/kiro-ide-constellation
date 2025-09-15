# Git Metrics Integration

## Overview

Kiro Constellation includes built-in Git metrics analysis that provides insights into file change patterns, author activity, and code churn over the last 90 days. This data enhances the dependency graph visualization with real-world usage patterns and helps identify high-activity areas of the codebase.

## Core Features

- **90-Day Analysis Window**: Tracks file changes over the last 90 days for relevant trend analysis
- **Comprehensive Metrics**: Commit count, churn (additions + deletions), author activity, and last modification timestamps
- **Automatic Generation**: Metrics computed in background during dependency scanning
- **UI Integration**: Metrics displayed in File Info Panel and graph node styling
- **Performance Optimized**: Efficient Git log parsing with workspace boundary validation

## Data Structures

### FileGitMetrics90d Interface

```typescript
interface FileGitMetrics90d {
  commitCount: number           // Number of commits affecting this file
  churn: number                // Total additions + deletions
  lastModifiedAt: number | null // Unix timestamp of last modification
  authorCount: number          // Number of unique authors
  primaryAuthor?: string       // Most frequent contributor (optional)
}
```

### GitMetricsEnvelope Structure

```typescript
interface GitMetricsEnvelope {
  version: 1                   // Schema version for compatibility
  horizonDays: number         // Analysis window (90 days)
  head: string | null         // Git HEAD commit at generation time
  repoRoot: string | null     // Git repository root path
  workspaceRoot: string       // VS Code workspace root
  generatedAt: string         // ISO timestamp of generation
  available: boolean          // Whether metrics are available
  metrics: Record<string, FileGitMetrics90d> // File path → metrics mapping
}
```

## Service Architecture

### GitMetricsService (`src/services/git-metrics.service.ts`)

#### Core Responsibilities
- **Git Command Execution**: Secure Git log parsing with workspace validation
- **Data Aggregation**: Efficient processing of Git history into structured metrics
- **File System Integration**: Metrics storage and retrieval from `.constellation/data/`
- **Error Handling**: Graceful fallbacks for repositories without Git history

#### Key Methods

```typescript
// Generate metrics for workspace
async function generateMetrics(workspaceRoot: string): Promise<GitMetricsEnvelope>

// Load existing metrics from disk
async function loadMetrics(workspaceRoot: string): Promise<GitMetricsEnvelope | null>

// Check if metrics are available and current
function areMetricsAvailable(envelope: GitMetricsEnvelope): boolean
```

## Integration Points

### File Info Panel Integration

The `FileInfoPanel` component displays Git metrics alongside dependency information:

```typescript
interface NodeInfoPanelProps {
  nodeId: string
  node: { id: string; label: string; path: string } | null
  inDegree: number
  outDegree: number
  metrics?: FileGitMetrics90d    // Git metrics integration
  metricsReady?: boolean         // Loading state
  onOpenFile: () => void
  onClose: () => void
}
```

**Displayed Metrics:**
- **Commit Activity**: Visual indicator of file change frequency
- **Churn Level**: Code stability indicator (high churn = frequent changes)
- **Last Modified**: Relative time display (e.g., "2d ago", "3w ago")
- **Author Count**: Collaboration indicator
- **Primary Author**: Main contributor identification

### Graph Visualization Enhancement

Git metrics enhance graph visualization through:

- **Node Styling**: High-churn files displayed with visual emphasis
- **Activity Indicators**: Recent changes highlighted in graph layout
- **Collaboration Patterns**: Multi-author files identified visually
- **Stability Metrics**: Low-churn files indicated as stable components

## Performance Considerations

### Efficient Git Processing
- **Targeted Queries**: Git log limited to 90-day window with file-specific filtering
- **Batch Processing**: Single Git command processes all files simultaneously
- **Workspace Boundaries**: Analysis restricted to workspace files only
- **Caching Strategy**: Metrics cached to disk with timestamp validation

### Memory Management
- **Streaming Processing**: Large Git logs processed incrementally
- **Data Compression**: Efficient storage format for metrics data
- **Lazy Loading**: Metrics loaded on-demand for UI components
- **Cleanup Patterns**: Automatic cleanup of stale metrics files

## Configuration and Customization

### Default Settings
- **Analysis Window**: 90 days (configurable via `HORIZON_DAYS`)
- **Output Location**: `.constellation/data/git-metrics.json`
- **Update Frequency**: Generated during dependency scanning
- **Git Command Timeout**: 30 seconds maximum execution time

### Workspace Integration
- **Git Repository Detection**: Automatic detection of Git repository root
- **Submodule Support**: Handles Git submodules within workspace
- **Branch Awareness**: Metrics reflect current branch history
- **Workspace Validation**: Ensures metrics only include workspace files

## Error Handling and Fallbacks

### Common Scenarios
- **No Git Repository**: Graceful fallback with `available: false`
- **Git Command Failures**: Error logging with user-friendly messages
- **Permission Issues**: Clear messaging for Git access problems
- **Large Repositories**: Timeout handling with progress indicators

### Recovery Patterns
```typescript
// Example error handling pattern
try {
  const metrics = await generateMetrics(workspaceRoot)
  return metrics
} catch (error) {
  console.warn('Git metrics generation failed:', error.message)
  return createEmptyEnvelope(workspaceRoot)
}
```

## Usage Examples

### Accessing Metrics in Components

```typescript
// Load metrics for file info display
const metrics = await loadMetrics(workspaceRoot)
const fileMetrics = metrics?.metrics[filePath]

if (fileMetrics) {
  console.log(`File has ${fileMetrics.commitCount} commits`)
  console.log(`Churn level: ${fileMetrics.churn}`)
  console.log(`Last modified: ${formatRelative(fileMetrics.lastModifiedAt)}`)
}
```

### Integration with Graph Data

```typescript
// Enhance graph nodes with metrics
const enhancedNodes = graphNodes.map(node => ({
  ...node,
  metrics: metricsData?.metrics[node.id],
  isHighActivity: (metricsData?.metrics[node.id]?.churn ?? 0) > 1000
}))
```

## Development Guidelines

### Adding Metrics Features
- Always validate workspace boundaries before Git operations
- Use workspace-relative paths for consistency with dependency data
- Provide loading states for async metrics operations
- Handle missing metrics gracefully with appropriate fallbacks

### Performance Testing
- Test with repositories of varying sizes (small, medium, large)
- Validate timeout handling with slow Git operations
- Monitor memory usage during metrics generation
- Verify UI responsiveness during background processing

### Security Considerations
- Git commands restricted to workspace boundaries
- No sensitive information logged or stored
- Proper error sanitization for user-facing messages
- Workspace validation prevents directory traversal

## Troubleshooting

### Common Issues

**Metrics Not Available**
- Verify Git repository exists in workspace
- Check Git command availability in PATH
- Ensure workspace has commit history within 90 days

**Performance Issues**
- Large repositories may require longer processing time
- Consider excluding large binary files from analysis
- Monitor Git command timeout settings

**Data Inconsistencies**
- Metrics reflect current branch history only
- File renames may affect historical tracking
- Submodule changes may not be fully captured

### Debug Information
- Check console logs for Git command errors
- Verify `.constellation/data/git-metrics.json` file creation
- Monitor Git command execution time and output

## Future Enhancements

### Planned Features
- **Configurable Time Windows**: Support for custom analysis periods
- **Team Analytics**: Aggregated team collaboration metrics
- **Trend Analysis**: Historical trend tracking and visualization
- **Integration Patterns**: Enhanced integration with impact analysis

### Extension Points
- **Custom Metrics**: Plugin system for additional Git metrics
- **Visualization Options**: Alternative display formats for metrics data
- **Export Capabilities**: Metrics export for external analysis tools
- **Real-time Updates**: Live metrics updates during development
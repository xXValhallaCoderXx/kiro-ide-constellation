# Dependency Scanning Integration

## Overview
Kiro Constellation includes built-in dependency-cruiser integration that automatically analyzes codebase dependencies and structure. This provides valuable insights into project architecture and helps identify potential issues.

## Automatic Scanning
- **Trigger**: Runs automatically on extension activation (background, non-blocking)
- **Target**: First workspace folder
- **Timeout**: 60 seconds maximum
- **Output**: `./.constellation/data/codebase-dependencies.json`

## Configuration Detection
The scanner intelligently detects and uses existing project configurations:

### Dependency-Cruiser Config
Auto-detects these config files in workspace root:
- `.dependency-cruiser.js`
- `.dependency-cruiser.cjs` 
- `.dependency-cruiser.mjs`
- `dependency-cruiser.config.js`
- `dependency-cruiser.config.cjs`

If found, uses `--config <path>`. Otherwise runs with `--no-config`.

### TypeScript Config
- Auto-detects `tsconfig.json` in workspace root
- Passes as `--ts-config <absolute-path>` when present
- Enables TypeScript-aware dependency analysis

## Default Exclusions
When running without a custom config, excludes these patterns:
- `node_modules`
- `dist`
- `out` 
- `build`
- `coverage`
- `.git`
- `.vscode`
- `.constellation`

## Manual Scanning
- **Command**: "Constellation: Scan Dependencies" (Command Palette)
- **Behavior**: Overwrites existing results file
- **Use Case**: Re-analyze after significant code changes

## Output Format
Results are written as JSON to `./.constellation/data/codebase-dependencies.json` containing:
- Module dependency graph
- Circular dependency detection
- Orphaned modules identification
- Dependency metrics and statistics

## Troubleshooting
- **Large repos**: May hit 60s timeout - consider narrower subfolder or custom excludes
- **Config errors**: Check debug console for "Dependency scan stderr:" messages
- **Missing results**: Ensure workspace has analyzable code files
- **Permission issues**: Verify write access to `./.constellation/data/` directory

## Integration Points
- **Service**: `src/services/dependency-cruiser.service.ts`
- **Activation**: Called from `src/extension.ts` on startup
- **UI**: Results can be visualized in webview dashboard components
- **Commands**: Registered in `package.json` contributions
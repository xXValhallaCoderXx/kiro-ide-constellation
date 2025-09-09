# Dependency Analysis

How the extension scans the workspace with dependency-cruiser, caches results, and builds data for visualization and symbol lookup.

## Overview

- Runner: `AnalysisService` (extension host)
- Tool: dependency-cruiser CLI (packaged in the extension)
- Output cache: `.constellation/data/graph-data.json` (workspace-relative)
- Graph: transformed to Cytoscape.js elements for the dashboard
- Symbols: in-memory index for quick lookups of definitions and importers

## Execution & Caching

1. On activation and via the `kiro-constellation.refreshDependencyGraph` command, the service attempts to read the cached JSON from `.constellation/data/graph-data.json`.
2. If the cache exists, it is processed immediately (no new scan).
3. If the cache is missing or unreadable, a new depcruise scan runs from the workspace root:
   - Binary: `<extensionPath>/node_modules/.bin/depcruise[.cmd]`
   - Target: `src` if present, otherwise `.`
   - Flags: `--output-type json`, `--exclude node_modules`, `--no-config` when no project config found
4. Raw JSON from stdout is saved back to `.constellation/data/graph-data.json` and then processed.

## Processing

The service centralizes processing through a helper that:

- Transforms depcruise JSON into Cytoscape elements (nodes and edges)
- Builds a symbol index mapping symbol → `{ definedIn?, importedBy[] }`

Both structures are cached in-memory for fast retrieval by the UI.

## Symbol Indexing

The symbol index prioritizes depcruise’s own JSON fields when available, and minimally falls back to a lightweight parse when symbols aren’t present:

- Preferred: Use `exports`/`exportedSymbols` on modules and `importedSymbols`/`imported`/`symbols` on dependencies.
- Fallback: If no symbols are found in the JSON, the service heuristically scans project source files to capture common patterns:
  - Exports: `export { A, B as C }`, `export function Foo`, `export class Bar`, `export const baz`, `export default function Name`
  - Imports: `import { A, B as C } from '...'`, `import Foo from '...'`
  - Skips: `node_modules` and namespace imports (`import * as ns from '...'`)

Notes

- The fallback is intentionally simple and does not resolve re-exports, type-only constructs, or advanced TS patterns. It’s a best-effort to ensure a non-empty index when depcruise output doesn’t include symbols.
- For richer symbol metadata, provide a dependency-cruiser config that emits symbol arrays consistently, and the fallback becomes unnecessary.

## Troubleshooting

- No depcruise binary: The extension expects the packaged binary under its own `node_modules`. Rebuild/package the extension if it’s missing.
- Empty symbol index: Ensure a cache exists or that the project config for depcruise emits symbol arrays. The fallback covers common cases, but complex patterns may require a proper depcruise configuration.

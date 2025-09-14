# Kiro Constellation — Impact Analysis (Phase 1) PRD

Author: Architect-Zero & Strategist-Zero
Date: 2025-09-14
Version: 1.0 (Phase 1)
Status: Scoped

1. Objective & Background

Developers need a fast, reliable way to understand the blast radius of a proposed code change. Constellation already scans the workspace with dependency-cruiser and renders a dependency graph in a Preact webview. This PRD specifies an MVP Impact Analysis flow that lets a developer ask Kiro “What is the impact of changing <file>?”, then instantly:
- Returns a machine-readable list of affected files, and
- Visually filters the graph to the impacted subgraph, highlighting the epicenter (source file),
- With a Reset View to return to the full graph.

This phase leverages existing building blocks:
- dependency-cruiser scan writes ./.constellation/data/codebase-dependencies.json
- Graph data transform and cytoscape rendering exist
- HTTP bridge from MCP → extension exists (open-graph endpoint)

2. Current State (Codebase Analysis)

- Scanning
  - runScan(context) in src/services/dependency-cruiser.service.ts
  - Outputs: <workspace>/.constellation/data/codebase-dependencies.json with an envelope: { version, generatedAt, workspaceRoot, depcruise }
- Graph data
  - loadGraphData(context) in src/services/graph-data.service.ts reads and transforms depcruise modules to GraphData { nodes, edges, meta }
  - Node IDs are workspace-relative paths; edges are directed from importer → imported file (source → target)
- UI (Preact)
  - GraphDashboard.tsx loads data, renders GraphToolbar + GraphCanvas
  - GraphCanvas.tsx uses Cytoscape with generated stylesheet; double-click node opens file via messenger
  - Button.tsx is a shared styled button; global CSS exists
- Messaging
  - webview-ui/src/services/messenger.ts defines graph/load, graph/open-file, graph/scan
  - Extension side src/services/messenger.service.ts handles graph/load, graph/scan, open-file
- MCP server / bridge
  - MCP tools: ping, echo (src/mcp.server.ts)
  - HTTP bridge supports POST /open-graph with bearer token (src/services/http-bridge.service.ts)

Key gap: No MCP tool for impact analysis, no extension endpoint to perform analysis, no UI filtering/highlighting flow.

3. Scope (Phase 1 MVP)

In scope
- MCP tool constellation_impactAnalysis(filePath: string)
- Extension HTTP endpoint to compute impact: POST /impact-analysis { filePath }
- Graph filtering in webview to show only impacted nodes/edges
- Visual highlight of epicenter (source file)
- Reset View control to restore the full graph
- End-to-end Kiro integration per demo script

Out of scope (Phase 1)
- “Dependents” analysis (reverse traversal). MVP focuses on children/dependencies traversal per spec.
- Cross-repo or multi-workspace analysis
- Advanced risk scoring or AI summary
- Persisted impact sessions or multiple simultaneous filters

4. User Stories

- IA-01 As a Developer, I ask Kiro for the impact of changing a file to understand which parts of the codebase will be affected before coding.
- IA-02 As a Developer, I see only the impacted subgraph and can visually identify the epicenter.
- IA-03 As a Developer, I can reset the view to the full graph quickly.

5. Success Criteria

- Kiro tool call returns a JSON list of affected files within 1s for small projects (< 200 nodes) and < 3s for medium (<= 1k nodes)
- Graph view auto-opens (if not open) and renders the filtered subgraph with the source visually distinct
- Reset View restores full graph and layout without reload
- No regressions to existing graph load/scan flow

6. Detailed Requirements

6.1 MCP Tool: constellation_impactAnalysis
- Name: constellation_impactAnalysis
- Input: filePath (string, workspace-relative), e.g. "src/services/user-service.ts"
- Behavior: On invocation, the MCP server forwards the request to the extension HTTP bridge endpoint /impact-analysis, receives the computed results and returns them to Kiro
- Return (example): { "affectedFiles": ["src/services/user-service.ts", "src/controllers/user-controller.ts", "src/routes/user-routes.ts"] }
- Error cases:
  - File not found in graph → return { affectedFiles: [] } with the original file included if it exists on disk; also include a message string in a secondary field for Kiro to summarize
  - No dependency data available → instruct user to run a scan (consistent with existing error messaging)

6.2 Extension HTTP Bridge
- Endpoint: POST /impact-analysis
- Auth: Same bearer token as /open-graph
- Request body: { filePath: string }
- Response body: { affectedFiles: string[] }
- Side effects:
  - Execute command to open/reveal the Graph view (constellation.openGraphView)
  - Immediately dispatch a message to the webview to filter/highlight the impacted subgraph

6.3 Graph Filtering & Visualization (Webview)
- On receiving the impact message, the graph filters to show only nodes in affectedFiles and all edges where both endpoints are in affectedFiles
- Epicenter node (filePath) is visually distinct (larger size and bright halo/border)
- Reset View button restores the full project graph without reloading the page
- Performance considerations: For large graphs, the filtered subgraph is typically small; still use the existing rendering optimizations

6.4 End-to-End Flow (Demo Script)
1) User: “What is the impact of changing src/services/user-service.ts?”
2) Kiro: Calls constellation_impactAnalysis({ filePath: "src/services/user-service.ts" })
3) Extension:
   - Computes impact and returns affectedFiles to Kiro
   - Opens the Graph view
   - Sends impactedFiles to webview → webview filters and highlights epicenter
4) Kiro: “Changing user-service.ts will affect user-controller.ts and user-routes.ts. Here is a visual of the impact.”

7. Technical Design

7.1 Traversal definition
- Direction: “children” (dependencies) traversal. Start at source file node; follow outgoing edges (importer → imported) transitively.
- Input normalization: filePath is workspace-relative. The traversal uses GraphData node IDs (also workspace-relative) so the input must be normalized to match IDs.
- Include the origin: affectedFiles must include the original filePath.

7.2 Algorithm
- Build adjacency from transformed GraphData(edges): map<string, string[]> where map[srcId] = [targetId...]
- BFS/DFS from sourceId across adjacency; visited set prevents cycles
- Result set = { sourceId } ∪ all reachable targetIds
- Convert to array for affectedFiles; maintain stable order by BFS discovery

7.3 Data sources
- Reuse loadGraphData(context) to ensure depcruise JSON is present; it can trigger runScan(context) if missing and poll for completion (existing logic)
- Caching: For phase 1, compute adjacency on each request. Optionally cache GraphData in-memory keyed by generatedAt to avoid rebuilds

7.4 Contracts & Interfaces

7.4.1 MCP tool registration (server)
- Register constellation_impactAnalysis with zod schema { filePath: z.string() }
- Implementation pattern:
```ts path=null start=null
server.registerTool(
  "constellation_impactAnalysis",
  {
    title: "Impact Analysis",
    description: "Traverses dependencies (children) from a source file and returns affected files.",
    inputSchema: { filePath: z.string() },
  },
  async ({ filePath }) => {
    const port = process.env.CONSTELLATION_BRIDGE_PORT;
    const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
    if (!port || !token) {
      return { content: [{ type: "text", text: JSON.stringify({ affectedFiles: [] }) }] };
    }
    const res = await fetch(`http://127.0.0.1:${port}/impact-analysis`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath }),
    });
    const json = await res.json().catch(() => ({ affectedFiles: [] }));
    // Prefer returning JSON content if supported
    return { content: [{ type: "json", json }] };
  }
);
```

7.4.2 HTTP bridge (extension) endpoint
- New route in src/services/http-bridge.service.ts:
  - POST /impact-analysis
  - Parse JSON body
  - Validate token and method
  - Call computeImpact(context, filePath) → { affectedFiles }
  - Side effects: open Graph view, send message to it
  - Respond 200 with JSON

7.4.3 Extension command for UI message fan-out
- Add command id: constellation.showImpact
- Handler signature: (payload: { sourceFile: string; affectedFiles: string[] })
- Behavior:
  - Ensure Graph panel exists (open if needed)
  - Post message to webview: { type: 'graph/impact', payload }
- Rationale: decouples HTTP bridge from panel reference and centralizes UI messaging in extension.ts

7.4.4 Messaging protocol changes
- Extension → Webview (new):
  - graph/impact: { payload: { sourceFile: string; affectedFiles: string[] } }
  - graph/resetImpact: {} (optional, or reuse graph/load to restore full graph)
- Webview → Extension (unchanged in phase 1): graph/load, graph/open-file, graph/scan

7.4.5 Webview UI changes
- GraphDashboard.tsx
  - Maintain fullGraph state and optional impact state
  - On graph/data: set fullGraph
  - On graph/impact: compute filteredGraph = subgraph(fullGraph, affectedFiles); set impact state { sourceFile }
  - Pass filteredGraph and impactSourceId into GraphCanvas
  - Add Reset View button (reuse shared Button.tsx) that clears impact state and re-renders fullGraph
- GraphCanvas.tsx
  - Accept optional props: impactSourceId?: string
  - When building elements, if impactSourceId is set, set data: { isSource: true } on that node
  - Stylesheet: add rule for node[isSource = true] to enlarge and add halo/border
- GraphToolbar.tsx
  - Replace placeholder Reset with a functional Reset View button; Fit remains placeholder

8. File-by-file Implementation Plan (Phase 1)

- src/services/impact-analysis.service.ts (new, kebab-case)
  - export async function computeImpact(context: vscode.ExtensionContext, filePath: string): Promise<{ affectedFiles: string[] }>
  - Use loadGraphData to get GraphData; build adjacency; BFS; return list including source
- src/services/http-bridge.service.ts
  - Add POST /impact-analysis route; parse body; call computeImpact; execute vscode.commands.executeCommand('constellation.openGraphView'); then vscode.commands.executeCommand('constellation.showImpact', payload)
- src/extension.ts
  - Register command constellation.showImpact; ensure singleton graph panel open and post message to webview: { type: 'graph/impact', payload }
  - No change to activation flow besides command registration
- src/services/messenger.service.ts
  - Extend GraphOutboundMessage union with { type: 'graph/impact'; payload: { sourceFile: string; affectedFiles: string[] } }
- src/mcp.server.ts
  - Register constellation_impactAnalysis tool as in 7.4.1
- webview-ui/src/services/messenger.ts
  - Extend types to include 'graph/impact'
- webview-ui/src/components/GraphDashboard.tsx
  - Handle 'graph/impact' message, filter graph, set epicenter, show Reset View
- webview-ui/src/components/GraphCanvas.tsx
  - Accept impactSourceId prop; add data.isSource; update stylesheet handling
- webview-ui/src/services/graph-styles.service.ts
  - Add style rule for epicenter, e.g., halo effect (border + glow)
- package.json (contributes.commands)
  - Ensure constellation.showImpact is registered with a title (not necessarily visible in palette)

9. Visual Spec (Phase 1)

- Impacted subgraph only: all other nodes/edges hidden
- Epicenter styling (example):
  - Node size: +30%
  - Border: 3px #FF8C00 + subtle box-shadow halo
- Reset View button in toolbar row 1 (right side)

10. Error Handling & Edge Cases

- File not present in GraphData:
  - If a file exists on disk but wasn’t scanned, trigger a scan (optional, Phase 1 can return empty set and a message)
- Missing dependency file:
  - Reuse loadGraphData behavior (it can run scan and poll up to 30s)
- Case sensitivity:
  - Normalize to workspace-relative paths via path.relative(workspaceRoot, absolute)
- Very large graphs:
  - Filtering dramatically reduces displayed size; performance likely fine

11. Telemetry & Security

- Security
  - HTTP bridge endpoint remains loopback + token-protected
  - No secrets are logged; inputs are workspace-relative file paths
- Telemetry
  - None in Phase 1

12. Testing Plan

- Unit
  - computeImpact: BFS correctness on synthetic GraphData with cycles and multiple branches
  - http-bridge: route parsing and auth
  - mcp.server: tool registration and response formatting
- Integration
  - With a sample workspace, run impact on a file with known dependencies; assert returned JSON and webview filter message emitted
  - Commands: constellation.openGraphView + constellation.showImpact sequencing
- Manual/UX
  - Confirm visual highlight and Reset View
  - Confirm double-click open-file still works in filtered mode

13. Rollout

- Feature flag: none required; Phase 1 is additive
- Docs: Update README usage and add short demo steps
- Demo script alignment: matches Section 6.4

14. Open Questions

- Should MVP also support “dependents” blast radius (reverse traversal)? If yes, add a flag: mode: 'dependencies' | 'dependents'. Default: 'dependencies'.
- If scan is stale (generatedAt old), should impact auto-trigger re-scan or show a warning?

Appendix A — Pseudocode

Traversal
```ts path=null start=null
function computeImpactFromGraph(graph: GraphData, sourceId: string): string[] {
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }
  const visited = new Set<string>();
  const out: string[] = [];
  const q: string[] = [];
  if (!visited.has(sourceId)) { visited.add(sourceId); out.push(sourceId); q.push(sourceId); }
  while (q.length) {
    const cur = q.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!visited.has(nxt)) { visited.add(nxt); out.push(nxt); q.push(nxt); }
    }
  }
  return out;
}
```

Appendix B — Message Shapes
```ts path=null start=null
// Extension → Webview
{
  type: 'graph/impact',
  payload: { sourceFile: string; affectedFiles: string[] }
}

// Webview → Extension (existing)
{ type: 'graph/load' } | { type: 'graph/scan' } | { type: 'graph/open-file', path: string }
```


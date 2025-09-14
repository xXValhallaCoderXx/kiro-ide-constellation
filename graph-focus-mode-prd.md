# Graph Focus Mode PRD — Drill‑Down Views for Constellation

Status: Draft
Owner: You + Agent Mode
Date: 2025-09-14
Scope: Add “focus and drill‑down” viewing to the existing graph webview. P0 is children‑only lens with breadcrumb navigation and reset. No backend scan changes.

1) Objectives (P0)
- Double‑click any node to focus on that node and its children (depth 1).
- Repeat double‑click to drill deeper (root becomes the clicked child).
- Breadcrumb bar to jump back; Esc to go back one level; Reset to show full graph.
- Keep the current layout stable (no full re-layout) and center the current root.
- Compute and apply visibility quickly (<50ms for medium graphs; depth ≤3 in future).

Non‑goals (P0)
- Parents lens (inbound edges), siblings view, clustering, shortest path, or command palette.
- Server-side data changes or new dependency scans.
- Changing the current impact analysis behavior.

2) Shared language (aligns with your draft)
- Lens: children = outgoing edges (A → B when A imports B). P0 uses children only.
- Root: the currently focused node id.
- Depth: hop count from root (P0 fixed at 1; P1: 1–3 slider).
- Drill: set root to a node by double‑clicking.
- Crumb: an item describing a view state { root, depth, lens, label }.

3) Current codebase notes (what we build on)
- Data enters webview via 'graph/data' message as GraphData { nodes, edges, meta }.
- GraphCanvas.tsx constructs Cytoscape anew when data changes; otherwise it can be operated imperatively via cyRef.
- Node data includes: id (workspace‑relative path), label, path, language, ext (added in UI), role markers, and flags (isSource/fromSource) used by impact mode.
- We can perform focus filtering fully on the client using adjacency maps derived from the received GraphData.

4) State model (webview, P0)
- Full graph (immutable snapshot): GraphData + precomputed adj maps
  - forwardAdj: Map<string, string[]> — source → direct children
  - reverseAdj: Map<string, string[]> — reserved for parents lens (P1)
- View state (mutates with interactions):
  - root: string | null (focused node id)
  - depth: number (P0 fixed 1; P1 allow 1–3)
  - lens: 'children' (P0) | 'parents' (P1)
  - visibleNodes: Set<string>
  - visibleEdges: Set<string>
  - crumbs: Array<{ root: string; depth: number; lens: 'children'|'parents'; label: string }>
  - backstack (optional): string[] — for Esc history separate from crumbs (stretch)

5) Core operations (deterministic)
- buildAdjacency(graph: GraphData): { forwardAdj, reverseAdj }
- computeVisible(root: string, depth: number, lens: 'children'|'parents')
  - BFS over forwardAdj (or reverseAdj when enabled), up to depth hops
  - Returns { visibleNodes: Set<string>, visibleEdges: Set<string> }
- applyView({ visibleNodes, visibleEdges })
  - Uses cy.batch to style or hide non‑visible elements
- Two strategies (selectable by constant; default = displayNone):
-    - displayNone: set style 'display' to 'none' for non‑visible (default for performance)
-    - dimmed: add class 'dimmed' (opacity 0.2, pointer‑events none)
-  - Keep positions; do not run a global layout
- drillTo(nodeId)
  - Computes new visible sets, pushes crumb, applies view, centers root
- pushCrumb(view) / popToCrumb(index) / popLast()
  - Always recompute from full graph to avoid cumulative drift

6) UI/UX
6.1 Interactions
- Double‑click node → drillTo(nodeId) with depth=1, lens='children'
- Single‑click node → select (no view change)
- Esc → pop back one crumb (only when breadcrumbs exist)
- Breadcrumb click → jump to that crumb; truncate later crumbs
- Reset → clear crumbs; return to full graph view

6.2 Breadcrumb bar (new component)
- Location: top of the graph content, below the toolbar, above the canvas
- Content: Root ▶ Child ▶ Grandchild (labels use file basenames; truncate in the middle if too long)
- Controls: each crumb is clickable; a Reset pill at the end; P1 adds small +/- buttons for depth (1–3) near the breadcrumbs
- Accessibility: keyboard focusable; Esc mapped to back

6.3 Emphasis & hints
- Root: halo ring + thicker border (reuse halo styles used for isSource, with a neutral color)
- Direct children: slightly thicker border
- Optional small chip in the toolbar row (right side) showing counts: depth=1 • nodes=X • edges=Y

6.4 Layout behavior
- No global re-layout on drill
- Center current root (cy.center(root) and optional cy.animate with 150–200ms duration)
- Optional short “local settle” (P1): apply a brief layout only on visible nodes with randomize:false and small iterations; keep as a constant off by default
- Cache positions by node id so returning to previous crumbs is instant

7) Edge cases
- Root not found (stale crumb or filtered out): show toast in UI and reset to full graph
- Root with 0 children: show inline empty state (“No children at depth 1”), keep Reset visible
- Extreme fan‑out (node with >100 children): cap at N=100 and show a small badge “+ N more”; provide a temporary “show all” button (P1)
- Cycles: handle with visited set during BFS

8) Performance budget & instrumentation
- computeVisible with depth ≤3 should be O(V+E) but touch only a small neighborhood; target <10ms for medium repos
- applyView should update styles inside a single cy.batch
- Log timings to console only when >50ms (guarded by DEBUG flag)

9) Technical design (files & APIs)
Note: follow kebab-case naming and keep Preact + shared Button.

New (webview-ui/)
- src/services/focus-mode.service.ts
  - export type FocusLens = 'children'|'parents'
  - export function buildAdjacency(graph: GraphData): { forwardAdj: Map<string,string[]>; reverseAdj: Map<string,string[]> }
  - export function computeVisible(args: { forwardAdj: Map<string,string[]>; reverseAdj: Map<string,string[]>; root: string; depth: number; lens: FocusLens; maxChildren?: number }): { visibleNodes: Set<string>; visibleEdges: Set<string> }
  - export function formatCrumb(graph: GraphData, root: string, depth: number, lens: FocusLens): { root, depth, lens, label: string }

- src/components/focus-breadcrumb.tsx
  - Props: { crumbs: Crumb[]; onJump(index: number); onReset() }
  - Renders horizontal list with chevrons and Reset button (uses shared Button)

Changes
- src/components/GraphCanvas.tsx
  - Add an imperative API via ref or callbacks from props:
    - applyFocusView({ visibleNodes, visibleEdges, rootId })
    - centerOn(rootId: string, options?: { animate?: boolean })
    - getPositions(): Record<string, { x:number; y:number }>
    - setPositions(pos: Record<string, { x:number; y:number }>)
  - Wire double‑click to call onNodeDrill(id) prop if provided
  - Implement visibility updates with cy.batch and style 'display' or dim class

- src/components/GraphDashboard.tsx
  - Build adjacency maps on 'graph/data' arrival and cache alongside fullGraphData
  - Keep focus view state and crumbs; pass handlers to GraphCanvas
  - Add keydown listener for Esc to pop crumb
  - Render <FocusBreadcrumb /> above canvas when crumbs.length > 0
  - Provide Reset Focus button in toolbar when active (can reuse existing reset area)

- src/styles/global.css
  - .focus-crumbs, .focus-crumb, .focus-crumb-sep, .focus-reset
  - .cy-dimmed { opacity: 0.2; pointer-events: none }
  - .cy-hidden { display: none }
  - Root/children emphasis classes (reuse halo from isSource with neutral color)

10) Message contracts
- P0 is fully client‑side once 'graph/data' is loaded. No new extension messages required.
- Deferred (not in P0/P1): command to open graph already focused on a specific file.

11) UX flows (P0)
A) Drill once
- User double‑clicks node X
- View sets root = X, depth = 1, lens = children
- computeVisible() returns N nodes / M edges
- applyView() hides others, centers X; breadcrumb shows “X” and Reset

B) Drill deeper
- User double‑clicks child Y
- pushCrumb({root:X}) then drillTo(Y)
- Breadcrumb shows “X ▶ Y”

C) Back / Reset
- Esc pops to previous crumb (Y → X)
- Reset clears crumbs and shows full graph

12) Acceptance criteria (P0)
- Double‑click focuses on node and shows only its outgoing neighborhood at depth 1
- Breadcrumb renders correctly, supports jump and reset
- Esc pops one level back when there is a previous crumb
- Layout remains stable; only the view filters change; the root is centered
- Performance: compute+apply under 100ms for 1k‑node graph (typical case far less)
- No extension changes required; impact view continues to work unchanged

13) Rollout plan
- F0: Scaffolding (service + adjacency + minimal applyView that dims non‑visible; no breadcrumbs yet)
- F1: Breadcrumbs + Esc + Reset + displayNone strategy
- F2: Position cache + center animation + small counts chip
- F3 (P1): depth controls via +/- buttons (1–3), parents lens toggle, cap “+N more” with show‑all
- F4 (deferred): open‑focused via command/message (skipped per decision)

14) Decisions (based on your feedback)
- Visibility strategy: display:none by default (dim mode remains available behind a flag).
- Depth controls (P1): use small +/- buttons near breadcrumbs (range 1–3, default 1).
- Fan‑out threshold: cap at 100 children; show “+N more”.
- Esc behavior: only triggers Back when breadcrumbs exist.
- Open‑focused command: skip for now (deferred beyond P1).

15) Implementation checklist (file-oriented)
- webview-ui/src/services/focus-mode.service.ts (new): adjacency + BFS + helpers
- webview-ui/src/components/focus-breadcrumb.tsx (new): crumbs UI
- webview-ui/src/components/GraphCanvas.tsx: imperative API + double‑click handler + visibility classes
- webview-ui/src/components/GraphDashboard.tsx: focus state, handlers, Esc, render breadcrumb, Reset Focus integration
- webview-ui/src/styles/global.css: focus classes & breadcrumb styles
- Tests (optional now): unit for computeVisible and crumbs ops

16) Risks & mitigations
- Large graphs: ensure we do not recreate Cytoscape for focus changes; use cy.batch and style updates only
- Interaction clash: existing double‑click opens files today — keep double‑click in GraphCanvas for focus; move file open to modifier (e.g., Alt+double‑click) or switch: single‑click select, Enter to open (we can confirm preference)
- Visual churn: prefer center/animate with short duration; avoid full layout reflows

17) Appendix: pseudo‑APIs

Focus compute
```ts
export function computeVisible({ forwardAdj, reverseAdj, root, depth, lens, maxChildren = 100 }) {
  const visibleNodes = new Set<string>();
  const visibleEdges = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; d: number }> = [{ id: root, d: 0 }];
  visited.add(root); visibleNodes.add(root);
  while (queue.length) {
    const { id, d } = queue.shift()!;
    if (d === depth) continue;
    const nexts = (lens === 'children' ? forwardAdj : reverseAdj).get(id) ?? [];
    let count = 0;
    for (const to of nexts) {
      if (count++ >= maxChildren) break;
      visibleEdges.add(`${id}->${to}`); // or look up real edge ids by map
      if (!visited.has(to)) { visited.add(to); visibleNodes.add(to); queue.push({ id: to, d: d + 1 }); }
    }
  }
  return { visibleNodes, visibleEdges };
}
```

Canvas imperative API (illustrative)
```ts
applyFocusView({ visibleNodes, visibleEdges, rootId }) {
  cy.batch(() => {
    cy.nodes().forEach(n => n.addClass('cy-hidden'));
    cy.edges().forEach(e => e.addClass('cy-hidden'));
    cy.nodes().filter(n => visibleNodes.has(n.id())).removeClass('cy-hidden');
    cy.edges().filter(e => visibleEdges.has(e.id())).removeClass('cy-hidden');
  });
  cy.center(cy.$id(rootId));
}
```


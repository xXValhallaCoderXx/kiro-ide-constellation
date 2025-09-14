# Feature Roadmap PRD — Constellation Graph

Status: Draft
Owner: You + Agent Mode
Date: 2025-09-14
Scope: Graph feature enhancements only (UI/UX + analysis within current data model). No breaking changes to scanning pipeline.

1) Goals
- Make the graph more actionable for navigation, architecture insight, and risk awareness.
- Keep performance acceptable for medium/large repos (hundreds to low-thousands of nodes).
- Build features in small, independently releasable slices.

Non‑goals
- Replacing dependency-cruiser or Cytoscape.
- Full-blown static analysis or type-aware refactoring.
- Cloud services or outbound network calls.

2) Current architecture summary (relevant)
- Data: GraphData in extension (src/services/graph-data.service.ts) -> nodes/edges with id, label, path, kind.
- UI: Preact webview with GraphDashboard.tsx + GraphCanvas.tsx (Cytoscape).
- Messaging: messenger.ts (webview) <-> message-router.service.ts (extension).
- Impact Analysis: computeImpact() BFS in src/services/impact-analysis.service.ts, delivered as graph/impact payload.

3) Proposed features (planning‑ready blurbs)

Already proposed by you
A. Criticality score
- What: Single risk indicator per file.
- Why: Surface hotspots where changes are costliest.
- How (v1): score = normalize(fanIn) * log1p(gitChurn30d). Fallback to fanIn if churn unavailable.
- UX: Color ramp node outline; score on hover; Hotspots list sorted by score.
- Tech: fanIn from GraphData indegree; churn via git log --since=30.days --name-only. Cache in workspaceStorage.
- Acceptance: Score visible on hover; legend shows ramp; hotspots list opens top 10.

B. Module clustering
- What: Group nodes by folder/package; expand/collapse.
- Why: Reduces clutter; surfaces architecture.
- How (v1): Cluster by first 1–2 path segments; collapse to super-nodes with badge (count) and aggregated edges.
- UX: Double‑click expand; Shift+double‑click collapse; tooltip shows cluster size + avg criticality.
- Tech: Build cluster map in UI; Cytoscape parent/compound nodes; aggregation done client‑side.
- Acceptance: Collapse/expand works; edges re‑render aggregated; counts correct.

C. What changed recently (churn lens)
- What: Git freshness overlay.
- Why: Recently touched code is usually riskier/active.
- How (v1): git log --since=30.days --name-only -> per-file commit counts -> brightness ramp; bins on a simple legend.
- UX: Toggle in toolbar; 7/30/90d quick presets.
- Tech: Spawn git via Node (extension), send per-id counts to webview. No pager; cache for a session.
- Acceptance: Toggle changes visuals; legend displays counts; performance acceptable on medium repos.

D. Policy hints
- What: Lightweight architectural rules with violations.
- Why: Make boundaries explicit early.
- How (v1): JSON in .kiro/constellation/policy.json with rules like { from: "feature/**", notImport: "app/**" } using glob/minimatch.
- UX: Dashed red edges for violations; “Violations (N)” chip opens list and step‑through.
- Tech: Evaluate edges in extension after scan (cheap); annotate edges with violation=true.
- Acceptance: At least one rule type works (notImport); Violations list navigable; edges styled.

E. Breadcrumbs & backstack
- What: Trail of graph states + Back.
- Why: Explore without getting lost.
- How (v1): On focus/filter/lens change, push { focus, lens, params } to stack (size 10) in UI state; flat breadcrumb string for display.
- UX: Breadcrumb bar: “UserService.ts › Consumers d≤2”; Esc = Back; click to jump.
- Acceptance: Back works; breadcrumb labels make sense; survives view hide/show.

F. Legend
- What: Always‑visible key for colors, depths, styles.
- Why: Turn visuals into meaning.
- How (v1): Compact pill anchored top‑right; toggles layers; small counters (e.g., d1:7 • d2:14).
- Acceptance: Legend visible; toggle layers (e.g., churn/criticality) on/off changes view.

G. Keyboard palette
- What: In‑webview command palette.
- Why: Speed + discoverability.
- How (v1): Ctrl/Cmd+K opens fuzzy command list; actions: Focus current file, Consumers, Imports, Depth ±1, Find cycles, Shortest path, Reset, Export.
- Acceptance: Palette opens; fuzzy match; actions execute.

High‑value additions (feasible next)
H. Shortest path + focus inspector
- What: Show shortest import path between two files; summarize the path.
- Why: Explain “why are A and B connected?”.
- How: BFS on DAG-ish graph (unweighted). For multiple, show first found; offer “next path” if requested.
- UX: Command palette action or context menu; highlights the path with distinct color.
- Acceptance: Path highlight appears; list of nodes in path is readable; clear Reset.

I. Cycle detection & SCC view
- What: Detect cycles and group strongly connected components.
- Why: Cycles complicate refactors; must‑know hotspots.
- How: Tarjan or Kosaraju in extension; annotate nodes with sccId and size.
- UX: “Cycles (N)” chip opens list; clicking highlights SCC; optional “Break suggestions” list = top edges by low weight.
- Acceptance: Detects non‑trivial SCCs; can highlight them; performance OK.

J. Depth lens (expand/contract neighborhood)
- What: Adjustable neighborhood radius around a focal file.
- Why: Explore impact scope quickly without recompute.
- How: Run BFS once from focal; store depth per node; client filters by <=d.
- UX: Small slider or +/- buttons; breadcrumbs include “d≤2”.
- Acceptance: Depth changes are instant; counts update.

K. Fuzzy node search + filter chips (activate placeholders)
- What: Instant search by name or path; functional file‑type chips.
- Why: Fast access; leverage existing UI.
- How: fuse.js (or simple scoring) in UI; chips filter by ext data property already present.
- Acceptance: Search narrows nodes; chips filter visually and by interaction.

L. Save named views
- What: Save/restore a graph view state.
- Why: Shareable focus for later sessions.
- How: Serialize {focusIds, lens, filters, layout} to workspaceState; optional .constellation/views/*.json.
- UX: Toolbar: Save View…; list of saved views; click to restore.
- Acceptance: Can save, list, restore; survives reload.

M. Export
- What: Export PNG/SVG and copy list of selected/visible files.
- Why: Share in docs/PRs.
- How: Cytoscape png/svg(); clipboard write via VS Code API bridge.
- Acceptance: Files exported; copied list respects filters.

N. Pin & manual layout
- What: Allow pinning nodes and minor manual drags.
- Why: Communicate narratives; reduce reflow.
- How: Cy.set({ locked: true }) on pinned; store positions in view state; preset layout when restoring.
- Acceptance: Pinned nodes remain stable; “Reset layout” clears.

O. Edge direction toggles + degree counters
- What: Toggle inbound/outbound emphasis and show degree counts.
- Why: Clarify dependency flow.
- How: Style edges by direction; small badges on hover with in/out counts.
- Acceptance: Toggle works; counts accurate.

P. Snapshot diff (later, but valuable)
- What: Compare two scans to show added/removed nodes/edges.
- Why: Great for PR review or refactor tracking.
- How: Persist last N scans; simple set diff; color code adds/removes.
- Acceptance: Toggle shows deltas; legend updates.

4) Prioritization & milestones

M0 – Quick wins (1–2 days)
- K Fuzzy search + activate filter chips (simple scoring; no new deps if preferred)
- H Shortest path
- M Export PNG/SVG + copy list
- O Direction toggle + degree counts

M1 – Risk & architecture (2–4 days)
- A Criticality score (fan‑in + churn) with legend
- C Churn lens (30d; preset bins)
- I Cycle detection & SCC highlight

M2 – Information scent & navigation (2–4 days)
- E Breadcrumbs & Backstack
- J Depth lens
- F Legend (layer toggles)

M3 – Structure & organization (3–5 days)
- B Module clustering (compound nodes)
- N Pin & manual layout
- L Save named views

M4 – Guardrails (2–3 days)
- D Policy hints (notImport rule type v1)

M5 – Delta insights (later)
- P Snapshot diff

5) UX notes (overlaying current UI)
- GraphToolbar: enable search input; add a small “Lens” dropdown (None, Churn, Criticality); add Save/Export icons; Depth +/- when a focus is set.
- Legend: compact floating card, top‑right; toggles for layers and bins; counts inline.
- Path/Selection: when path is highlighted, dim others (opacity 0.2) and show inline breadcrumb of the path.
- Toasts: use current notification styles in the side panel for errors (e.g., git not available).

6) Technical approach & message contracts
- New webview -> extension messages (types extend messenger.ts):
  - 'graph/git-churn': { sinceDays: 7|30|90 }
  - 'graph/find-shortest-path': { fromId: string; toId: string }
  - 'graph/find-cycles': {}
  - 'graph/save-view': { name: string; state: SavedView }
  - 'graph/list-views': {}
  - 'graph/export': { kind: 'png' | 'svg' | 'list' }
- Extension -> webview responses:
  - 'graph/git-churn-data': { counts: Record<string, number>; sinceDays: number }
  - 'graph/shortest-path': { nodes: string[] }
  - 'graph/cycles': { sccs: string[][]; count: number }
  - 'graph/views': { items: Array<{ name: string; state: SavedView }> }
  - 'graph/exported': { ok: boolean; path?: string; kind: string }
- Data shapes
  - SavedView: { focusIds?: string[]; lens?: string; params?: any; filters?: { ext?: string[] }; layout?: { positions?: Record<string, {x:number,y:number}>, pinned?: string[] } }

7) Performance & scalability
- Keep heavy work in extension: git churn, SCC, shortest path (optional in UI if small).
- Cache churn by commit hash + sinceDays; invalidate on repo HEAD change.
- For large graphs, reuse existing isLargeGraph switches (label sizes, opacity) and avoid re‑creating Cytoscape instance when toggling layers.

8) Accessibility & keyboarding
- Every new control has focus styles using var(--vscode-focusBorder).
- Keyboard palette commands mirror toolbar actions.
- Legend and banner controls operable via keyboard.

9) Security & privacy
- Git churn uses local git only; never exfiltrate data.
- Policy rules loaded from workspace; glob evaluation restricted to workspace paths.
- No network I/O added.

10) Implementation plan (file-oriented)
- Extension (src/)
  - services/graph-analysis.service.ts (new): shortestPath, findSCCs, degree metrics (pure TS).
  - services/git-churn.service.ts (new): run git log --since with --no-pager, parse counts, cache.
  - services/policy.service.ts (new): load .kiro/constellation/policy.json, evaluate edges.
  - services/views.service.ts (new): persist named views in globalState/workspaceState or .constellation/views.
  - message-router.service.ts: route new messages.
- Webview UI (webview-ui/)
  - components/Legend.tsx (or legend.tsx aligned with project patterns): compact layer toggles + counters.
  - components/KeyboardPalette.tsx: minimal command palette overlay.
  - components/GraphToolbar.tsx: enable search/chips; add Lens dropdown; Export/Save buttons.
  - components/GraphCanvas.tsx: path highlight mode; direction toggles; degree badges on hover.
  - services/metrics.service.ts: fanIn/out, normalize, color ramps.
  - services/churn-colors.service.ts: churn binning + colors.
  - styles/global.css: legend/palette styles; chips enabled states.

11) Acceptance criteria (summarized by milestone)
- M0: Search finds nodes; shortest path highlights; Export works; direction toggle changes edge emphasis.
- M1: Scores and churn render with a legend; SCCs detected and highlightable.
- M2: Breadcrumbs visible and usable; depth lens is instant; legend toggles layers.
- M3: Clusters collapse/expand; pinned nodes persist; saved views restore layout/filters.
- M4: One rule type enforced; violations list navigable.

12) Risks & mitigations
- Git availability: handle absence gracefully; feature disabled with a tooltip.
- Large graph slowdowns: push computation to extension; avoid expensive re-layouts; reuse elements/stylesheets.
- Visual overload: keep legend and toggles compact; default to off for heavy layers.

13) Testing notes
- Unit: analysis functions (shortest path, SCC, binning).
- Integration: message contracts; churn caching; policy evaluation.
- Visual: snapshots per milestone; verify dark/light themes.

14) Open questions
- Should policy rules support allowlist (onlyImport) in v1? (Default: out-of-scope for M4.)
- Do we want to persist/export criticality values for CI checks later? (Future.)

Appendix A: Color ramps
- Criticality ramp: green → yellow → orange → red; ensure contrast on dark/light via text-outline already added.
- Churn bins: 0 (muted), 1–3 (soft), 4–10 (medium), 10+ (strong).


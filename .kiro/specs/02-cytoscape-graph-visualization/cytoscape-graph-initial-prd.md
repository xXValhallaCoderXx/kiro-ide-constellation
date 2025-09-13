# Cytoscape Graph – initial implementation PRD

Objective
- Visualize the project dependency graph using Cytoscape.js in the GraphView tab.
- Data source: ./.constellation/data/codebase-dependencies.json created by the dependency-cruiser scan.
- If the file does not exist, trigger a scan, wait for completion, and then render.

Non-goals (v1)
- Fancy styling (file-type colors, status indicators) — we’ll stub hooks for later.
- Layout persistence across reloads.
- Live updates on file change — v1 is on-demand (scan → render).

User stories
1) As a user, when I open the GraphView, I see a graph representing files and their dependencies.
2) If the dependency data is missing, the extension runs a scan; when done, the graph appears.
3) I can pan/zoom the graph, click a node to see its path in a small details pane, and double-click to open the file in the editor (stretch goal within v1).

Design overview
- Data flow
  - GraphView (webview UI) requests graph data from the extension via message ‘graph/load’.
  - Extension reads ./.constellation/data/codebase-dependencies.json (or triggers scan and re-reads), transforms dependency-cruiser output to a normalized format (nodes[] and edges[]), and returns it to the webview via message reply ‘graph/data’.
  - GraphView renders with Cytoscape and basic layout/styling.

- Message contract
  - From webview → extension
    - { type: 'graph/load' }
    - { type: 'graph/open-file', path: string } (double-click node)
    - { type: 'graph/scan' } (optional manual re-scan)
  - From extension → webview
    - { type: 'graph/data', payload: { nodes: Node[], edges: Edge[], meta: Meta } }
    - { type: 'graph/error', message: string }
    - { type: 'graph/status', message: string }

- Types (v1)
  - Node: { id: string; label: string; path: string; language?: 'ts' | 'js' | 'tsx' | 'jsx' | 'json' | 'other' }
  - Edge: { id: string; source: string; target: string; kind?: 'import' | 'require' | 'dynamic' | 'unknown' }
  - Meta: { generatedAt?: string; count: { nodes: number; edges: number } }

- Transformation (dependency-cruiser → cytoscape)
  - dependency-cruiser JSON (summary/graph) typically contains a modules array with source → dependencies[].
  - Node id: absolute path (or workspace-relative unique path). Prefer workspace-relative to keep ids stable and readable.
  - Node label: basename(file).
  - Edge id: `${sourceId}->${targetId}` + optional index to ensure uniqueness.
  - Edge kind: use dependency.dependencyTypes (e.g., esm, cjs, dynamic) → map to import/require/dynamic/unknown.

- Rendering (Cytoscape)
  - Use a basic layout: ‘cose’ or ‘cose-bilkent’ (if the plugin is available; otherwise cose).
  - Styles (initial):
    - Nodes: background-color: var(--vscode-charts-blue) or default; label: data(label); color based on filetype later.
    - Edges: line-color: var(--vscode-foreground, #aaa); arrows: none in v1.
  - Interactions:
    - Pan/zoom default.
    - Click node: show selection (bold label) and display node details in a sidebar area in the graph view.
    - Double-click node: send ‘graph/open-file’ to extension.

Detailed tasks
1) Dependency additions (root)
   - Add cytoscape to devDependencies (root; used in webview-ui bundle):
     - "cytoscape": "^3.27.0"
   - If using cose-bilkent later, add plugin; v1 can use builtin ‘cose’.

2) Extension-side: graph data service
   - File: src/services/graph-data.service.ts
   - export async function loadGraphData(context: ExtensionContext): Promise<{ nodes: Node[]; edges: Edge[]; meta: Meta }>
     - Determine workspace root (first folder). If none, return error.
     - Compute path: <ws>/.constellation/data/codebase-dependencies.json.
     - If missing: runScan(context) and poll the file until present or timeout (e.g., 30s). Emit status messages while waiting (optional).
     - Read and parse JSON. Validate minimal shape (has depcruise.modules or similar).
     - Transform to nodes/edges using helper transform function.
   - export function transformDepCruise(dep: any, wsRoot: string): { nodes, edges, meta }

3) Extension-side: webview messaging
   - Extend centralized messenger handling (src/services/messenger.service.ts):
     - Handle ‘graph/load’ → call loadGraphData → post ‘graph/data’ to the webview.
     - Handle ‘graph/open-file’ → vscode.workspace.openTextDocument + showTextDocument.
     - Optional ‘graph/scan’ → call runScan(context), then loadGraphData and reply.
   - Wiring:
     - Graph WebviewPanel setup (constellation.openGraphView) should attach onDidReceiveMessage and route to messenger.service.
     - Side panel provider remains unchanged.

4) Webview UI: GraphView implementation
   - Install cytoscape in webview-ui project (already part of root devDependencies; Vite will bundle it into out/ui/main.js).
   - webview-ui/src/views/GraphView.tsx
     - On mount: messenger.post('graph/load'); listen for ‘graph/data’ and ‘graph/error’.
     - Build Cytoscape instance in a container div; set elements from payload.
     - Basic layout: cy.layout({ name: 'cose', fit: true }).run().
     - Add event handlers:
       - cy.on('tap', 'node', (e) => set selected node state + render details)
       - cy.on('dbltap', 'node', (e) => messenger.post('graph/open-file', { path: node.data('path') }))
     - Provide a small “Re-scan” button that posts ‘graph/scan’ (optional v1).

5) UI plumbing and state
   - Introduce a lightweight GraphView component state: { loading: boolean, error?: string, selected?: Node }
   - Render states: loading spinner (text), error, graph + info panel.

6) File path semantics
   - Prefer workspace-relative ids for nodes and show absolute path in tooltip/details.
   - When opening the file, pass vscode.Uri.file(absPath) from the extension handler.

7) Timeouts and fallbacks
   - If scan is triggered: show status "Scanning project..." with up to 30s timeout. On timeout, show error with suggestion to run ‘Constellation: Scan Dependencies’.

8) Security/CSP
   - No external resources — Cytoscape is bundled.
   - Keep CSP as is; no eval needed.

9) Testing
   - Small repo with a handful of .ts files; run ping to open Graph tab; observe auto-load.
   - Remove the JSON file; open Graph tab → triggers scan → graph appears.
   - Double-click a node → underlying file opens.

10) Future hooks (out of scope, leave TODO comments)
   - Color nodes by file type.
   - Hover metadata: size, #deps, cycles.
   - Filtering: show only src/, only cycles, etc.
   - Persist layout positions per workspace.

Milestones
- M1: Data layer complete (load/scan/transform) + minimal GraphView rendering.
- M2: Interaction polish (open on double-click, details pane).
- M3: Visual polish (colors per file type), optional filters.

Acceptance criteria
- Opening Graph tab loads and renders a Cytoscape graph from codebase-dependencies.json.
- If the file is missing, the extension triggers a scan and then renders once available.
- Double-clicking a node opens the corresponding file in the editor.
- No blocking of the main activation path; all heavy work done in background.


## Brainstorming session for "focus and drill down" feature

# What “drill-down focus” means (shared language)

* **Lens:** “children” = **outgoing edges** (e.g., file A → file B if A imports B). We’ll default to children-only for drill; we can add a parents lens later.
* **Drill:** **double-click** a node → show only that node + its children.
* **Step deeper:** double-click one of those children → repeat.
* **Trail back:** use a **breadcrumb bar** to jump back to any previous level; **Esc** = step back one level.
* **Reset:** “Show full graph” returns to original view (no filters).

---

## State model (kept in the webview)

* **Full graph state**: the immutable source of truth (snapshot + adj maps).
* **View state** (mutates with interactions):

  * `root`: the currently focused node id/path.
  * `depth`: integer (default **1**, allow 1–3 via a tiny slider later).
  * `lens`: `"children"` (hard-set for P0; add `"parents"` later).
  * `visibleNodes`: `Set` of node ids.
  * `visibleEdges`: `Set` of edge ids (subset of edges that connect two visible nodes).
  * **Breadcrumb stack**: ordered list of crumbs `{root, depth, lens, label}` where the **last** item mirrors current view.
  * **Backstack** (optional): quick linear history separate from crumbs for “undo” (Esc).

---

## Core view operations (fast, deterministic)

* **computeVisible(root, depth, lens)**

  * BFS over **forward** for children (or **reverse** for parents when added).
  * Stop at `depth`.
  * Return `{visibleNodes, visibleEdges}`.
* **applyView(view)**

  * Update `visibleNodes/Edges`; style non-visible as hidden (or 10–20% opacity if you prefer fading).
  * Keep coordinates of visible nodes to preserve layout; don’t reflow entire graph.
* **pushCrumb(view)** / **popToCrumb(index)**

  * Push current view on drill; pop or jump on breadcrumb click.
  * Ensure idempotence: re-compute visible sets from the full graph every time you apply a crumb (no cumulative filter drift).

---

## Interactions to wire

* **Double-click node** → `root = node`, `depth = 1`, `lens = "children"`

  1. Compute visible sets from full graph.
  2. Push crumb `{label: node label, root, depth, lens}`.
  3. Apply view.
  4. Center the root; run a short “local settle” (e.g., 150ms) if you use a physics layout.
* **Single click node** → select (no view change);.
* **Mouse hover** → hover card (path, in/out degree); OUT OF SCOPE.
* **Esc** → step back one crumb (if any), else no-op.
* **Breadcrumb click** → jump to that level (truncate crumbs after it).
* **Reset button** → clear crumbs → show full graph.

---

## Breadcrumb bar (minimal but useful)

* **Location:** top of the graph panel, single row.
* **Content:** `Root ▶ Child ▶ Grandchild` where each crumb shows the node label (truncate middle with ellipsis if long).
* **Actions:** click a crumb to jump; a **Reset** pill at the end.
* **Keyboard:** **Esc** maps to “Back” (jump to previous crumb).

---

## Layout strategy (to keep it feeling stable)

* **No global re-layout** on each drill. Hide the rest; keep current positions for visible nodes.
* **Center the root** (animate with translate/zoom \~200ms).
* **Short local simulation**: if using physics, run a brief tick only on visible nodes to untangle overlaps; cap iterations.
* **Cache positions per node id** so going back to a crumb restores the previous placement instantly.

---

## Rendering details (lightweight)

* **Visibility:** actually remove non-visible nodes/edges from the renderer if that yields better perf; otherwise set low opacity and disable pointer events.
* **Emphasis:** root gets a halo ring; direct children get a slightly thicker stroke.
* **Counts:** a tiny legend chip can show `depth=1 • nodes=23 • edges=42`.
* **Performance budget:** computeVisible (BFS) should be O(V+E) but tiny because depth ≤ 3; aim for <10ms on medium graphs.

---

## Edge cases & rules

* **Node with huge fan-out (e.g., 200+ children):** cap rendered children to, say, 100 and show a “+ N more” collapsed badge; offer a “show all” click that warns about performance.
* **Root with zero children:** show empty state (“No children at depth 1”); keep Reset available.
* **Missing node (from stale state):** fall back to full graph and toast “Node not found; re-scan?”
* **Cycles:** harmless; BFS with a visited set prevents loops.

---

## Minimal instrumentation (nice for debugging)

* Log each view change with `{root, depth, visibleCount}`.
* Keep a simple timer for `computeVisible` and render; print if >50ms.

---

## What you’ll need to build (task list)

1. **Adjacency builder** (forward + reverse) right after scan; store on the webview side.
2. **View state container** with helpers: `computeVisible`, `applyView`, `pushCrumb`, `popToCrumb`, `reset`.
3. **Double-click handler** that calls `drillTo(nodeId)` (wraps push + apply).
4. **Breadcrumb bar** (render from crumb stack; click → `popToCrumb(index)`).
5. **Keyboard bindings** inside the webview: `Esc` → back, maybe `Ctrl/Cmd+.` to toggle depth in future.
6. **Layout helpers**: center root, optional short local settle, cached positions.
7. **Reset control** (button + command from extension if you want parity).
8. **Optional:** tiny legend chip with depth/nodes/edges counts.

---

## Future-proof toggles you can wire later without refactor

* **Lens switch:** children ↔ parents (swap to reverse map).
* **Depth slider:** 1–3 hops; recompute on change.
* **“Show siblings”**: include other parents’ children at current level (wider context).
* **“Pin nodes”**: keep certain nodes always visible across drills.

---

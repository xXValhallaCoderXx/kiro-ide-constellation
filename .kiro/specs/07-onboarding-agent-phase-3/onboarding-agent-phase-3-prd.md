# Onboarding Agent — Phase 3 (Graph-Context Planning) PRD
Author: Architect-Zero & Strategist-Zero
Date: 2025-09-14
Version: 0.1
Status: Scoped

1. Objective
Enhance onboarding plan quality and speed by grounding planning in the dependency-cruiser graph. The MCP server will read the precomputed graph file (./.constellation/data/codebase-dependencies.json) directly and compute a small neighborhood of related files for a given seed (file or topic). If the file is missing, the MCP server will trigger a workspace scan via a minimal HTTP bridge endpoint, then retry reading the graph. The planning tool (constellation_onboarding.plan) will be enriched to include this graph-context in its output for the agent to use when composing the step-by-step plan.

2. Current State Summary (Phases 1–2)
- Mode management and persona swap working with move-based steering backups.
- Walkthrough plan commit, next-step, and finalize with cleanup back to Default.
- Dependency-cruiser integration already writes ./.constellation/data/codebase-dependencies.json and the Graph view uses it.
- Impact analysis tool leverages graph-data loader which triggers scans when needed.

3. Phase 3 Scope
- Add CONSTELLATION_WORKSPACE_ROOT to MCP env so the MCP server can locate the workspace graph file without round trip to the extension for simple reads.
- Add an HTTP bridge endpoint POST /scan to trigger a workspace dependency scan and block until results are available or a timeout occurs.
- Enrich constellation_onboarding.plan to:
  - Read the graph file (if available) and compute relatedFiles for a seed file/topic using BFS over import and importer edges with depth (1|2).
  - If the graph file is missing, call POST /scan and retry reading once.
  - Return relatedFiles along with the proposed plan to anchor the agent’s choices.
- No new UI; the graph is not displayed during onboarding.

4. Detailed Behavior
4.1 MCP Env Injection
- Inject CONSTELLATION_WORKSPACE_ROOT=<first workspace folder path> into both user and optional workspace MCP config entries (already have a place to set env in mcp-config.service.ts).

4.2 HTTP Bridge Endpoint: POST /scan
- Request: {}
- Behavior:
  1) Kick off runScan(context) (reuse existing service).
  2) Poll for ./.constellation/data/codebase-dependencies.json existence for up to 30s (500ms intervals), returning 200 on success.
  3) Return 504 (or 408) on timeout with structured JSON { error: 'timeout' }.
- Security: loopback-only + bearer auth (same as other endpoints).
- Response: { status: 'ok' } when file available; else { error } with appropriate HTTP code.

4.3 MCP Server: Enrich plan tool
- In constellation_onboarding.plan handler:
  1) Read ENV: WORKSPACE_ROOT = process.env.CONSTELLATION_WORKSPACE_ROOT.
  2) Attempt to read graph file at `${WORKSPACE_ROOT}/.constellation/data/codebase-dependencies.json`.
  3) If ENOENT, call the bridge POST /scan (bearer token from existing env), then retry reading once.
  4) Parse graph JSON and construct adjacency maps:
     - forward[source] => [targets]
     - reverse[target] => [sources]
  5) Resolve seed:
     - If request includes seedFile, normalize to workspace-relative; resolve to node id using heuristics: exact, case-insensitive, extension swaps, basename scoring (replicate logic from resolveSourceIdInGraph in impact-analysis.service.ts for consistency).
     - Else if request includes topic, choose best matching node id by path substring and basename scoring.
     - If no seed can be resolved, relatedFiles = [] and proceed.
  6) Compute related files:
     - BFS over union graph (forward ∪ reverse) up to depth D (default 1; allow 2 via config later), collect unique node ids.
     - Rank by distance, then by degree; clamp to a manageable limit (default 30).
  7) Return enriched payload:
     - { plan: OnboardingPlan, context: { seedId, relatedFiles, depth, limit } }
- The agent uses relatedFiles to draft better, grounded steps.

5. Data Structures
- codebase-dependencies.json shape used from phase 1 graph-data service (depcruise.modules[].source/dependencies[].resolved).
- Enriched plan tool output:
```json path=null start=null
{
  "plan": { "version": 1, "topic": "...", "createdAt": "...", "steps": [ ... ] },
  "context": {
    "seedId": "src/services/http-bridge.service.ts",
    "relatedFiles": ["src/services/http-bridge.service.ts", "src/mcp.server.ts", "webview-ui/src/services/messenger.ts"],
    "depth": 1,
    "limit": 30
  }
}
```

6. Edge Cases & Fallbacks
- No workspace: Plan returns context.relatedFiles=[] and a message advising to open a folder.
- Graph file missing: Try /scan once and retry; if still missing, relatedFiles=[].
- Seed not resolved: relatedFiles=[] but plan may still be produced from topic text.
- Large graphs: Always clamp to limit and avoid building expensive structures.

7. Security & Permissions
- MCP server only reads files under CONSTELLATION_WORKSPACE_ROOT; do not follow symlinks outside workspace.
- HTTP bridge /scan remains loopback-only with bearer auth.
- No return of absolute paths to the agent; return workspace-relative ids.

8. Acceptance Criteria
- AC1: When the plan tool is called with a seed file or topic, context.relatedFiles is populated based on the graph within 500ms on typical repos (excluding scan time).
- AC2: If the graph file is missing, the tool triggers a scan once and retries; if successful, returns relatedFiles.
- AC3: relatedFiles contain workspace-relative paths only, ranked by proximity (depth first) and clamped to the configured limit.
- AC4: Plan output includes the context field; the persona uses this list to draft grounded steps.
- AC5: No extra UI is shown; onboarding mode remains chat-driven.

9. Implementation Plan
- mcp-config.service.ts
  - Add CONSTELLATION_WORKSPACE_ROOT to env for both user and workspace configs.
- http-bridge.service.ts
  - Implement POST /scan: trigger runScan(context), poll codebase-dependencies.json up to 30s, return { status: 'ok' } on success, structured error on timeout.
- mcp.server.ts
  - Update constellation_onboarding.plan handler:
    - Read env root; attempt to read graph; if ENOENT → call /scan then retry.
    - Build adjacency; resolve seed id; compute related files; enrich response.
  - Ensure onboarding tools are in autoApprove (already added in previous iteration; retain).
- Persona (onboarding persona template)
  - Add a short instruction: “Before proposing a plan, request graph context (implicit in the plan tool) and use relatedFiles to ground your step selection.”
- Docs
  - Update docs/development.md with the new /scan endpoint and env var
  - Update docs/events.md to list /scan
  - Update onboarding-agent-phase-2.md references where necessary

10. Risks & Mitigations
- Risk: Plan latency if scan is needed
  - Mitigation: Single retry, 30s cap; subsequent runs will be fast
- Risk: Incorrect seed mapping for topic-only queries
  - Mitigation: Use robust basename/substring scoring, fall back to relatedFiles=[] gracefully
- Risk: Large graph memory
  - Mitigation: Build compact adjacency, depth-limited BFS, limit size

11. Non-Goals
- Graph rendering in onboarding UI
- Multi-root workspace support
- Content-based (semantic) search in this phase

12. Future Enhancements (Optional)
- Depth=2 by default for better reach when seeds are leaf files
- Add degree-based or module-aware ranking (e.g., favor source files over index/barrel files)
- Topic-to-seed learning (cache successful mappings)


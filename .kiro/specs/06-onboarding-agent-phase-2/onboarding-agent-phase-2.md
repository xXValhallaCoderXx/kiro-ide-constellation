# Onboarding Agent — Phase 2 (Implementation PRD)
Author: Architect-Zero & Strategist-Zero
Date: 2025-09-14
Version: 0.1
Status: Scoped

1. Objective
Phase 2 adds a tidy end-of-tour flow and a minimal “offers” experience without implementing the downstream features. When the walkthrough completes, the user is shown a concise summary plus two offers:
- Summarize and document this feature for me
- Suggest unit testing plan

Regardless of the user’s choice, we acknowledge the intent, respond “Sorry, this feature is not in the MVP”, and perform a thorough cleanup:
- Switch back to Default mode (restore steering docs)
- Remove temporary onboarding artifacts (plan/state files)
- Reset Side Panel status UI

2. Current State (Phase 1)
- Mode toggle (Side Panel): Default ↔ Onboarding, with confirmation dialogs.
- Persona swap logic:
  - Enable: Move ./.kiro/steering → ./.constellation/steering/backup/<ts>, write ./.kiro/steering/onboarding-guide.md
  - Disable: Restore from latest backup and delete ./.constellation/steering/backup
- Walkthrough engine:
  - commitPlan(plan) persists to ./.constellation/onboarding/plan-<ts>.json, initializes in-memory state, executes Step 1.
  - nextStep() executes subsequent steps and returns status: 'ok' | 'complete'.
- UI: OnboardingModeToggle (mode), OnboardingStatus (progress/status), onboarding/* messages.

3. Scope (Phase 2)
- End-of-tour summary: At completion, present a concise summary (topic, files, step highlights, bullet points from explanations).
- Two offers: “Document this feature” and “Suggest unit testing plan”.
- Choice handling: Detect the user’s selection; acknowledge it, apologize that it’s not in MVP, then clean up.
- Cleanup: Switch mode to Default, restore steering, remove tour artifacts (plan + transient state), and reset Side Panel status.

4. UX Flow
1) User completes last step (nextStep → 'complete').
2) Extension posts onboarding/walkthrough-complete (already exists).
3) Kiro (persona): Announces completion and asks the user to choose:
   - Option 1: Summarize and document this feature
   - Option 2: Suggest unit testing plan
4) User selects one (in chat).
5) Kiro calls the finalize tool with chosenAction.
6) Extension returns a computable summary and performs cleanup (switch to Default, delete plan file/state).
7) Kiro replies with:
   - The summary content (from tool)
   - “Sorry, this feature is not in the MVP.”
   - Confirms cleanup done.

Notes
- UI may also show a non-blocking “Tour cleaned up” toast via webview message, but chat remains primary.

5. API & Data Structures
5.1 MCP tool (new)
- Name: constellation_onboarding.finalize
- Input:
```json path=null start=null
{ "chosenAction": "document" | "test-plan" | null }
```
- Output:
```json path=null start=null
{
  "status": "done",
  "chosenAction": "document" | "test-plan" | null,
  "summary": {
    "topic": string,
    "stepCount": number,
    "files": string[],
    "highlights": [{ "filePath": string, "lineStart": number, "lineEnd": number }],
    "bulletSummary": string[]
  },
  "cleanup": {
    "mode": "Default",
    "removedPlan": string | null
  }
}
```
- Behavior:
  - Read current in-memory state (plan, currentStepIndex) if present.
  - Derive summary from plan:
    - topic = plan.topic
    - stepCount = plan.steps.length
    - files = unique plan.steps[].filePath
    - highlights = plan.steps[].{filePath,lineStart,lineEnd}
    - bulletSummary = top N explanations (N≤10) trimmed to single-line bullets
  - Cleanup sequence:
    - Remove active plan file (if exists) from ./.constellation/onboarding/
    - Clear in-memory walkthrough state
    - Switch mode to Default (restore steering)
  - Return structured output shown above.

5.2 HTTP bridge (new endpoint)
- POST /onboarding/finalize
- Request: { chosenAction: 'document' | 'test-plan' | null }
- Response: Same as MCP tool output
- Security: Existing loopback + bearer token

6. Persona Updates (Onboarding Guide)
Add a strict “Finish” protocol after the final step:
- After “Step N of N” completes, present two offers:
  1) Summarize and document this feature
  2) Suggest unit testing plan
- On user selection, call the finalize tool:
```json path=null start=null
#[constellation-mcp] constellation_onboarding.finalize { "chosenAction": "document" }
```
- Print the returned summary, then say: “Sorry, this feature is not in the MVP.”
- Confirm cleanup is complete and the mode is back to Default.

7. Implementation Plan (concise)
A) onboarding-walkthrough.service.ts
- Add getSummary(): derives summary from current state (plan). If no state, return empty defaults.
- Add cleanup({ removePlan: boolean }):
  - Delete current plan file if tracked
  - Clear in-memory state

B) onboarding-mode.service.ts
- Reuse switchToDefault() to restore steering and remove backups.

C) http-bridge.service.ts
- Add endpoint:
```ts path=null start=null
// POST /onboarding/finalize
// body: { chosenAction: 'document' | 'test-plan' | null }
// returns: { status, chosenAction, summary, cleanup }
```
- Steps:
  1) Parse input, validate chosenAction
  2) Import walkthrough service, get summary
  3) Remove plan file (if any) & clear walkthrough state
  4) Import onboarding-mode.service and switchToDefault()
  5) Return status + summary + cleanup info

D) mcp.server.ts
- Register tool constellation_onboarding.finalize mirroring impactAnalysis pattern:
  - Forward to /onboarding/finalize with bearer token
  - Return JSON content

E) messenger.service.ts (optional)
- On finalize success, emit onboarding/status-update with isActive: false and a brief message, or onboarding/walkthrough-complete if not already sent.

F) UI (optional/minimal)
- OnboardingStatus: when isComplete, show a short “Tour cleaned up” notice after finalize.
- No new UI controls required.

8. Cleanup Policy
- Files to remove:
  - Only the active plan file in ./.constellation/onboarding/ used by the current tour
- Files retained:
  - Dependency scan results under ./.constellation/data/
- Mode reset:
  - Always switch to Default and delete ./.constellation/steering/backup/

9. Error Handling & Idempotency
- If no active plan, finalize returns summary with stepCount=0 and proceeds to switch to Default.
- If restore fails (no backups), finalize still returns summary and a warning string (do not throw fatally); create empty ./.kiro/steering and continue.
- If delete plan fails, proceed with Default mode switch and include removedPlan: null.
- All endpoints return 200 with structured error fields where possible; only use 5xx for unexpected exceptions.

10. Acceptance Criteria
- AC1: After final step, Kiro can present two offers in chat (persona updated) and handle user selection.
- AC2: finalize tool returns a structured summary (topic, stepCount, files, highlights, bulletSummary).
- AC3: finalize causes cleanup: walkthrough state cleared, active plan file removed, mode switched to Default, backups removed.
- AC4: Side Panel indicates not in a walkthrough (no active status), and Mode shows Default.
- AC5: If user triggers finalize without an active tour, it still switches to Default and returns a safe empty summary.
- AC6: All file operations remain within the workspace; absolute paths and traversal are prevented.

11. Non-Goals
- Generating actual documentation pages or committing files
- Creating actual test suites or scaffolds
- Persisting summary beyond the chat response
- Multi-root workspace support

12. Risks & Mitigations
- Risk: User expects real documentation/test plan
  - Mitigation: Persona communicates MVP limitation and provides concise, helpful summary
- Risk: Partial failures during cleanup
  - Mitigation: Best-effort cleanup with clear status fields; leave workspace consistent and back in Default mode
- Risk: Deleting unintended files
  - Mitigation: Track the exact plan file path in state; delete only that file

13. Task Breakdown
- Update persona template string (Phase 1 template) to add the Finish protocol
- Walkthrough service: getSummary() + cleanup()
- Bridge: POST /onboarding/finalize
- MCP Server: register constellation_onboarding.finalize
- Optional UI: brief completion/cleanup indicator

14. Example Payloads
- Finalize request (document):
```json path=null start=null
{
  "chosenAction": "document"
}
```
- Finalize response:
```json path=null start=null
{
  "status": "done",
  "chosenAction": "document",
  "summary": {
    "topic": "authentication",
    "stepCount": 2,
    "files": [
      "src/services/http-bridge.service.ts",
      "src/mcp.server.ts"
    ],
    "highlights": [
      { "filePath": "src/services/http-bridge.service.ts", "lineStart": 25, "lineEnd": 45 },
      { "filePath": "src/mcp.server.ts", "lineStart": 66, "lineEnd": 92 }
    ],
    "bulletSummary": [
      "Bridge enforces loopback + bearer token auth",
      "MCP server forwards with Authorization and handles HTTP errors"
    ]
  },
  "cleanup": {
    "mode": "Default",
    "removedPlan": ".constellation/onboarding/plan-2025-09-14T11-23-00.json"
  }
}
```

15. Implementation Notes
- File naming & style: keep services in kebab-case .ts; UI remains Preact per project conventions.
- Security: reuse loopback + bearer token auth for finalize endpoint; avoid leaking absolute paths in responses (return workspace-relative).
- Large files: N/A; summary is derived from plan content, not scanning files.


# Product Requirements Document: Onboarding Agent — Phase 1 (Revised POC)
Author: Architect-Zero & Strategist-Zero
Date: 2025-09-14
Version: 0.2 (Revised)
Status: Scoped

1. Objective & Background
This Phase 1 POC enables a chat-driven onboarding guide with a light, explicit UI control in the Side Panel. The user can switch between Default and Onboarding modes. When Onboarding is enabled, the extension backs up the user’s steering docs and writes a strict Onboarding Guide persona that instructs Kiro how to operate this feature. The Kiro agent then uses a new onboarding tool to craft a walkthrough plan and the extension executes it step-by-step by opening files and highlighting code ranges.

This phase validates: (a) safe persona swap via Side Panel with user confirmation and clear mode indication; (b) a single onboarding tool that Kiro uses to generate a structured walkthrough plan; (c) plan persistence in ./.constellation for traceability; and (d) basic execution of the first step plus controlled advancement.

2. End-to-End Flows
2.1 Mode Switching (Side Panel)
- UI: A dropdown in the Constellation Side Panel with values: Default, Onboarding.
- When switching from Default → Onboarding:
  - Show confirmation dialog.
  - On confirm: backup ./.kiro/steering to ./.constellation/steering/.backups/<timestamp>/, then write onboarding-guide.md (strict persona instructions into ./.kiro/steering).
  - Update visible Mode indicator to “Onboarding”.
- When switching from Onboarding → Default:
  - Show confirmation dialog.
  - On confirm: restore the most recent ./.kiro/steering/.backups/<timestamp>/ snapshot (best-effort), remove or de-prioritize onboarding-guide.md.
  - Update visible Mode indicator to “Default”.

2.2 Plan Creation → Commit → Walkthrough
- In chat (Kiro): User asks an onboarding question (e.g., “Please explain how authentication works in this repo.”).
- Kiro calls the onboarding planning tool to propose a structured plan. 
  - The tool will create a user friendly response of the plan to show to the user.
  - The tool will also include an "internal" plan which includes steps with file highlights and explanations.
- Kiro shows the user friendly plan to the user and asks for confirmation.
- On confirmation, Kiro calls the commit tool. The extension writes the internal plan to ./.constellation/onboarding/ and immediately executes Step 1: open file, highlight range, and notify the UI of the current step.
- Kiro asks the user if they want to proceed. If yes, Kiro calls the next-step tool and the extension advances to the next step.

3. Features & Requirements (POC)
3.1 Side Panel Mode Toggle (UI)
- Placement: Existing Side Panel (Preact). Add a Mode dropdown UI with options: Default, Onboarding.
- Styling: Use existing global CSS; reuse shared Button.tsx for confirmations if needed.
- Behavior:
  - Default → Onboarding: prompt confirmation. On confirm, backup steering docs and write onboarding persona file; set mode to Onboarding.
  - Onboarding → Default: prompt confirmation. On confirm, restore most recent backup; set mode to Default.
- Indicator: Show current mode in the Side Panel (e.g., “Mode: Onboarding”). Optional: VS Code status bar item with the same label.
- Errors: Clear, non-blocking toasts on backup/restore failures; never leave steering in an unknown mixed state (see 4. Security & Safety).

3.2 Persona Swap (Extension)
- Backup directory: ./.constellation/steering/.backups/<timestamp>/ (recursive copy of entire directory; create if missing).
- Onboarding persona path: ./.kiro/steering/onboarding-guide.md (overwrites or creates).
- Restore logic: best-effort restore of the most recent snapshot on return to Default.
- Idempotence: repeat toggles do not create redundant backups unless content changed since last backup; avoid thrashing.

3.3 MCP Tools (LLM-driven, two-phase pattern)
- Tool A: constellation_onboarding.plan
  - Input: { request: string }
  - Description: Instructs Kiro to analyze the repository topic via dependency graph context and propose a structured onboarding plan (no side effects). The plan format must conform to Section 3.4. The tool returns the proposed plan as JSON in the tool response for the user to review.
  - Output: { plan: OnboardingPlan }
- Tool B: constellation_onboarding.commitPlan
  - Input: { plan: OnboardingPlan }
  - Description: Persists the plan to ./.constellation/onboarding/plan-<id>.json and executes Step 1 immediately.
  - Output: { status: "started", stepCount: number, planPath: string }
- Tool C: constellation_onboarding.nextStep
  - Input: { }
  - Description: Advances to the next step in the active plan and executes it. If at the end, returns status: "complete".
  - Output: { status: "ok" | "complete", currentStepIndex?: number }

Notes
- The LLM (Kiro) constructs the plan in Tool A based on the request and the repo context (steered by onboarding-guide.md). The extension ensures plan persistence and executes steps via Tools B/C.
- All tools are exposed by the MCP server and internally call extension endpoints via the existing HTTP bridge.

3.4 Walkthrough Plan Structure
- Location (persisted by commit): ./.constellation/onboarding/plan-<yyyyMMdd-HHmmss>.json
- Schema (LLM must return in Tool A; extension validates in Tool B):
```json path=null start=null
{
  "version": 1,
  "topic": "authentication",
  "createdAt": "2025-09-14T11:23:00Z",
  "steps": [
    {
      "filePath": "src/services/http-bridge.service.ts",
      "lineStart": 25,
      "lineEnd": 45,
      "explanation": "The HTTP bridge authenticates requests using a bearer token and enforces loopback-only access. This is foundational to how the agent integrates securely."
    },
    {
      "filePath": "src/mcp.server.ts",
      "lineStart": 66,
      "lineEnd": 92,
      "explanation": "The MCP tool forwards requests to the extension over the secure bridge with Authorization headers."
    }
  ]
}
```
- Semantics:
  - filePath: workspace-relative path.
  - lineStart/lineEnd: 1-based inclusive indices; extension must clamp to valid file bounds.
  - explanation: concise narration for Kiro to present to the user (and may also be displayed in the Side Panel).

3.5 Walkthrough Execution (Extension)
- On commitPlan:
  - Validate plan schema and file existence (workspace-root bounded; normalize slashes; reject paths outside workspace).
  - Persist plan as JSON in ./.constellation/onboarding/. Optionally write a companion README.md with human-readable summary.
  - Initialize in-memory state: currentStepIndex = 0.
  - Execute Step 1.
- executeStep(i):
  - Open the file in an editor: vscode.window.showTextDocument.
  - Highlight the range via selection using lineStart/lineEnd.
  - Post a Side Panel message (or notification) indicating current step, path, and a short explanation string.
- nextStep():
  - If there is a next step, increment and execute.
  - If at the end, clear in-memory state and respond status: "complete".
- Persistence: No cross-session persistence required in this POC (state is in-memory; not restored on reload).

3.6 Notifications
- Side Panel must visibly indicate Mode: Default | Onboarding.
- During walkthrough execution:
  - Show current step index and total (e.g., “Step 1 of 5”) in Side Panel.
  - On completion: non-blocking toast “Walkthrough complete”.

4. Security, Safety & Integration
4.1 HTTP Bridge & Auth
- Reuse existing secure loopback HTTP bridge with bearer token auth.
- Add endpoints:
  - POST /persona { action: "enable" | "disable" }
  - POST /onboarding/commitPlan { plan: OnboardingPlan }
  - POST /onboarding/nextStep {}
- Validate Authorization header, loopback-only access, JSON size limits, and input schema.

4.2 File Safety
- All filePath values must be workspace-relative after normalization.
- Reject traversal attempts (..), absolute paths outside workspace, or non-file targets.
- Clamp lineStart/lineEnd to file bounds; continue gracefully if ranges are off.

4.3 Dependency Data Usage
- The plan is LLM-generated based on steering and the repo structure. The extension does not need to re-run dependency scans during execution. If needed, existing graph-data.service.ts may be used in future phases to augment plan validation (out-of-scope here).

4.4 UI & Conventions
- UI implemented in existing Side Panel (Preact), consistent with current stack:
  - Use shared Button.tsx and global CSS.
  - Avoid heavy new UI; only Mode dropdown + small status area.
- Code organization: new services added in kebab-case .ts (e.g., onboarding-mode.service.ts, onboarding-walkthrough.service.ts).

5. Non-Goals (Phase 1)
- Multi-root workspace handling.
- Content-based code understanding or semantic search (LLM may infer from file/path names and existing docs, but the extension won’t parse content).
- Automatic plan generation by the extension (LLM proposes in Tool A; extension only validates/persists in Tool B).
- Cross-session persistence or resume.

6. Persona Content (onboarding-guide.md)
- Path: ./.kiro/steering/onboarding-guide.md (created when switching to Onboarding).
  - The source of this will be kept in the project in src/personas/onboarding.md
- Purpose: Provide strict instructions to Kiro on how to use the tools and how to run a safe, guided walkthrough.
- Initial content guidance:
```md path=null start=null
# Onboarding Guide (Strict Persona)
Role: Provide a concise, step-by-step onboarding walkthrough for the user’s current repository.

Behavioral rules:
1) When the user asks to learn a topic (e.g., “authentication”), propose a short plan:
   - Use the tool: constellation_onboarding.plan { request: "<user-text>" } to draft a plan.
   - Ensure each step has: filePath (workspace-relative), lineStart, lineEnd, explanation.
   - Keep explanations concise and grounded.
2) Present the plan to the user for confirmation.
3) On “Yes”, call: constellation_onboarding.commitPlan { plan: <the plan> }.
4) After each step executes, ask the user if they want to proceed.
   - On “Yes”, call: constellation_onboarding.nextStep {}.
   - On “No”, end gracefully and summarize progress.
5) Be transparent about limitations: The plan is heuristic; line ranges may be approximate.
6) Keep responses short and action-oriented. Prefer bullets.
```

7. Acceptance Criteria
Mode switching & persona swap
- AC1: Side Panel exposes a Mode dropdown with Default and Onboarding.
- AC2: Switching Default → Onboarding shows a confirmation dialog; on confirm, backups are created and onboarding-guide.md is written.
- AC3: Switching Onboarding → Default shows a confirmation dialog; on confirm, the latest backup is restored.
- AC4: Side Panel displays the current mode clearly at all times.

Onboarding tools
- AC5: constellation_onboarding.plan returns a JSON plan matching schema (version, topic, steps[]), with at least one step when feasible.
- AC6: constellation_onboarding.commitPlan writes the plan to ./.constellation/onboarding/plan-*.json and immediately opens the first file with highlighted range.
- AC7: constellation_onboarding.nextStep advances to the next step and highlights the next range; when done, returns status: "complete".

Execution & safety
- AC8: File paths are workspace-relative and validated; out-of-bounds line ranges are clamped without failure.
- AC9: HTTP endpoints enforce loopback-only and bearer token validation; invalid inputs yield 4xx with structured error JSON.
- AC10: Errors are surfaced as non-blocking notifications and do not corrupt the user’s steering docs.

8. Open Questions
- Plan authoring authority: Should the extension perform any “sanity check” (e.g., verify files exist) before accepting commit? (Proposed: yes, validate existence and clamp ranges.)
- Multiple concurrent plans: Out-of-scope now; should future phases permit multiple saved plans and resumes?
- Confirmation UX: Plan confirmation happens in chat; should the Side Panel mirror the plan summary for visibility?

9. Future (Phase 2 Preview)
- Richer plan generation (ranking via dependency graph, optional content signals, or code lens prompts).
- Optional UI runner (Next button) and Side Panel explanations area.
- Pause/resume and minimal persistence.
- Additional tools for filtering/slicing by module, package, or feature area.

10. Implementation Notes
- UI (Preact): Extend SidePanelView.tsx with a Mode dropdown and indicator; use shared Button.tsx and global CSS.
- Extension services (kebab-case .ts):
  - onboarding-mode.service.ts: backup/restore steering + persona file management.
  - onboarding-walkthrough.service.ts: active plan state (in-memory), executeStep/nextStep, editor highlighting.
- HTTP bridge: Add POST /persona, /onboarding/commitPlan, /onboarding/nextStep with bearer auth.
- MCP server: Register constellation_onboarding.* tools that forward to HTTP bridge.
- File paths: Always workspace-relative; normalize separators; never access outside workspace.


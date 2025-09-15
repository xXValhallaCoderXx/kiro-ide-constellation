# Open Source Contribution Agent - Phase 1 PRD (Revised)

This revision incorporates: a TypeScript persona template (open-source.template.ts), a generic Agent Mode refactor (AgentModeService/AgentModeToggle), an OSS-scoped filesystem spec mirroring onboarding, and an added step to generate project-specific steering docs (structure, tech, product, standings) before PRD creation. The spec below is explicit and end-to-end.

## Executive Summary

We will add a second agent mode: Open Source Contribution Agent. It analyzes a cloned OSS repo, fetches and interprets a GitHub issue + comments, generates project-analysis.json and project steering docs, and then produces a standards-aligned PRD in the repo root.

Vision: Help developers contribute confidently by aligning with the target project's structure, tech, product norms, and contribution standards.

---

## Architecture Foundations (what we reuse and generalize)

From onboarding we reuse these patterns:
- Secure mode switching with steering doc backup/restore.
- Side panel Preact UI for mode toggle.
- MCP tools + HTTP bridge for structured actions.
- Workspace-scoped temp files in .constellation/.

We generalize naming to support multiple modes.

- Old names (specific): OnboardingModeService, OnboardingModeToggle
- New generic names: AgentModeService (service) and AgentModeToggle.tsx (Preact UI)
- Modes: 'Default' | 'Onboarding' | 'OpenSource'

Kebab-case + .ts suffix is used for new files per preference.

---

## Refactor and Naming Plan (generic agent mode)

- Create src/services/agent-mode.service.ts by adapting src/services/onboarding-mode.service.ts:
  - Keep backup/restore behavior identical (backup .kiro/steering to .constellation/steering/backup/<ISO>/, restore latest on return to Default).
  - Parameterize persona filename per mode.
  - Export helpers: getCurrentMode, switchTo(mode: 'Default'|'Onboarding'|'OpenSource').
- Replace webview-ui/src/components/OnboardingModeToggle.tsx with webview-ui/src/components/agent-mode-toggle.tsx (generic selector using SelectDropdown):
  - Options: Default, Onboarding, Open Source
  - Confirmation dialogs remain but copy is tailored per selection.
  - Persist chosen mode via extension-config.service.ts.
- Keep existing onboarding behavior unchanged (back-compat), but route via AgentModeService.

---

## Persona Template Source (TypeScript → Markdown)

- New file: src/personas/open-source.template.ts exports a string template (Markdown) for the OSS persona.
- On entering Open Source mode, the service writes .kiro/steering/open-source-contributor.md from this template. This mirrors how onboarding writes onboarding-guide.md, but the canonical text now lives in TypeScript for easy bundling.

Example shape:
```ts path=null start=null
export const OPEN_SOURCE_PERSONA_MD = `
# Open Source Contributor Persona (Strict)

Purpose
- Provide targeted guidance for contributing to this project: triage issues, analyze impact, propose changes.

Operating assumptions
- Open Source mode is enabled from the Constellation Side Panel.
- File paths are workspace-relative. Line ranges are 1-based inclusive.
- IDE actions are orchestrated by tools; you do not directly edit files.
`;
```

---

## Filesystem and Data Contracts (mirrors onboarding, scoped to oss)

Steering docs backup/restore (generic for all modes):
- Backup dir: .constellation/steering/backup/<ISO_TIMESTAMP>/
- Active steering dir: .kiro/steering/

Open Source mode files (all kebab-case):
- Personas
  - Input template: src/personas/open-source.template.ts
  - Generated: .kiro/steering/open-source-contributor.md
- Project steering docs (generated after analysis):
  - .kiro/steering/project-structure.md
  - .kiro/steering/project-tech.md
  - .kiro/steering/project-product.md
  - .kiro/steering/project-standings.md
- Temp/analysis (scoped to oss):
  - .constellation/oss/
    - analysis/
      - project-analysis.json
    - issues/
      - {owner}-{repo}-#{number}.json  (issue + comments, PII-scrubbed)
    - plans/
      - plan-{ISO_TIMESTAMP}.json      (internal planning artifact)
    - prds/
      - oss-implementation-#{number}.md (final PRD written to repo root too)

Root artifact for user:
- ./oss-implementation-#{number}.md (same content as .constellation/oss/prds/… for convenience)

Data schemas (succinct):
- project-analysis.json
```json path=null start=null
{
  "version": 1,
  "scannedAt": "2025-09-15T10:00:00Z",
  "detectedPatterns": ["monorepo", "vite+preact"],
  "keyDirs": [{"path": "src/services", "role": "backend services"}],
  "codingConventions": {
    "naming": {"files": "kebab-case", "components": "PascalCase"},
    "tsconfig": {"strict": true}
  },
  "testStrategy": {"framework": "vitest"},
  "graphStats": {"files": 123, "edges": 456}
}
```
- issue json (.constellation/oss/issues/*.json)
```json path=null start=null
{
  "owner": "org",
  "repo": "project",
  "number": 123,
  "title": "Bug: X",
  "labels": ["bug"],
  "body": "…",
  "comments": [{"author": "maintainer", "body": "Please add tests"}],
  "piiScrubbed": true
}
```
- plan json (.constellation/oss/plans/*.json)
```json path=null start=null
{
  "version": 1,
  "issue": {"owner": "org", "repo": "project", "number": 123},
  "strategy": {
    "affectedFiles": ["src/foo.ts"],
    "changeOutline": ["Refactor X", "Add unit tests"]
  },
  "createdAt": "2025-09-15T10:05:00Z"
}
```

---

## MCP Tools (OSS)

New tools parallel onboarding and use the HTTP bridge. Names stay explicit for clarity.

- constellation_opensource.analyze
  - Input: {}
  - Output: writes .constellation/oss/analysis/project-analysis.json and returns summary
- constellation_opensource.fetchIssue
  - Input: { url: string }
  - Output: writes .constellation/oss/issues/{owner}-{repo}-#{number}.json
- constellation_opensource.generateSteering
  - Input: { analysisPath?: string }
  - Output: writes .kiro/steering/project-*.md (structure, tech, product, standings)
- constellation_opensource.generatePRD
  - Input: { issueNumber: number, owner: string, repo: string }
  - Output: writes ./oss-implementation-#{number}.md and .constellation/oss/prds/oss-implementation-#{number}.md

Note: For HTTP, reuse the existing bridge env vars and security checks already implemented for onboarding.

---

## End-to-End Flow (explicit steps)

1) User action: Switch to "Open Source" via AgentModeToggle in the side panel.
   - AgentModeService:
     - Backup .kiro/steering → .constellation/steering/backup/<ISO>/
     - Render src/personas/open-source.template.ts → .kiro/steering/open-source-contributor.md
     - Ensure .constellation/oss/{analysis,issues,plans,prds} exist

2) Automatic: Codebase analysis
   - Load dependency graph (run or reuse existing .constellation/data/codebase-dependencies.json)
   - Analyze structure, conventions, tech stack → write .constellation/oss/analysis/project-analysis.json

3) Automatic: Generate project steering docs from analysis
   - Write:
     - .kiro/steering/project-structure.md (modules, layering, dirs, ownership hints)
     - .kiro/steering/project-tech.md (frameworks, toolchains, build/test/lint)
     - .kiro/steering/project-product.md (user-facing domains inferred, feature groupings)
     - .kiro/steering/project-standings.md (contribution rules: formatting, commit, PR checklist)

4) User action: Provide GitHub issue URL (command palette or UI input)
   - fetchIssue parses owner/repo/number, calls GitHub API (with optional token), fetches body+comments
   - PII scrub → write .constellation/oss/issues/{owner}-{repo}-#{number}.json

5) Automatic: Strategy planning for the issue
   - Cross-reference issue with analysis and graph to identify affected files, entry points, tests
   - Persist plan to .constellation/oss/plans/plan-<ISO>.json

6) Automatic: Generate PRD aligned to steering docs
   - Read .kiro/steering/project-*.md and open-source-contributor.md
   - Read issue json and plan json
   - Write PRD to:
     - ./oss-implementation-#{number}.md (root for user)
     - .constellation/oss/prds/oss-implementation-#{number}.md (internal copy)

7) Optional: Prompt to open PRD and/or open suggested files in the editor

8) Exit: Switching back to Default restores the last backup of .kiro/steering and keeps .constellation/oss for history.

---

## Feature Specification and Acceptance Criteria

A) Generic Agent Mode (refactor)
- AgentModeService replaces OnboardingModeService; supports 'Default' | 'Onboarding' | 'OpenSource'.
- AgentModeToggle.tsx replaces OnboardingModeToggle.tsx with a 3-option selector.
- Mode persistence via extension-config.service.ts.
- Backups stored under .constellation/steering/backup/; restore on Default.

B) OSS Persona Template
- src/personas/open-source.template.ts present and bundled.
- On switch to OpenSource, .kiro/steering/open-source-contributor.md is written from template.

C) Analysis + Steering Docs
- project-analysis.json produced with at least: detectedPatterns, keyDirs, codingConventions, testStrategy, graphStats.
- Steering docs .kiro/steering/project-{structure,tech,product,standings}.md generated using analysis.

D) Issue Processing
- Accepts valid GitHub issue URLs (or owner/repo#n syntax).
- Saves to .constellation/oss/issues/{owner}-{repo}-#{n}.json with comments and labels; piiScrubbed=true.

E) PRD Generation
- Uses both analysis and steering docs to tailor content.
- Writes PRD to repo root and mirrors into .constellation/oss/prds/.
- PRD contains: summary, scope, affected files, change plan, tests, risks, out-of-scope, acceptance criteria, repo-specific checklist.

---

## Implementation Notes

- Respect kebab-case naming and .ts suffix for new files.
- Consolidate mode config in extension-config.service.ts (per preference to consolidate serverId/node settings there already).
- UI is Preact with global CSS and shared Button.tsx as established.
- Security: reuse SecurityService for path validation; never expose tokens; store optional GITHUB_TOKEN only via env.
- Large project safety: incremental graph use; guardrail timeouts; graceful fallbacks like onboarding.

---

## Milestones (condensed)

1) Refactor to AgentModeService + AgentModeToggle
2) Add open-source.template.ts and persona rendering on switch
3) Add OSS analysis + steering docs generation
4) Add issue fetch + plan generation
5) Add PRD generation aligned to steering docs
6) Polish, docs, and UX prompts

---

## Success Metrics

- 80% of users who enable OpenSource mode generate both analysis and PRD successfully.
- PRDs include at least 5 repo-specific standards pulled from project-standings.md.
- Time from issue URL input to PRD < 5 minutes on medium repos.

---

## Appendix: Example PRD outline

- Title: Fix #{number}: <issue title>
- Context: link to issue; summary of analysis findings
- Scope: in-scope vs out-of-scope
- Proposed changes: per-file plan (source, tests)
- Standards checklist: extracted from project-standings.md
- Test plan: unit/integration specifics
- Risks/rollout: potential regressions, flags
- Acceptance criteria: observable behaviors
- References: related files, graph metrics

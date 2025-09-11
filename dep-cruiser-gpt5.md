# Dependency Cruiser POC Plan (gpt-5)

Scope
- Add a minimal, scalable proof-of-concept to run dependency-cruiser against either:
  1) The currently opened workspace (primary target), or
  2) The extension monorepo itself when running in development with no workspace open.
- Triggered from the VS Code Command Palette.
- No CI/CD wiring, no visuals beyond JSON + OutputChannel summary.
- Works in dev and packaged extension environments.

What we add
- Command: “Kiro: Dependency Scan (POC)” (id: kiro.deps.scan)
- Service: DependencyCruiserService (packages/extension/src/services/dependency-cruiser.service.ts)
  - Detects target directory:
    - Workspace folder if present
    - Otherwise, in Development mode, the repository root (two levels above extension package)
  - Spawns dependency-cruiser via npx and captures JSON output
  - Writes dependency-analysis.json in the target folder and opens it
  - Prints a short summary to an OutputChannel (Kiro: Dependency Analysis)

Why this shape
- Keeps extension runtime lean: we DO NOT bundle dependency-cruiser or its node_modules.
- Uses npx at runtime so devs/users don’t need a hard workspace dependency.
- Works in published VSIX as long as npx is available on PATH; otherwise the user can preinstall dependency-cruiser in their project.
- Service is isolated and easy to evolve (e.g., add config detection, rule packs, metrics extraction).

Usage
- Dev (Run Extension):
  1) Launch with the included “Run Extension” debug config.
  2) If you have a workspace open in the dev-host VS Code, the scan targets that workspace.
  3) If no workspace is open, the scan targets the repository root (monorepo) of this extension.
- Packaged VSIX:
  1) Install the built .vsix.
  2) Open any project folder.
  3) Run the command “Kiro: Dependency Scan (POC)”. The scan targets the opened folder.

Output
- dependency-analysis.json written to the scanned folder.
- OutputChannel summary: total modules, total dependencies (if reported), and violation count.

Assumptions and constraints
- Requires Node.js and npx on PATH in the environment where VS Code runs.
- If the environment is offline or lacks npx, users can install dependency-cruiser locally in their project and the service can be trivially adapted to prefer a local binary (`node_modules/.bin/dependency-cruiser`).
- We intentionally avoid coupling to any specific .dependency-cruiser.js for the POC. Future iterations may respect per-workspace configs when present.

Extensibility (future work, not in this POC)
- Prefer-local-binary: detect and use ./node_modules/.bin/dependency-cruiser if present.
- Config discovery: auto-detect .dependency-cruiser.(js|cjs|mjs|json) in the workspace and pass --config.
- Rule packs: ship a small ruleset for monorepos (e.g., disallow webview → extension imports) and allow users to opt-in.
- Metrics: compute derived metrics (cycles, cross-package edges, orphans) and present a concise report.
- Graph export: expose commands to produce DOT/SVG into the workspace (behind an explicit user action, no UI graph in the extension).
- Multi-root workspaces: offer a quick pick to choose the folder to analyze.

Notes for maintainers
- Implementation files:
  - packages/extension/src/services/dependency-cruiser.service.ts
  - packages/extension/src/extension.ts: registers kiro.deps.scan and wires the service
  - packages/extension/package.json: contributes the command and activation event
- The service is side-effect free with respect to the codebase; it only writes dependency-analysis.json to the selected folder and writes to the OutputChannel.

Verification steps
- Dev with no workspace open in the debug host:
  - Run “Kiro: Dependency Scan (POC)” → should analyze the repo root and write dependency-analysis.json at the monorepo root.
- Dev with a workspace open:
  - Run command → should analyze that workspace and write dependency-analysis.json at its root.
- Packaged VSIX:
  - Install .vsix, open a project, run the command → analysis should run and create dependency-analysis.json.
  - If it fails due to missing npx, the OutputChannel should clearly state the requirement.


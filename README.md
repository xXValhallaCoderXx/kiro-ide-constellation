# Kiro Constellation — Judge Guide

A Kiro Code extension that brings an AI-assisted code graph to your IDE: interactive dependency visualization, impact analysis, and a guided onboarding tour. This is a short, judge-friendly guide to install, run, and see the highlights.

Install the extension (VSIX)
- In Kiro Code: Extensions panel → "…" menu → Install from VSIX…
- Select the packaged file: kiro-constellation-<version>.vsix
- Reload when prompted

Open the Constellation panels
- Side panel: click the Constellation icon in the Activity Bar
- Graph view: Command Palette → "Constellation: Open Graph View" (or use the side panel button)

Key features (1–2 minutes)
- Dependency Graph (Preact webview) - Graph was a side idea from using dep-cruiser to provide context to the Agent
  - Interactive graph of your workspace with zoom, mini-map, and file info
  - Focus Mode: double‑click a node to spotlight its neighborhood; breadcrumb trail to navigate
  - Git activity overlays (recent churn, authorship) when available
- Guided Onboarding (Agent Mode)
  - Ask the AI to create a short tour for a topic; it opens files and highlights key ranges step‑by‑step
  - On the final step, the graph opens pre‑focused on the files you just visited- Guided Onboarding (Agent Mode)
- Open Source (Agent Mode)
  - Just a repo you want to contribute to
  - Select bootstrap MCP tool and run to setup project
  - Provide the URL of the issue you want to fix
  - The AI will create a PRD for you to provide the spec to Kiro to develop

- Impact Analysis (Broken)
  - Command: the system can compute all files impacted by a change to a given file and focus the graph on them
  - Paths are normalized to workspace ids so the graph always shows the right nodes


Quick start (optional, if you want to run from source)
```bash
npm install
npm run build
# Press F5 in VS Code to launch the Extension Development Host
```

Note
- There may be some bugs swapping between modes as i did best effort to retain old user steering docs etc, and if you cancel the dialogue that pops up 

License
MIT

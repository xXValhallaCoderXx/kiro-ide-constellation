# Usage

Quick start (development)

1) Install deps & compile
```bash
npm install
npm run build
```

2) Launch the Extension Development Host
- Press F5 (Run Extension or Run Extension (Dev MCP)).
- This starts TypeScript watch and a Vite watch build for the webview UI.
- On activation you should see a toast: "Kiro Constellation is set up. Reload Kiro to start the MCP server."

3) Reload the window
- Kiro reads MCP config on startup. Reload to have Kiro discover constellation-mcp.

4) Verify the server
- Open Kiro’s MCP panel and confirm constellation-mcp is running.
- Try the core tools:
  - `#[constellation-mcp] ping` → pong (also opens graph view)
  - `#[constellation-mcp] constellation_impactAnalysis { "filePath": "src/index.ts" }`
  - `#[constellation-mcp] constellation_onboarding.finalize { "chosenAction": "document" }`
- Try the onboarding tools (when in Onboarding mode):
  - `#[constellation-mcp] constellation_onboarding.plan { "request": "Show me how authentication works" }`
  - `#[constellation-mcp] constellation_onboarding.commitPlan { "plan": {...} }`
  - `#[constellation-mcp] constellation_onboarding.nextStep`

5) Open the side panel UI
- Click the Constellation icon in the Activity Bar to open the webview side panel.
- It should display the Constellation dashboard with mode toggle and walkthrough status.
- Use the Mode dropdown to switch between Default and Onboarding modes.

### Interactive Graph Exploration
- Open the side panel by clicking the Constellation icon in the Activity Bar
- Try double-clicking nodes to focus and explore dependencies
- Use breadcrumb navigation to move through your exploration history
- Adjust depth controls to see more or fewer relationship levels
- Test the reset functionality to return to full graph view

6) Dependency scan results
- On activation a background scan runs (non-blocking). Results are written to:
  - ./.constellation/data/codebase-dependencies.json
- To re-run manually: open the command palette and run "Constellation: Scan Dependencies".

7) Open the Graph tab
- From the side panel, click "Open Graph View".
- Or run the command "Constellation: Open Graph View".
- When you call the MCP tool #[constellation-mcp] ping, the Graph tab will also auto-open via the local HTTP bridge.

Helpful commands
- Constellation: Open user MCP config — Opens ~/.kiro/settings/mcp.json in the editor.
- Constellation: Scan Dependencies — Re-run dependency-cruiser on the workspace and overwrite the output file.

Where the config is
- User-level: ~/.kiro/settings/mcp.json (always updated by the extension)
- Workspace-level (optional): ./.kiro/settings/mcp.json (only written if you enable the setting and ./.kiro exists)

Notes
- The webview UI assets are built into out/ui. If the panel appears blank, run `npm run build:ui` and reload the window.
- You do not need to delete mcp.json during development. The extension upserts the constellation-mcp entry on activation.
- For code-only MCP server changes, you can restart just the server from the MCP panel—no full window reload needed.

Onboarding Mode
1) Open the Constellation side panel and use the Mode dropdown to switch from Default → Onboarding.
2) Confirm the dialog. The extension will:
|   - Move ./.kiro/steering → ./.constellation/steering/backup/<timestamp>
   - Create ./.kiro/steering/onboarding-guide.md from an embedded template
   - Show “Onboarding Mode” in the panel
3) To return to Default:
   - Switch Mode to Default and confirm. The extension attempts to restore from the most recent backup; if none exists, it creates an empty ./.kiro/steering and proceeds with a warning. On successful restore backups are removed; otherwise they are left intact for manual review.

Where files go (Onboarding)
- Persona file: ./.kiro/steering/onboarding-guide.md
- Backups (during Onboarding): ./.constellation/steering/backup/<timestamp>
- After returning to Default: backups are cleaned up automatically if restore succeeded.

## Graph Focus Mode Usage

### Basic Navigation
1. **Open the graph view**: Click the Constellation icon in the Activity Bar
2. **Focus on a node**: Double-click any node in the graph to focus on it
3. **Explore dependencies**: The graph will show only the focused node and its immediate dependencies
4. **Drill deeper**: Double-click any child node to make it the new focus
5. **Navigate back**: Use the breadcrumb trail at the top to jump to previous levels
6. **Reset view**: Click "Reset" to return to the full graph

### Breadcrumb Navigation
- **Visual trail**: Shows your exploration path like `UserService.ts ▶ AuthController.ts ▶ Database.ts`
- **Click to jump**: Click any breadcrumb to jump directly to that focus level
- **Keyboard shortcut**: Press `Esc` to step back one level
- **Smart labels**: File names are cleaned up (extensions removed) for better readability

### Depth Controls
- **Adjust depth**: Use the +/- buttons next to the breadcrumbs to control relationship depth
- **Depth levels**: Choose from 1-3 levels of dependencies, or "All" for full graph
- **Real-time updates**: Depth changes are applied immediately without re-layout
- **Performance**: Higher depths may be slower on large graphs (automatic warnings provided)

### Integration with Impact Analysis
1. **Run impact analysis**: Use `#[constellation-mcp] constellation_impactAnalysis { "filePath": "src/index.ts" }`
2. **Automatic focus**: The graph automatically focuses on the analyzed file
3. **Highlighted relationships**: Affected files are highlighted within the focused view
4. **Combined navigation**: Use breadcrumbs to explore the impact relationships
5. **Reset behavior**: Reset clears both focus and impact highlighting

### Performance Tips
- **Large graphs**: Focus mode automatically caps fan-out at 100 children per node
- **Memory management**: Position cache is automatically cleaned up during long sessions
- **Performance monitoring**: Console warnings appear if operations take >50ms
- **Optimization**: Use lower depths (1-2) for better performance on large codebases


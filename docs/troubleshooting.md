# Troubleshooting

No tools appear in the MCP panel or side panel is blank
- Did you reload the window after activation? Kiro re-reads MCP config on startup.
- Open ~/.kiro/settings/mcp.json and confirm the constellation-mcp entry exists with the correct absolute path.
- For the side panel, ensure out/ui/main.js and out/ui/style.css exist (run `npm run build:ui`). Reload the window.

Dependency scan issues
- Check the debug console for "Dependency scan stderr:" output for precise error messages.
- If the graph file ./.constellation/data/codebase-dependencies.json is missing, the MCP will trigger the `/scan` endpoint and retry automatically when generating onboarding plans.
- If your project does not have a dependency-cruiser config, the extension runs with --no-config by default. If you prefer a custom setup, add one (e.g., `.dependency-cruiser.cjs`).
- Ensure tsconfig.json is valid if present; the extension passes it to the CLI.
- Very large repos might hit the scan timeout (60s). Re-run on a narrower subfolder or adjust excludes.

Graph tab doesn’t open on ping
- Ensure the bridge env exists in ~/.kiro/settings/mcp.json under your server:
  - CONSTELLATION_BRIDGE_PORT, CONSTELLATION_BRIDGE_TOKEN
- The bridge listens on 127.0.0.1 only; this should work in local/WSL environments. If you’re in a remote with port sandboxing, open the Graph manually via the command.
- Test manually:
  - curl -s -X POST -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:<PORT>/open-graph -o /dev/null -w "%{http_code}\n"  # expect 204
- If the HTTP call fails, the ping tool still returns pong; check the Extension Host debug console for bridge logs/errors.

Self-test fails or setup toast shows an error
- Ensure Node 18+ is installed. The extension will refuse to proceed if Node is older.
- If node isn’t on PATH, set Constellation: Node Path to an absolute Node binary path.

Server starts but fails at runtime
- Open the MCP server logs (if available).
- Restart constellation-mcp from the MCP panel after building (npm run watch is handy).

I moved or renamed the repository, and now it can’t start
- The MCP config stores an absolute path to out/mcp.server.js. Re-run the extension to upsert the path.

I want to disable or remove the server
- Remove the constellation-mcp block from ~/.kiro/settings/mcp.json (and from ./.kiro/settings/mcp.json if you created one).
- Reload the window.

I want workspace-only configuration
- Create a ./.kiro directory in the workspace and enable Constellation: Write Workspace MCP Config.
- Optionally delete the user-level entry to isolate to this workspace only.

Onboarding mode issues
- Failed to switch to Onboarding mode: ENOENT
  - The extension now embeds the persona template and creates ./.kiro/steering if missing. If you still see ENOENT, check write permissions for the workspace and ./.kiro.
- ENAMETOOLONG or recursive backups
  - Backups are stored outside ./.kiro/steering to avoid recursion. Ensure backups live under ./.constellation/steering/backup.
- Restore fails (no backup found)
  - Switching back to Default will succeed even if no backup exists; the extension creates an empty ./.kiro/steering and shows a warning. If you want to recover a prior state, re-enable Onboarding to generate a new baseline or restore manually from any existing ./.constellation/steering/backup entry.
- After switching back to Default, backups still exist
  - The extension removes ./.constellation/steering/backup on successful restore. If a partial restore or failure occurred, backups are left intact for manual review.

## Graph Focus Mode Issues

### Performance Problems
- **Slow focus operations**: Check graph size and fan-out ratios. Large graphs (1000+ nodes) may need lower depth settings
- **Memory growth**: Monitor position cache size and cleanup frequency in console logs
- **Layout instability**: Verify position caching is working correctly - nodes should maintain positions during focus changes
- **Console warnings**: Operations >50ms will log performance warnings - consider optimizing graph structure

### Navigation Problems
- **Breadcrumbs not updating**: Check focus state management in GraphDashboard component
- **Esc key not working**: Verify keyboard event listeners are attached to document
- **Reset not clearing**: Ensure both focus and impact states are cleared when reset is clicked
- **Double-click not focusing**: Check that Cytoscape.js event handlers are properly registered

### Integration Issues
- **Impact analysis conflicts**: Verify focus mode activates correctly when impact analysis runs
- **Graph data problems**: Check graph validation and adjacency building in console
- **UI component errors**: Monitor browser console for React/Preact component issues
- **State synchronization**: Ensure focus state and graph state remain synchronized

### Large Graph Handling
- **Fan-out capping**: Focus mode limits to 100 children per node - check if this affects your use case
- **Depth limitations**: Maximum 3 levels of depth for performance - use lower depths for large graphs
- **Memory management**: Position cache is automatically cleaned up, but monitor for memory leaks
- **Performance degradation**: Use browser dev tools to profile performance with large datasets


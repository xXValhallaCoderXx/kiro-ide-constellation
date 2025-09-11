# Kiro IDE Constellation — Build and Dependency Report (gpt5-high)

This report documents the current build/dependency setup for your VS Code extension, identifies risks, and proposes a concrete, low-friction plan to improve bundling, outputs, and scripts. It also answers your questions about bundling the MCP SDK and sets targets for best compatibility.

Executive summary
- Split build outputs to avoid accidental clobbering: use out/web for Vite assets, out/extension for the extension bundle, out/mcp for the MCP server.
- Bundle the extension with tsup for tree-shaking and a single entry file; keep MCP bundling with esbuild (stable filename), but optionally unify to tsup later.
- Treat vscode and Node builtins as external for the extension; fully bundle MCP code including @modelcontextprotocol/sdk.
- Move @modelcontextprotocol/sdk to devDependencies since it is bundled into the MCP artefact.
- Use npm-run-all for reliable parallel watch instead of shell backgrounding (&).
- Keep activationEvents: onStartupFinished and engines.vscode: ^1.100.3. Target Node 18 for bundled outputs.


1) Current state snapshot
- Build tools
  - WebView UI: Vite + Preact. Config: web/vite.config.ts → outputs to out/ with emptyOutDir: true and manifest: true.
  - Extension: TypeScript compiled by tsc → out/.
  - MCP stdio server: esbuild bundles src/mcp/mcp-stdio.server.ts → out/mcp/mcpStdioServer.cjs.
- Packaging
  - .vscodeignore excludes node_modules/**, .ts, .map. This relies on bundling and compiled JS in out/.
- Scripts (package.json)
  - compile builds web, then tsc, then bundle:mcp (esbuild).
  - watch spawns three processes in background via &.
  - build cleans out/ and web .js/.map, then compile.
- Asset loading
  - src/ui-providers/asset-manifest.ts reads out/.vite/manifest.json and falls back to predictable names in out/.
- Providers
  - Sidebar and Dashboard include localResourceRoots pointing to extensionUri/media and extensionUri/out.
- MCP provider
  - Resolves the MCP stdio bundle from out/mcp, preferring mcpStdioServer.cjs.

Relevant references
- package.json scripts and deps: lines 54–67 and 68–87
- tsconfig.json outDir: line 5 ("out")
- web/vite.config.ts: build.manifest true; build.outDir "out"; emptyOutDir true
- src/ui-providers/asset-manifest.ts: reads out/.vite/manifest.json and defaults to out/<entry>.js/css
- .vscodeignore excludes node_modules/** and sources
- src/mcp/mcp.provider.ts resolves out/mcp/mcpStdioServer.cjs|.js|.mjs


2) Risks and pain points
- Vite’s emptyOutDir: true with outDir: "out" can wipe the entire out/ folder when the web build runs, potentially deleting the compiled extension and MCP artefacts during watch or rebuild.
- Mixed build tools with fragile orchestration: watch uses shell background processes (&), which can be brittle and harder to manage/stop across platforms.
- Dependency classification: @modelcontextprotocol/sdk is listed under dependencies but is not needed at runtime because the MCP server is bundled; shipping it as a runtime dependency is unnecessary and confusing.
- Tree-shaking and extension bundle size: tsc does not tree-shake; moving to a bundler for the extension can reduce size and centralize build logic.
- Web asset fallback CSS: asset-manifest.ts always injects a fallback CSS even when none is generated, leading to noisy 404s in devtools (harmless but avoidable).


3) Recommendations and concrete changes
3.1 Split outputs and adjust manifest loader
- Change Vite outDir to out/web so web builds cannot clobber out/ (extension or MCP artefacts).
- Update asset-manifest.ts to read the manifest from out/web/.vite/manifest.json and use out/web as the fallback base.
- Optional: Check for CSS file existence in the fallback path to avoid 404s when no CSS was emitted.

Patch: web/vite.config.ts
```diff
--- a/web/vite.config.ts
+++ b/web/vite.config.ts
@@
 export default defineConfig({
   plugins: [preact()],
   // No 'root' property, so it defaults to the project root.
   build: {
-    // 'out' is relative to the project root.
-    outDir: 'out',
+    // write web assets under out/web to avoid clobbering extension/MCP artefacts
+    outDir: 'out/web',
     emptyOutDir: true,
     manifest: true,
     rollupOptions: {
       input: {
         // Paths are relative to the project root.
         sidebar: 'web/src/main-sidebar.tsx',
         dashboard: 'web/src/main-dashboard.tsx',
       },
       output: {
         // Simplified output naming.
         entryFileNames: '[name].js',
         // Ensure CSS and other assets have predictable names so the extension can reference them.
         assetFileNames: '[name][extname]'
       },
     },
   },
 });
```

Patch: src/ui-providers/asset-manifest.ts
```diff
--- a/src/ui-providers/asset-manifest.ts
+++ b/src/ui-providers/asset-manifest.ts
@@
 export function loadManifest(context: vscode.ExtensionContext): Manifest | null {
   if (cached) {
     return cached;
   }
   try {
-    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'out', '.vite', 'manifest.json');
+    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'out', 'web', '.vite', 'manifest.json');
     const json = fs.readFileSync(manifestUri.fsPath, 'utf-8');
     cached = JSON.parse(json) as Manifest;
     return cached;
   } catch {
     return null;
   }
 }
@@
   if (!manifest) {
     // Fallback to deterministic names when manifest not available
-    const base = vscode.Uri.joinPath(context.extensionUri, 'out');
-    const script = webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`));
-    const css = [webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.css`))];
-    return { script, css };
+    const base = vscode.Uri.joinPath(context.extensionUri, 'out', 'web');
+    const script = webview.asWebviewUri(vscode.Uri.joinPath(base, `${entry}.js`));
+    const cssPath = vscode.Uri.joinPath(base, `${entry}.css`);
+    const css = fs.existsSync(cssPath.fsPath) ? [webview.asWebviewUri(cssPath)] : [];
+    return { script, css };
   }
@@
-  const script = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', info.file));
-  const css = (info.css ?? []).map((c) => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', c)));
+  const script = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', 'web', info.file));
+  const css = (info.css ?? []).map((c) => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', 'web', c)));
   return { script, css };
 }
```

Notes
- localResourceRoots in your providers already include extensionUri/out, so out/web is permitted without further changes.


3.2 Bundle the extension with tsup (tree-shaken, CJS)
- Add tsup as a devDependency and bundle src/extension.ts → out/extension/extension.js with format=cjs, platform=node, target=node18.
- Externalize vscode to avoid bundling it; Node builtins stay external automatically.
- Keep tsc for type checking only (noEmit) via a dedicated script.

Scripts (package.json)
```jsonc
{
  "main": "./out/extension/extension.js",
  "scripts": {
    "typecheck": "tsc -p ./ --noEmit",

    "build:web": "vite build --config web/vite.config.ts",
    "build:ext": "tsup src/extension.ts --format=cjs --platform=node --target=node18 --sourcemap --treeshake --out-dir out/extension --external:vscode",
    "build:mcp": "npm run bundle:mcp",

    "compile": "npm-run-all -s build:web build:ext build:mcp",
    "watch:web": "vite build --watch --config web/vite.config.ts",
    "watch:ext": "tsup src/extension.ts --watch --format=cjs --platform=node --target=node18 --out-dir out/extension --external:vscode",
    "watch": "npm-run-all -p watch:web watch:ext watch:mcp",

    "vscode:prepublish": "npm run build",
    "build": "npm run clean && npm run clean:web && npm run compile"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "npm-run-all": "^4.1.5"
  }
}
```

Why tsup
- tsup wraps esbuild, giving you tree-shaking and a clean single-file extension entry that reduces package size.
- Keeping the extension as CJS (format=cjs) is broadly compatible with VS Code’s extension host.


3.3 Keep esbuild for MCP bundling (for now)
- Your MCP provider expects and prefers out/mcp/mcpStdioServer.cjs. The existing esbuild scripts already generate this. Keep them to avoid file naming churn.
- If you later want to unify on tsup, add a tsup config that outputs out/mcp/mcpStdioServer.cjs (using an entry alias and outExtension cjs=.cjs) and delete the esbuild scripts. The MCP provider already checks .cjs/.js/.mjs, but it does not check mcp-stdio.server.cjs; keeping the current filename avoids code changes.

Current MCP scripts (keep)
```jsonc
{
  "scripts": {
    "bundle:mcp": "esbuild src/mcp/mcp-stdio.server.ts --bundle --platform=node --format=cjs --target=node18 --outfile=out/mcp/mcpStdioServer.cjs",
    "watch:mcp": "esbuild src/mcp/mcp-stdio.server.ts --bundle --platform=node --format=cjs --target=node18 --outfile=out/mcp/mcpStdioServer.cjs --watch"
  }
}
```

Bundling the MCP SDK (best practice in this setup)
- Yes, bundle @modelcontextprotocol/sdk into the MCP artefact. This avoids shipping node_modules in the .vsix and makes the server self-contained. The SDK is a pure TS/JS package and safe to bundle.
- Move @modelcontextprotocol/sdk to devDependencies; it is not a runtime dependency of the extension package when you ship a bundled MCP server.


3.4 Robust watch orchestration
- Replace shell backgrounding (&) with npm-run-all to run concurrent tasks: watch:web, watch:ext, watch:mcp.
- This is more reliable cross-platform and easier to stop/clean up.

Example changes are included in 3.2’s “Scripts”.


3.5 Dependency classification adjustments
- Move to devDependencies:
  - @modelcontextprotocol/sdk (bundled into MCP output)
- Keep in devDependencies (already): vite, preact, eslint, typescript, tsup, esbuild (until/unless MCP switches to tsup), npm-run-all, rimraf, @types/*, @vscode/*.
- dependencies should ideally be empty (unless you have true runtime deps required by the on-disk extension after bundling). This keeps the .vsix lean and avoids node_modules.


3.6 Targets and compatibility
- Keep engines.vscode: ^1.100.3.
- Use target: node18 for both tsup (extension) and esbuild (MCP). This aligns well with current VS Code extension host runtimes and offers good compatibility.
- Keep activationEvents: onStartupFinished as-is, per your preference.


3.7 Linting and testing niceties (optional but recommended)
- Lint web/ as well as src/:
```jsonc
{
  "scripts": {
    "lint": "eslint src web/src"
  }
}
```
- Keep tsc for type-checking only via "typecheck".
- Your test setup is fine; you can decide whether pretest should build the web assets (often not necessary for extension activation tests).


4) Validation checklist
- Install updated dev deps
  - npm install
- Build
  - npm run build
- Expected outputs
  - out/web: sidebar.js, dashboard.js, any emitted CSS, and .vite/manifest.json
  - out/extension: extension.js (single-file bundle)
  - out/mcp: mcpStdioServer.cjs
- Package
  - npm run package (vsce package) should generate a .vsix with no node_modules and with the three output areas above plus media/.
- Run in Extension Development Host
  - F5, ensure the Activity Bar and Sidebar load; clicking “Open Graph” opens Dashboard.
  - Web assets load via manifest or deterministic fallback under out/web.
  - MCP stdio tool constellation_ping posts to the HTTP bridge and triggers the dashboard open.
- Watch mode
  - npm run watch
  - Confirm that repeated Vite rebuilds no longer delete extension/MCP outputs.


5) Appendix: Suggested diffs and references
- Vite outDir change: web/vite.config.ts (see patch 3.1)
- asset-manifest path/fallback update: src/ui-providers/asset-manifest.ts (see patch 3.1)
- package.json scripts
  - Add: build:web, build:ext, watch:ext, compile using npm-run-all; update main to out/extension/extension.js.
  - Keep: esbuild bundle:mcp/watch:mcp.
  - Keep vscode:prepublish → build.
- .vscodeignore remains valid (excludes node_modules/** and sources). No changes required.
- Notable code that expects current file layout
  - MCP provider checks out/mcp/mcpStdioServer.* — we kept that filename.
  - Providers’ localResourceRoots include extensionUri/out — covers out/web.


Q&A highlights
- Should we bundle @modelcontextprotocol/sdk? Yes. In this packaging model, bundling yields a self-contained MCP artefact and avoids shipping node_modules. Move the SDK to devDependencies and keep esbuild’s MCP bundle.
- Best bundler for the extension? tsup (esbuild-based) with externalized vscode provides tree-shaking and small output.
- Activation onStartupFinished? Keep as-is per your preference.
- Node/engine targets? engines.vscode: ^1.100.3, target node18 for build outputs.


Proposed next steps
- Apply the patches above (vite outDir, asset-manifest adjustments, package.json scripts/main, devDependencies changes).
- Install new dev deps (tsup, npm-run-all).
- Build, run, and package.
- If desired later, unify MCP bundling to tsup and remove the esbuild devDependency, but keep filename compatibility (mcpStdioServer.cjs) or update the provider candidates.

—
Generated by gpt-5 (high reasoning).

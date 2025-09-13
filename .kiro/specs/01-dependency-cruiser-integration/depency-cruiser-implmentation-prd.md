# Dependency Cruiser – initial implementation plan

Goal
- Add a background scan of the user’s currently opened workspace using Dependency Cruiser and write its results to:
  - ./.constellation/data/codebase-dependencies.json
- A single exported function runScan() in src/services/depency-cruiser.service.ts
- Trigger runScan() automatically on extension activation (non-blocking).

Scope (v1)
- Read-only analysis. No UI yet beyond existing side panel.
- Single workspace focus (first workspace folder if multiple). No-workspace = no-op.
- JS/TS projects primarily. Other file types are ignored by dependency-cruiser by default.

Deliverables
- New service file: src/services/depency-cruiser.service.ts with:
  - export async function runScan(context: vscode.ExtensionContext): Promise<void>
- Activation call: invoked in the background in activate(), reusing the existing non-blocking pattern.
- Output file: .constellation/data/codebase-dependencies.json in the first workspace folder.

High-level design
1) Dependency Cruiser integration
   - Use the CLI that ships with the dependency-cruiser package to avoid ESM/CommonJS interop friction.
   - Spawn a child process: node <extensionPath>/node_modules/dependency-cruiser/bin/depcruise.js
   - Arguments:
     - scan target: the workspace root path
     - --output-type json (print JSON to stdout)
     - --exclude "node_modules|dist|out|build|coverage|\.git|\.vscode|\.constellation" (trim noise)
     - Optionally add --ts-config <path> if a tsconfig.json exists at the workspace root
     - Disable progress to keep output clean if necessary (--progress false if supported)

2) Output format (file)
   - Write the raw dependency-cruiser JSON under a thin envelope so we can version and add metadata later:
   {
     "version": 1,
     "generatedAt": "2025-..",
     "workspaceRoot": "/abs/path",
     "depcruise": { /* full tool output (graph + summary) */ }
   }

3) UX & performance
   - Fire-and-forget in the background so activation/UI is never blocked.
   - Soft timeout (e.g., 45–60s). Kill process if it runs too long.
   - File I/O: ensure ./.constellation/data exists (mkdir -p) and write pretty JSON.

4) Error handling
   - If dependency-cruiser is unavailable or the process fails, log a warning and continue (no user-facing error toast in v1).
   - If there’s no workspace open, no-op.

Implementation steps
1) Add runtime dependency
   - package.json → dependencies: "dependency-cruiser": "^16.x" (or latest).
   - Rationale: Needed at runtime inside the installed extension, not only for development.

2) Service: src/services/depency-cruiser.service.ts (kebab-case .ts)
   - Responsibilities:
     - Resolve workspace root (vscode.workspace.workspaceFolders?.[0])
     - Resolve CLI path: <context.extensionUri.fsPath>/node_modules/dependency-cruiser/bin/depcruise.js
     - Optionally detect a tsconfig.json in the workspace root
     - Spawn: node [depcruise.js, "--output-type", "json", "--exclude", PATTERN, ... , workspaceRoot]
     - Collect stdout, parse JSON, wrap with metadata, and write to ./.constellation/data/codebase-dependencies.json
     - Return void; never throw synchronously (catch and log)

   - Pseudocode (illustrative):
   ```ts
   import * as vscode from 'vscode'
   import * as fs from 'node:fs/promises'
   import * as path from 'node:path'
   import { spawn } from 'node:child_process'

   export async function runScan(context: vscode.ExtensionContext): Promise<void> {
     const ws = vscode.workspace.workspaceFolders?.[0]
     if (!ws) return
     const wsRoot = ws.uri.fsPath

     const cli = path.join(context.extensionUri.fsPath, 'node_modules', 'dependency-cruiser', 'bin', 'depcruise.js')

     const tsconfig = path.join(wsRoot, 'tsconfig.json')
     const tsExists = await fs.access(tsconfig).then(() => true).catch(() => false)

     const args = [
       cli,
       '--output-type', 'json',
       '--exclude', 'node_modules|dist|out|build|coverage|\\.git|\\.vscode|\\.constellation',
       ...(tsExists ? ['--ts-config', tsconfig] : []),
       wsRoot
     ]

     const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] })

     const out: string[] = []
     child.stdout.on('data', (d) => out.push(String(d)))

     const result = await new Promise<string>((resolve, reject) => {
       const to = setTimeout(() => { try { child.kill() } catch {} ; reject(new Error('depcruise timeout')) }, 60000)
       child.on('error', reject)
       child.on('close', (code) => { clearTimeout(to); code === 0 ? resolve(out.join('')) : reject(new Error('depcruise exit ' + code)) })
     })

     const parsed = JSON.parse(result)

     const dir = path.join(wsRoot, '.constellation', 'data')
     await fs.mkdir(dir, { recursive: true })
     const file = path.join(dir, 'codebase-dependencies.json')

     const payload = {
       version: 1,
       generatedAt: new Date().toISOString(),
       workspaceRoot: wsRoot,
       depcruise: parsed,
     }

     await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8')
   }
   ```

3) Wire into activation (non-blocking)
   - In src/extension.ts:
     - import { runScan } from './services/depency-cruiser.service.js'
     - Inside the existing background IIFE (where MCP setup runs), call: void runScan(context)
     - Keep this behind try/catch to avoid disrupting activation.

4) (Optional) Setting flag to control scan
   - constellation.scanOnActivate (boolean, default true). Not required for v1, but easy to add if desired.

5) (Optional) Command to run on demand
   - Command id: constellation.scanDependencies
   - Useful for re-scans without reloading the window.

Testing
- Open a small TS/JS workspace with imports and run F5.
- Verify ./.constellation/data/codebase-dependencies.json exists and contains a large JSON graph.
- Test a large workspace for timeout behavior (ensure it doesn’t block UI).

Future iterations
- Graph rendering in the side panel (Preact):
  - Add a model/adapter that converts dependency-cruiser output to a graph format consumable by GraphDashboard.tsx.
  - Provide filters (by folder, package.json name, circulars, or orphaned).
  - Streaming/worker to keep the UI responsive for large graphs.
- Incremental scans / cache: only rescan on git changes.
- Multi-root workspaces: scan each root and write multiple files (or one merged with roots array).
- Add unit tests to parse a snapshot of a known repo and validate the output envelope.

Risks & mitigations
- Performance on large repos: mitigate with timeout + async background execution.
- CLI availability: we vend dependency-cruiser in dependencies and call the JS CLI directly via node.
- Path escaping on Windows: spawn node with explicit JS path avoids .cmd wrappers.
- Output size: could be big; consider gzip in the future; for now, plain JSON for readability.


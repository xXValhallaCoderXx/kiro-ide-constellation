import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

interface WorkspaceInfo {
    root: string;
    hasTsConfig: boolean;
}

interface DependencyAnalysisResult {
    version: 1;
    generatedAt: string;
    workspaceRoot: string;
    depcruise: any;
}

/**
 * Detects and validates the current workspace
 * @returns WorkspaceInfo object or null if no workspace is available
 */
import { getWorkspaceRoot } from './workspace.service.js';

function detectWorkspace(): WorkspaceInfo | null {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return null;
    }

    // Check for TypeScript config
    const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
    const hasTsConfig = fs.existsSync(tsconfigPath);

    return {
        root: workspaceRoot,
        hasTsConfig
    };
}

/**
 * Resolves the dependency-cruiser CLI path from the extension context
 * @param context VS Code extension context
 * @returns Absolute path to the dependency-cruiser CLI
 */
function resolveCLIPath(context: vscode.ExtensionContext): string | null {
    const nm = path.join(context.extensionUri.fsPath, 'node_modules');
    const candidates = [
        // ESM CLI (v16+):
        path.join(nm, 'dependency-cruiser', 'bin', 'dependency-cruise.mjs'),
        // Legacy commonjs fallback (older versions):
        path.join(nm, 'dependency-cruiser', 'bin', 'depcruise.js'),
        // .bin shims as a last resort:
        path.join(nm, '.bin', 'depcruise'),
        path.join(nm, '.bin', 'dependency-cruise'),
    ];
    for (const c of candidates) {
        try { if (fs.existsSync(c)) { return c; } } catch { /* ignore */ }
    }
    return null;
}

/**
 * Builds CLI arguments array for dependency-cruiser
 * @param workspace WorkspaceInfo containing root path and config details
 * @returns Array of CLI arguments
 */
function detectDepCruiserConfig(wsRoot: string): string | null {
    const candidates = [
        '.dependency-cruiser.js',
        '.dependency-cruiser.cjs',
        '.dependency-cruiser.mjs',
        'dependency-cruiser.config.js',
        'dependency-cruiser.config.cjs'
    ];
    for (const rel of candidates) {
        const p = path.join(wsRoot, rel);
        try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
    }
    return null;
}

function buildCLIArguments(workspace: WorkspaceInfo): string[] {
    const args = [
        '--output-type', 'json',
        '--exclude', 'node_modules|dist|out|build|coverage|\\.git|\\.vscode|\\.constellation'
    ];

    // Respect a project config if present; otherwise run with --no-config
    const cfg = detectDepCruiserConfig(workspace.root);
    if (cfg) {
        args.push('--config', cfg);
    } else {
        args.push('--no-config');
    }

    // Add TypeScript config if available; use absolute path to avoid cwd issues
    if (workspace.hasTsConfig) {
        args.push('--ts-config', path.join(workspace.root, 'tsconfig.json'));
    }

    // Add workspace root as the target directory (directory scanning is supported)
    args.push(workspace.root);

    return args;
}

interface ScanProcess {
    child: ChildProcess;
    timeout: NodeJS.Timeout | null;
    stdout: string[];
    promise: Promise<string>;
}

/**
 * Spawns the dependency-cruiser CLI process with timeout and error handling
 * @param cliPath Path to the dependency-cruiser CLI
 * @param cliArgs Arguments for the CLI
 * @returns Promise that resolves with the collected stdout data
 */
function spawnScanProcess(cliPath: string, cliArgs: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const stdout: string[] = [];
        const stderr: string[] = [];
        let timeoutHandle: NodeJS.Timeout | null = null;
        let isResolved = false;

        // Spawn the child process (cwd = workspace root)
        const child = spawn('node', [cliPath, ...cliArgs], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd
        });

        // Set up 30-second timeout (Requirements: R2.4)
        timeoutHandle = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                console.warn('Dependency scan timed out after 30 seconds, killing process');
                child.kill('SIGTERM');

                // Force kill if SIGTERM doesn't work
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 5000);

                reject(new Error('Scan process timed out'));
            }
        }, 30000);

        // Collect stdout data
        child.stdout?.on('data', (data: Buffer) => {
            stdout.push(data.toString());
        });

        // Collect stderr for diagnostics
        child.stderr?.on('data', (data: Buffer) => {
            const s = data.toString();
            stderr.push(s);
        });

        // Handle process completion
        child.on('close', (code) => {
            if (isResolved) {return;}
            isResolved = true;

            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }

            if (code === 0) {
                resolve(stdout.join(''));
            } else {
                const errText = stderr.join('');
                if (errText) {
                    console.warn('Dependency scan stderr:', errText);
                }
                console.warn(`Dependency scan process exited with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        // Handle process errors
        child.on('error', (error) => {
            if (isResolved) {return;}
            isResolved = true;

            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }

            console.error('Dependency scan process error:', error);
            reject(error);
        });
    });
}

/**
 * Main function to run dependency analysis scan on the current workspace
 * @param context VS Code extension context for path resolution
 */
export async function runScan(context: vscode.ExtensionContext): Promise<void> {
    // Detect workspace and perform no-op if none available
    const workspace = detectWorkspace();
    if (!workspace) {
        return; // No workspace open, perform no operation
    }

    // Resolve CLI path and build arguments
    const cliPath = resolveCLIPath(context);
    const cliArgs = buildCLIArguments(workspace);

    try {
        // Check if CLI exists
        if (!cliPath) {
            console.warn(`dependency-cruiser CLI not found in expected locations under ${path.join(context.extensionUri.fsPath, 'node_modules')}, skipping scan`);
            return;
        }

        console.log(`Running dependency scan with CLI at: ${cliPath}`);
        console.log(`Dependency scan args: ${JSON.stringify(cliArgs)}`);

        // Spawn process and collect output
        const output = await spawnScanProcess(cliPath, cliArgs, workspace.root);

        // Parse JSON output
        let parsedOutput;
        try {
            parsedOutput = JSON.parse(output);
        } catch (parseError) {
            console.error('Failed to parse dependency-cruiser output as JSON:', parseError);
            return;
        }

        // Create versioned envelope with metadata
        const result: DependencyAnalysisResult = {
            version: 1,
            generatedAt: new Date().toISOString(),
            workspaceRoot: workspace.root,
            depcruise: parsedOutput
        };

        // Ensure output directory exists
        const outputDir = path.join(workspace.root, '.constellation', 'data');
        try {
            fs.mkdirSync(outputDir, { recursive: true });
        } catch (mkdirError) {
            console.error('Failed to create output directory:', mkdirError);
            return;
        }

        // Write formatted JSON output
        const outputPath = path.join(outputDir, 'codebase-dependencies.json');
        try {
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
            console.log('Dependency analysis completed successfully');
        } catch (writeError) {
            console.error('Failed to write dependency analysis results:', writeError);
        }
    } catch (error) {
        // Comprehensive error handling - log but don't disrupt extension
        if (error instanceof Error) {
            if (error.message.includes('timed out')) {
                console.warn('Dependency scan timed out - this may indicate a large repository');
            } else if (error.message.includes('ENOENT')) {
                console.warn('dependency-cruiser CLI not found, ensure it is installed');
            } else {
                console.error('Dependency scan failed:', error.message);
            }
        } else {
            console.error('Dependency scan failed with unknown error:', error);
        }
    }
}
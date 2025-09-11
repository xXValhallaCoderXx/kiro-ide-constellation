const { build } = require('esbuild');

const watch = process.argv.includes('--watch');

(async () => {
  try {
    await build({
      entryPoints: ['src/mcp/mcp-stdio.server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      outfile: 'out/mcp/mcpStdioServer.cjs',
      external: ['node:*'], // keep node builtins external; bundle the MCP SDK inside
      minify: true,
      treeShaking: true,
      sourcemap: true,
      metafile: true,
      logLevel: 'info',
      watch: watch ? {
        onRebuild(error, result) {
          if (error) {
            console.error('[MCP] Rebuild failed:', error);
          } else {
            console.log('[MCP] Rebuild succeeded:', result && result.warnings?.length ? 'with warnings' : '');
          }
        }
      } : false,
    });
    console.log(`[MCP] Build ${watch ? 'watching' : 'completed'} → out/mcp/mcpStdioServer.cjs`);
  } catch (err) {
    console.error('[MCP] Build failed:', err);
    process.exit(1);
  }
})();


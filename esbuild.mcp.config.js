const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [path.resolve(__dirname, 'packages/mcp-server/src/server.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: path.resolve(__dirname, 'packages/extension/out/mcp/mcpStdioServer.cjs'),
  external: ['node:*'], // keep node builtins external; bundle the MCP SDK inside
  minify: true,
  treeShaking: true,
  sourcemap: true,
  metafile: true,
  logLevel: 'info',
};

(async () => {
  try {
    if (watch) {
      const ctx = await esbuild.context(options);
      await ctx.watch();
      console.log('[MCP] Watch mode enabled');
    } else {
      await esbuild.build(options);
      console.log('[MCP] Build completed → packages/extension/out/mcp/mcpStdioServer.cjs');
    }
  } catch (err) {
    console.error('[MCP] Build failed:', err);
    process.exit(1);
  }
})();


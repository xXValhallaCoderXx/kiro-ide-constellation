#!/usr/bin/env bash
# scripts/analyze-bundles.sh
set -euo pipefail

pnpm build > /dev/null

report_size() {
  if [ -f "$1" ]; then
    printf "%s: " "$1"
    du -sh "$1" | awk '{print $1}'
  else
    printf "%s: (missing)\n" "$1"
  fi
}

echo "Bundle Sizes Report - $(date)"
echo "=============================="
report_size packages/extension/out/extension.js
report_size packages/extension/out/mcp/mcpStdioServer.cjs
report_size packages/extension/out/sidebar.js
report_size packages/extension/out/dashboard.js

if [ -f packages/webview/bundle-stats.html ]; then
  echo "Web bundle report: packages/webview/bundle-stats.html"
fi


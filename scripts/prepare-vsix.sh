#!/usr/bin/env bash
# scripts/prepare-vsix.sh
set -euo pipefail

EXT_DIR="packages/extension"
SHARED_DIR="packages/shared"
SHARED_OUT="$SHARED_DIR/out"
EXT_OUT="$EXT_DIR/out"
EXT_SHARED_OUT="$EXT_OUT/shared"

# Ensure shared is built
pnpm --filter @kiro/shared run build

# Copy shared runtime into extension's out tree to avoid node_modules dependency
rm -rf "$EXT_SHARED_OUT"
mkdir -p "$EXT_SHARED_OUT"
rsync -a "$SHARED_OUT/" "$EXT_SHARED_OUT/"

# Rewrite any references to @kiro/shared to a local ./shared/index.js in compiled JS
while IFS= read -r -d '' file; do
  sed -i "s|\"@kiro/shared\"|\"./shared/index.js\"|g" "$file" || true
  sed -i "s|'@kiro/shared'|'./shared/index.js'|g" "$file" || true
done < <(find "$EXT_OUT" -type f -name "*.js" -print0)

echo "Prepared embedded shared runtime at $EXT_SHARED_OUT and rewrote imports."


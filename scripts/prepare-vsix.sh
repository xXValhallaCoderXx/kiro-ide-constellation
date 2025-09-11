#!/usr/bin/env bash
# scripts/prepare-vsix.sh
set -euo pipefail

EXT_DIR="packages/extension"
SHARED_DIR="packages/shared"
DEST_DIR="$EXT_DIR/node_modules/@kiro/shared"

# Ensure shared is built
pnpm --filter @kiro/shared run build

# Recreate destination
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy package.json and out from shared
cp "$SHARED_DIR/package.json" "$DEST_DIR/package.json"
rsync -a "$SHARED_DIR/out/" "$DEST_DIR/out/"

echo "Prepared local node_modules for @kiro/shared in $DEST_DIR"


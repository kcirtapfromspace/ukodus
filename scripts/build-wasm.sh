#!/usr/bin/env bash
set -euo pipefail

# Build WASM from the upstream sudoku repo's sudoku-wasm crate.
# Outputs wasm + JS glue to frontend/wasm/
#
# Requirements:
#   - wasm-pack (cargo install wasm-pack)
#   - The upstream sudoku repo at SUDOKU_REPO_DIR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUDOKU_REPO_DIR="${SUDOKU_REPO_DIR:-/Users/thinkstudio/tui/sudoku}"
OUTPUT_DIR="$PROJECT_ROOT/frontend/wasm"

if [ ! -d "$SUDOKU_REPO_DIR/crates/sudoku-wasm" ]; then
    echo "ERROR: sudoku-wasm crate not found at $SUDOKU_REPO_DIR/crates/sudoku-wasm"
    echo "Set SUDOKU_REPO_DIR to the upstream sudoku repo path."
    exit 1
fi

if ! command -v wasm-pack &>/dev/null; then
    echo "ERROR: wasm-pack not found. Install with: cargo install wasm-pack"
    exit 1
fi

echo "Building WASM from $SUDOKU_REPO_DIR/crates/sudoku-wasm ..."
wasm-pack build "$SUDOKU_REPO_DIR/crates/sudoku-wasm" \
    --target web \
    --out-dir "$OUTPUT_DIR" \
    --out-name sudoku

# Clean up files we don't need in the frontend
rm -f "$OUTPUT_DIR/.gitignore" "$OUTPUT_DIR/package.json"

echo "WASM build complete. Output in $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR"/*.wasm "$OUTPUT_DIR"/*.js 2>/dev/null || true

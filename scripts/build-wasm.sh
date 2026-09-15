#!/usr/bin/env bash
set -euo pipefail

# Build the browser game against the same vendored core as the analyzer.
# Outputs WASM + JS glue to frontend/static/wasm/.
#
# Requirements:
#   - wasm-pack (cargo install wasm-pack)
#   - wasm32-unknown-unknown target (rustup target add wasm32-unknown-unknown)
#   - Python 3 (for source and artifact provenance)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CRATE_DIR="$PROJECT_ROOT/vendor/sudoku-wasm"
OUTPUT_DIR="$PROJECT_ROOT/frontend/static/wasm"

if [ ! -f "$CRATE_DIR/Cargo.toml" ] || [ ! -f "$PROJECT_ROOT/vendor/sudoku-core/Cargo.toml" ]; then
    echo "ERROR: vendored sudoku-wasm and sudoku-core sources are required."
    exit 1
fi

if ! command -v wasm-pack &>/dev/null; then
    echo "ERROR: wasm-pack not found. Install with: cargo install wasm-pack"
    exit 1
fi

# Stage the complete bundle so a failed build cannot replace working assets.
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ukodus-wasm.XXXXXX")"
trap 'rm -rf "$STAGING_DIR"' EXIT

echo "Building WASM from $CRATE_DIR ..."
wasm-pack build "$CRATE_DIR" \
    --target web \
    --out-dir "$STAGING_DIR" \
    --out-name sudoku_wasm \
    --locked

python3 "$SCRIPT_DIR/wasm-provenance.py" "$STAGING_DIR"

mkdir -p "$OUTPUT_DIR"
for file in sudoku_wasm.js sudoku_wasm_bg.wasm sudoku_wasm.d.ts sudoku_wasm_bg.wasm.d.ts package.json provenance.json; do
    cp "$STAGING_DIR/$file" "$OUTPUT_DIR/$file"
done

echo "WASM build complete. Output in $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR"/*.wasm "$OUTPUT_DIR"/*.js 2>/dev/null || true

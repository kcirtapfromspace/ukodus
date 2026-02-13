#!/usr/bin/env bash
set -euo pipefail

# Sync sudoku-core from the upstream sudoku repository.
# Uses git subtree to pull the latest solver and core library code.
#
# This keeps Ukodus in sync with upstream improvements to the
# Sudoku solver, generator, and technique library.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/kcirtapfromspace/sudoku.git}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"

cd "$PROJECT_ROOT"

echo "Syncing sudoku-core from upstream..."
echo "  Repo:   $UPSTREAM_URL"
echo "  Branch: $UPSTREAM_BRANCH"
echo ""

git subtree pull \
    --prefix=crates/sudoku-core \
    "$UPSTREAM_URL" \
    "$UPSTREAM_BRANCH" \
    --squash \
    -m "chore: sync sudoku-core from upstream"

echo ""
echo "Sync complete. Run 'cargo test -p sudoku-core' to verify."

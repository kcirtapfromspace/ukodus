#!/usr/bin/env bash
# Run every coverage gate using a uniquely named disposable Compose project.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

run_frontend=1
case "${1:-}" in
  "") ;;
  --rust-only) run_frontend=0 ;;
  *) printf 'Usage: %s [--rust-only]\n' "$0" >&2; exit 2 ;;
esac
if (( $# > 1 )); then
  printf 'Only --rust-only is supported.\n' >&2
  exit 2
fi

for program in cargo cargo-llvm-cov python3 docker; do
  command -v "$program" >/dev/null || { printf 'Required tool missing: %s\n' "$program" >&2; exit 1; }
done
if (( run_frontend )); then
  command -v npm >/dev/null || { printf 'Required tool missing: npm\n' >&2; exit 1; }
fi
python3 -c 'import tomllib' # Python 3.11 or newer.
docker compose version >/dev/null
mkdir -p target/coverage

# Never reuse a development Compose project, even if COMPOSE_PROJECT_NAME is set.
coverage_project="ukodus-coverage-$(date +%s)-$$"
compose=(docker compose --file compose.test.yaml --project-name "$coverage_project")
cleanup() {
  local status=$?
  trap - EXIT
  "${compose[@]}" logs --no-color >target/coverage/services.log 2>&1 || true
  "${compose[@]}" down --volumes --remove-orphans || true
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"${compose[@]}" up --detach --wait --wait-timeout 180

# Fixtures reset these newly created databases. Override inherited service URLs.
export UKODUS_TEST_ALLOW_RESET=1
export UKODUS_TEST_NEO4J_URI=bolt://localhost:27687
export UKODUS_ANALYZER_TEST_NEO4J_URI=bolt://localhost:27688
export UKODUS_TEST_NEO4J_PASSWORD=ukodus-test-password
export UKODUS_TEST_REDIS_URL=redis://localhost:26379

final_status=0
check() {
  if "$@"; then
    return 0
  else
    printf 'Check failed: %s\n' "$*" >&2
    final_status=1
  fi
}

check python3 -m unittest discover -s scripts -p test_coverage.py -v
# --no-report implies --no-clean in cargo-llvm-cov. Discard earlier profiles and
# workspace binaries so a removed test cannot keep satisfying the coverage gate.
check cargo llvm-cov clean --workspace
check cargo llvm-cov --workspace --all-targets --all-features --locked --no-fail-fast --no-report
# Export even after failed tests so CI retains useful diagnostics.
check cargo llvm-cov report --lcov --output-path target/coverage/lcov.info
check cargo llvm-cov report --html --output-dir target/coverage/rust
check python3 scripts/coverage.py

if (( run_frontend )); then
  if npm --prefix frontend ci; then
    check npm --prefix frontend run check
    check npm --prefix frontend run test:coverage
    check npm --prefix frontend run build
    check npm --prefix frontend exec -- playwright install chromium
    check npm --prefix frontend run test:smoke
  else
    final_status=1
  fi
fi

exit "$final_status"

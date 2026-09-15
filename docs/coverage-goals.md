# Coverage goals and verification

## Required thresholds

These are merge-quality targets for authored application code, with higher
requirements for game verification, authentication and gameplay state changes.

| Area | Minimum line coverage | Minimum branch coverage |
| --- | ---: | ---: |
| Rust workspace | 95% | Not measured |
| Rust API | 95% | Not measured |
| Rust analyzer | 95% | Not measured |
| Result verification (`result_service.rs`) | 100% | Not measured |
| API key authentication (`api_key.rs`) | 100% | Not measured |
| Authored frontend TypeScript and Svelte | 95% | 85% |
| Gameplay bridge (`GameBridge.ts`) | 100% | 100% |

Frontend statement and function coverage also require 95%. These gates protect
the current breadth of tests across handlers, persistence, analysis, Svelte pages,
workers and browser coordination. Verification, authentication and gameplay
transitions retain complete coverage of their measured lines.

The sister `sudoku-core` repository records 95.66% production line coverage in its
2026-09-15 coverage report. The 95% gates here match that measured standard while
leaving a small margin for source and compiler changes. Its configured minimums
are lower than its measured result. The upstream
[`sudoku` CI](https://github.com/kcirtapfromspace/sudoku/blob/main/.github/workflows/ci.yml)
has no numeric coverage gate as inspected on 2026-09-15. These projects cover
different implementations; their percentages are benchmarks, not combined totals.

These thresholds are minimums, not reasons to remove valuable tests after passing.
Changes to verification, authentication, persistence or gameplay should test the
affected behavior and failure cases even when the percentage already passes.
Raise thresholds as additional production behavior becomes covered; do not exclude
uncovered application files or count test code to make a gate pass.

## Baseline and measured result

The baseline at commit `1d304dd079d4e195ea598574ee879541e61d360f` had 13 passing
Rust unit tests, zero integration suites and no frontend test runner.

| Area | Baseline covered / measured | Baseline coverage |
| --- | ---: | ---: |
| Rust workspace | 308 / 1,924 | 16.01% |
| API | 129 / 1,503 | 8.58% |
| Analyzer | 179 / 421 | 42.52% |
| Frontend | Unmeasured | Unmeasured |

The complete acceptance command passed on 2026-09-15 using Rust 1.95.0,
Node 26.8.1 and fresh disposable Neo4j/Redis instances. Coverage profiles and
workspace binaries were cleared before the run:

| Area | Covered / measured lines | Line coverage | Branch coverage |
| --- | ---: | ---: | ---: |
| Rust workspace | 1,982 / 2,010 | 98.61% | Not measured |
| API | 1,485 / 1,505 | 98.67% | Not measured |
| Analyzer | 497 / 505 | 98.42% | Not measured |
| Result verification | 212 / 212 | 100% | Not measured |
| API key authentication | 17 / 17 | 100% | Not measured |
| Frontend | 1,285 / 1,289 | 99.68% | 86.90% (677 / 779) |
| Gameplay bridge | 71 / 71 | 100% | 100% (40 / 40) |

Frontend statements: 98.24% (1,737 / 1,768). Functions: 99.19% (369 / 372).
Before this revision, the frontend measured 96.80% lines and 83.01% branches
with 84 tests. The previous recorded Rust acceptance result at `f833390` was
95.36%; it predates the arithmetic command additions and has a different source
denominator.

Validation: 47 Rust tests, 94 frontend tests, 18 coverage-collector tests,
zero Svelte/TypeScript errors or warnings, a successful production build, and a
Chromium smoke test using the shipped WASM and actual module worker. The browser
test verifies keyboard edits survive reload and navigation. The helper also
successfully removed its disposable services after the run.

Treat generated reports from the current checkout as authoritative; executable
line counts can change with source formatting, edits and compiler versions.

### Regressions fixed by the new tests

- Galaxy graph initialization stops if navigation unmounts it during a pending
  fetch. Resize listeners, pending resize callbacks and SVG transitions are cleaned
  up on unmount, preventing stale graph work after navigation.
- Coverage collection starts fresh on each acceptance run. Array types in Rust
  signatures, nested comments and character literals cannot conceal missing
  production function mappings.

The existing suite also protects these earlier fixes:

- Lost games no longer report themselves as leaderboard-eligible.
- Immediate repeated mining submissions are correctly reported as duplicates.
- Missing frontend puzzle/mining API methods now match the server routes.
- Prefetch results reach the cache and concurrent callers; worker failures allow
  fallback instead of leaving pending requests unresolved.
- Gameplay listeners and timers are cleaned up, progress is saved on navigation,
  and theme changes reach the WASM canvas.

Additional behavior checks cover configuration defaults and invalid ports, API
startup failures, HTTP error serialization, cache command failures, multi-page
cache invalidation, SSE recovery after missed events, deterministic arithmetic
reports and rejected proof envelopes. Frontend tests cover layout initialization,
navigation analytics, D3 dragging and worker restart/cancellation.

## Run the acceptance checks

Prerequisites: Docker with Compose v2 or newer, Rust 1.95.0, Python 3.11 or newer,
and Node.js 22.22.2 (the CI version), 24.15+ or 26+. Install the coverage tools once:

```sh
rustup component add llvm-tools-preview
cargo install cargo-llvm-cov --version 0.9.1 --locked
```

From the repository root:

```sh
./scripts/test-coverage.sh
```

The helper creates its own disposable Compose project, waits for two Neo4j
databases and Redis to be healthy, enables the integration fixtures, runs the
coverage gates, checks frontend types, builds the frontend and runs the browser
gameplay smoke test with the real WASM engine. The helper installs Playwright's
Chromium browser on first use; Linux hosts also need its system dependencies
(`cd frontend && npx playwright install --with-deps chromium`). The API and analyzer
use separate databases so their resets and batch selection cannot race. Local test
ports are 27687, 27688 and 26379; development services remain separate. The helper
removes only its own containers and volumes on exit. Before instrumenting the
workspace, it clears previous coverage profiles and workspace binaries.
`cargo llvm-cov --no-report` otherwise retains previous execution data, which
could let removed tests continue to satisfy a local gate.

Use `./scripts/test-coverage.sh --rust-only` to run the Rust portion. Service-free
Rust checks remain available with `cargo test --workspace --locked`.

For manually provisioned disposable services, the integration suites require all
of these variables before `cargo test --workspace --all-features --locked`:

```sh
export UKODUS_TEST_ALLOW_RESET=1
export UKODUS_TEST_NEO4J_URI=bolt://localhost:27687
export UKODUS_ANALYZER_TEST_NEO4J_URI=bolt://localhost:27688
export UKODUS_TEST_NEO4J_PASSWORD=ukodus-test-password
export UKODUS_TEST_REDIS_URL=redis://localhost:26379
```

These fixtures delete data in the configured test databases. A feature-enabled
test run fails when the explicit reset flag or required services are absent.

## Measurement and artifacts

Rust gates are implemented by `scripts/coverage.py`. They count each unique
`(production source file, LCOV DA line)` once and mark it covered if any execution
hits it. Zero-hit lines stay in the denominator. Both workspace crates are
instrumented with all targets and all features, including the analyzer subprocess
binaries used by its integration suite.

The collector inventories workspace `src/**/*.rs` independently of the report,
verifies that every authored function has a coverage mapping, and fails on missing
production files or functions. Files containing only declarations may legitimately
have no executable mappings. Only separate `tests/` directories, `tests.rs` and
`*_tests.rs` files, and numbered copies of those test files, are excluded. Numeric
copies of production modules still require coverage mappings. Inline test modules are rejected so their code
cannot inflate the production denominator. External dependency implementations,
including upstream `sudoku-core`, are outside this repository's coverage scope.

Frontend Istanbul coverage includes all authored `src/**/*.ts` and `src/**/*.svelte`,
including files without tests. Type declarations and the interface-only API types
file are excluded. Generated Svelte code and vendored WASM implementation are not
claims of authored application coverage. Frontend branch coverage describes the
instrumented JavaScript/TypeScript paths, not every possible browser outcome.

Artifacts after a run:

- `target/coverage/summary-production.json`: authoritative Rust gate results and uncovered lines.
- `target/coverage/lcov.info`: raw Rust execution mappings.
- `target/coverage/rust/html/index.html`: LLVM's browsable report; its aggregate percentages use different accounting and include tests.
- `target/coverage/services.log`: disposable database logs, including on failure.
- `frontend/coverage/index.html` and `frontend/coverage/coverage-summary.json`: frontend details and totals.

Run the gate's regression tests with
`python3 -m unittest discover -s scripts -p test_coverage.py -v`.

The collector tests verify missing-file/function failures, duplicate LCOV union,
zero-hit lines, malformed records, workspace membership, and Rust signatures with
array types. Nested comments and character literals must not hide actual functions
or introduce false mappings.

## CI and limits

The `Tests & Coverage` workflow runs on pull requests, pushes to `main` and manual
dispatch. Its Rust and frontend jobs fail on test failures, coverage below the targets,
frontend type errors, frontend build failures or the browser smoke test. Reports are uploaded even after a
check fails. This workflow does not deploy the application.

Repository branch protection has **not** been configured by these code changes.
To require passing checks before merging, configure the `Rust tests and coverage`
and `Frontend checks and coverage` statuses in the repository rules.

Coverage establishes that code ran under the asserted scenarios. It does not prove
correctness for every puzzle, network outage, concurrency interleaving or browser.
The test suites use real Neo4j and Redis for Rust integration, and mocked browser
and worker boundaries for frontend unit/component behavior. The browser smoke
test also checks gameplay against the real WASM engine. Comprehensive browser
journeys, upstream WASM internals and systematic infrastructure fault injection
remain separate validation work.

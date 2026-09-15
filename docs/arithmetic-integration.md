# Arithmetic certificates in Ukodus

The native analyzer and browser game now build from the same solver snapshot in
`vendor/sudoku-core`. Its `PROVENANCE.json` records the upstream base commit,
included source files, and their hashes. The original solver checkout can be
updated independently; production builds use the reviewed snapshot in this repo.

## What the engine can verify

- Version 1 retains the existing interval/gcd semantics and weights of magnitude
  at most two. Old JSON without a terminal field retains that meaning.
- Version 2 adds attainable Boolean remainders for moduli 2–16, with weights of
  magnitude at most eight and at most six native sources.
- Default discovery still has a six-source, weight-two limit, a beam width of 64,
  and 30,000 evaluated combinations. Interval/gcd checks run first, then remainder
  checks. A checked unit-weight parity placement can also compile with an
  incident native rule into a direct residue exclusion within these search caps.
- `compile_parity_tail` can explicitly construct the broader weight-eight,
  modulus-sixteen certificates. Increasing verifier limits does not imply that
  the default search enumerates all such proofs.

A search miss is inconclusive. `tested_combinations`, `budget_exhausted`, and
`beam_pruned` describe the actual bounded search. Arithmetic Counting's numeric
8.5 score is uncalibrated; the application's numerical scores are SE-inspired.

The [research note](research/modular-certificates/README.md) contains the
modulus-four deduction and sharp bounds. Modular propagation has prior art;
historical originality of the specific mathematical results remains unconfirmed.

## Offline search and verification

These commands do not connect to Neo4j:

```sh
cargo run --release --locked -p ukodus-analyzer -- search-arithmetic \
  --puzzle 530070000600195000098000060800060003400803001700020006060000280000419005000080079 \
  > /tmp/ukodus-arithmetic.json

cargo run --release --locked -p ukodus-analyzer -- verify-arithmetic \
  --replay /tmp/ukodus-arithmetic.json

# Verify the actual six-source modulus-four regression certificate.
cargo run --release --locked -p ukodus-analyzer -- verify-arithmetic \
  --replay frontend/tests/fixtures/arithmetic-residue-replay.json
```

`search-arithmetic --state state.json` instead accepts an exact `ArithmeticState`:
`{"version":1,"values":[...81 digits...],"domains":[...81 masks...]}`.
Values use zero for empty cells; domain bit `digit−1` permits that digit. A placed
cell has its singleton domain. Optional `--options options.json` accepts the four
search-limit fields listed above. Every field is required when supplying options.

Search output contains the full state, options, source provenance, hint, replay
envelope, and budget status. Verification accepts either that report or its
`replay` object. A missing certificate or a failed check exits nonzero. Verification
recomputes the proof; it does not trust the report's explanation or provenance.

## Portable replay

`ArithmeticReplay` carries a versioned `ArithmeticState` and an `ArithmeticProof`.
`capture` verifies before export; `check` reinstalls native constraints and rebuilds
coefficients from the recorded values and domains. `apply` requires the exact
current state and preserves previous eliminations when making a placement. It
rejects invalid state changes atomically.

The proof is conditional on its candidate premises. The envelope does not certify
uniqueness, that earlier deletions were justified, or that a candidate state is
globally satisfiable. Variant constraints and given/user flags are not needed for
the native-rule proof projection. Applying to a live grid preserves its installed
constraints and rejects a placement violating them.

`Hint` still skips its internal proof during ordinary serialization. The explicit
replay envelope supplies the proof and all premises for consumers that need them.

## Browser use

`scripts/build-wasm.sh` rebuilds the existing canvas game from
`vendor/sudoku-wasm` into `frontend/static/wasm/sudoku_wasm.*`, the path used by the
loader. The adapter retains the game, generation, persistence, and keyboard APIs.
Deployment builds this pinned source instead of downloading floating upstream
binaries. The frontend derives a shared content hash from the generated JavaScript
and WASM and versions both request URLs with it, including worker requests.
The browser module adds:

- `search_arithmetic_json(stateJson, optionsJson)`: returns a hint, replay, and
  search status. An empty options string selects defaults.
- `verify_arithmetic_replay_json(replayJson)`: independently verifies an envelope.
- `game.get_arithmetic_state_json()`: captures logical candidates reconstructed
  from the current values, rather than treating player pencil marks as premises.
- `game.get_current_arithmetic_replay_json()`: exports a currently shown arithmetic
  hint with its exact premises, or JSON null for other hint types.

The module worker supports `arithmetic-search` and `arithmetic-verify` requests
with caller-supplied IDs, so a client can keep expensive search off the main
thread. Types are defined in `frontend/src/lib/wasm/loader.ts`. The portable
snapshot API preserves supplied masks; ordinary gameplay hint reconstruction
continues to start from current values.

## Validation

```sh
cargo test --manifest-path vendor/sudoku-core/Cargo.toml --profile coverage --locked
cargo test --manifest-path vendor/sudoku-wasm/Cargo.toml --locked
./scripts/test-coverage.sh
```

Core regressions compare the residue DP with exhaustive Boolean enumeration,
validate the native six-source fixture with an independent mask-preserving
exact-cover oracle, exercise all tail sizes two through nine, and check legacy
JSON semantics, tampering, snapshot replay, and atomic application. Application
tests cover offline export/replay and catalog registration. The real browser
smoke test covers gameplay and verifies the same portable modulus-four certificate.

### Verified integration results (2026-09-15)

The default analyzer search discovers the research fixture's exclusion of
`r1c4#2` using modulus four after 10,983 evaluated combinations. The beam prunes
some alternatives and the search budget is not exhausted. The complete
[search report](research/modular-certificates/integrated-result.json) records the
certificate, exact candidate state, and source provenance; the native analyzer
and browser both verify that deduction.

- Core: 198 distinct Rust tests verified across the full run and the final
  targeted run; nine coverage-collector tests passed. Production line coverage
  is 95.99%, arithmetic coverage is 98.67%, and all coverage gates pass.
- Ukodus: workspace tests and database integration checks passed; Rust production
  line coverage is 95.32% overall and 98.22% for the analyzer. The three current
  offline CLI tests also pass.
- Browser: 84 frontend tests, three native WASM adapter tests, TypeScript/Svelte
  checks, the production build, and the real-browser smoke test passed.
- Strict analyzer/core Clippy checks, the analyzer Docker builder, snapshot
  refresh regression, and source/artifact provenance checks passed.

Pre-existing untracked duplicate files with ` 2` in their names include Rust test
filenames that Cargo rejects. Full Ukodus workspace and database coverage checks
therefore used a temporary validation copy excluding those duplicates; the
original files remain untouched. Reports and the exact exclusion inventory are
saved locally under `target/arithmetic-integration-validation/`.

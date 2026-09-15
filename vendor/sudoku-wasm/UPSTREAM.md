# Browser game source

Imported from the MIT-licensed [`sudoku` repository](https://github.com/kcirtapfromspace/sudoku/tree/c371f588aec8a80bb5402d853b6d7414cdb9013c/crates/sudoku-wasm)
at commit `c371f588aec8a80bb5402d853b6d7414cdb9013c`.

Only the crate manifest, Rust source, and upstream license are included. The
browser host remains Ukodus's Svelte frontend. Local changes use the sibling
vendored `sudoku-core`, expose arithmetic proof replay, and render arithmetic
hint details. Both server and browser therefore build from the same engine.

Run `./scripts/build-wasm.sh` from the repository root to regenerate the checked-in
assets under `frontend/static/wasm`. The script uses this standalone workspace's
lockfile, so it needs no external checkout or unpinned upstream download.
The generated `frontend/static/wasm/provenance.json` records both source
snapshots, individual input hashes, toolchain versions, and artifact hashes.

## Arithmetic browser API

The normal `?` hint path uses the revised engine and displays Arithmetic
Counting proof summaries. The following additions expose exact evidence:

- `game.get_arithmetic_state_json()` returns `{version, values, domains}`. As
  with normal game hints, it recalculates logical candidates from placed values;
  incomplete player pencil marks are not treated as mathematical assumptions.
- `game.get_current_arithmetic_replay_json()` returns the current Arithmetic
  Counting proof and its exact candidate premises as a replay envelope, or JSON
  `null` for other techniques. The envelope contains `version`, `state`, and
  `proof`; it does not wrap the display hint.
- `search_arithmetic_json(stateJson, optionsJson)` searches an explicit state
  without recalculating its masks. Pass an empty options string for bounded
  defaults. The result contains `hint`, `replay`, `tested_combinations`,
  `budget_exhausted`, `beam_pruned`, and `error`.
- `verify_arithmetic_replay_json(replayJson)` checks the supplied premises and
  proof independently, returning false for invalid evidence or malformed JSON.

`frontend/src/lib/wasm/loader.ts` defines the corresponding TypeScript types.
The module worker accepts `{type: 'arithmetic-search', id, state, options?}`
and `{type: 'arithmetic-verify', id, replay}`. Responses preserve `id` as
`arithmetic-result`, `arithmetic-verified`, or `arithmetic-error` messages.

Candidate domain bits 0 through 8 represent digits 1 through 9. Proof verification
establishes the conclusion conditional on those domains; the envelope does not
certify how earlier eliminations were obtained. Search limits and pruning are
reported explicitly, so an empty result does not imply that no proof exists.

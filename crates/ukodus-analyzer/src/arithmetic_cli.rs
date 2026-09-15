//! Offline, reproducible arithmetic discovery and independent certificate replay.
use std::path::Path;

use anyhow::{anyhow, Context, Result};
use serde::de::DeserializeOwned;
use serde::Serialize;
use sudoku_core::{
    ArithmeticReplay, ArithmeticSearchOptions, ArithmeticState, Grid, Hint, ProofCertificate,
    Solver,
};

const CORE_PROVENANCE: &str = include_str!("../../../vendor/sudoku-core/PROVENANCE.json");

#[derive(Serialize)]
struct SearchReport {
    schema_version: u8,
    engine: serde_json::Value,
    options: ArithmeticSearchOptions,
    state: ArithmeticState,
    hint: Option<Hint>,
    replay: Option<ArithmeticReplay>,
    tested_combinations: usize,
    budget_exhausted: bool,
    beam_pruned: bool,
    error: Option<String>,
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    let content =
        std::fs::read_to_string(path).with_context(|| format!("Cannot read {}", path.display()))?;
    serde_json::from_str(&content).with_context(|| format!("Invalid JSON in {}", path.display()))
}

pub fn search(state: Option<&Path>, puzzle: Option<&str>, options: Option<&Path>) -> Result<()> {
    let grid = match (state, puzzle) {
        (Some(path), None) => read_json::<ArithmeticState>(path)?
            .to_grid()
            .map_err(|e| anyhow!(e))?,
        (None, Some(text)) => Grid::from_string(text).context("Invalid 81-cell puzzle")?,
        _ => return Err(anyhow!("Supply exactly one of --state and --puzzle")),
    };
    let state = ArithmeticState::capture(&grid).map_err(|e| anyhow!(e))?;
    let options = options.map(read_json).transpose()?.unwrap_or_default();
    let result = Solver::new().search_arithmetic(&grid, &options);
    if let Some(error) = &result.error {
        return Err(anyhow!("Arithmetic search rejected the input: {error}"));
    }
    let replay = match result.hint.as_ref().and_then(|hint| hint.proof.as_ref()) {
        Some(ProofCertificate::Arithmetic(proof)) => {
            Some(ArithmeticReplay::capture(&grid, proof).map_err(|e| anyhow!(e))?)
        }
        Some(_) => return Err(anyhow!("Arithmetic search returned a non-arithmetic proof")),
        None => None,
    };
    let report = SearchReport {
        schema_version: 1,
        engine: serde_json::from_str(CORE_PROVENANCE)
            .context("Invalid embedded engine provenance")?,
        options,
        state,
        hint: result.hint,
        replay,
        tested_combinations: result.tested_combinations,
        budget_exhausted: result.budget_exhausted,
        beam_pruned: result.beam_pruned,
        error: result.error,
    };
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}

pub fn verify(path: &Path) -> Result<()> {
    // Accept either the portable envelope itself or a search report containing it.
    let document: serde_json::Value = read_json(path)?;
    let envelope = document.get("replay").unwrap_or(&document);
    if envelope.is_null() {
        return Err(anyhow!("Search report contains no arithmetic certificate"));
    }
    let replay: ArithmeticReplay =
        serde_json::from_value(envelope.clone()).context("Invalid arithmetic replay envelope")?;
    let check = replay.check().map_err(|e| anyhow!(e))?;
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "verified": true,
            "check": check,
            "scope": "Every completion respecting the recorded native candidate premises"
        }))?
    );
    Ok(())
}

//! JSON boundaries preserve proof evidence separately from the display hint,
//! whose normal serialization deliberately skips ProofCertificate.

use sudoku_core::{
    ArithmeticReplay, ArithmeticSearchOptions, ArithmeticState, ProofCertificate, Solver,
};
use wasm_bindgen::prelude::*;

fn search_json(state_json: &str, options_json: &str) -> Result<String, String> {
    let state: ArithmeticState =
        serde_json::from_str(state_json).map_err(|error| error.to_string())?;
    let grid = state.to_grid()?;
    let options = if options_json.is_empty() {
        ArithmeticSearchOptions::default()
    } else {
        serde_json::from_str(options_json).map_err(|error| error.to_string())?
    };
    let result = Solver::new().search_arithmetic(&grid, &options);
    let replay = match result.hint.as_ref().and_then(|hint| hint.proof.as_ref()) {
        Some(ProofCertificate::Arithmetic(proof)) => Some(ArithmeticReplay::capture(&grid, proof)?),
        _ => None,
    };
    Ok(serde_json::json!({
        "hint": result.hint,
        "replay": replay,
        "tested_combinations": result.tested_combinations,
        "budget_exhausted": result.budget_exhausted,
        "beam_pruned": result.beam_pruned,
        "error": result.error,
    })
    .to_string())
}

/// Search the supplied exact candidate snapshot. An empty options string uses
/// the bounded defaults. A missing hint does not establish impossibility.
#[wasm_bindgen]
pub fn search_arithmetic_json(state_json: &str, options_json: &str) -> Result<String, JsValue> {
    search_json(state_json, options_json).map_err(|error| JsValue::from_str(&error))
}

/// Independently replay a certificate against its included candidate snapshot.
/// Invalid JSON, unsupported versions, or changed evidence return false.
#[wasm_bindgen]
pub fn verify_arithmetic_replay_json(replay_json: &str) -> bool {
    serde_json::from_str::<ArithmeticReplay>(replay_json).is_ok_and(|replay| replay.verify())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sudoku_core::{ArithmeticProof, ArithmeticRequirement, ArithmeticTerm, Grid};

    #[test]
    fn json_boundary_preserves_and_checks_proof_evidence() {
        let grid = Grid::from_string(
            ".34678912672195348198342567859761423426853791713924856961537284287419635345286179",
        )
        .unwrap();
        let proof = ArithmeticProof::from_terms(
            &grid,
            vec![ArithmeticTerm {
                requirement: ArithmeticRequirement::Cell { cell: 0 },
                weight: 1,
            }],
            0,
            5,
            true,
        )
        .unwrap();
        let replay = ArithmeticReplay::capture(&grid, &proof).unwrap();
        let json = serde_json::to_string(&replay).unwrap();
        assert!(verify_arithmetic_replay_json(&json));
        let mut changed = replay;
        changed.proof.value = false;
        assert!(!verify_arithmetic_replay_json(
            &serde_json::to_string(&changed).unwrap()
        ));
        assert!(!verify_arithmetic_replay_json("{}"));

        let state_json = serde_json::to_string(&ArithmeticState::capture(&grid).unwrap()).unwrap();
        let response: serde_json::Value =
            serde_json::from_str(&search_json(&state_json, "").unwrap()).unwrap();
        assert!(response["error"].is_null());
        assert!(response["replay"].is_object());
        assert!(verify_arithmetic_replay_json(
            &response["replay"].to_string()
        ));
    }

    #[test]
    fn malformed_snapshot_and_options_are_reported() {
        assert!(search_json("{}", "").is_err());
        let grid = Grid::from_string(
            ".34678912672195348198342567859761423426853791713924856961537284287419635345286179",
        )
        .unwrap();
        let state = serde_json::to_string(&ArithmeticState::capture(&grid).unwrap()).unwrap();
        assert!(search_json(&state, "invalid JSON").is_err());
        let response: serde_json::Value = serde_json::from_str(
            &search_json(
                &state,
                r#"{"max_sources":6,"max_weight":2,"beam_width":64,"max_combinations":0}"#,
            )
            .unwrap(),
        )
        .unwrap();
        assert!(response["hint"].is_null());
        assert_eq!(response["budget_exhausted"], true);
    }

    #[test]
    fn portable_modulo_four_fixture_replays_and_rejects_tampering() {
        // This is the satisfiable six-source witness from the research probe.
        let json = include_str!("../../../frontend/tests/fixtures/arithmetic-residue-replay.json");
        assert!(verify_arithmetic_replay_json(json));
        let mut replay: ArithmeticReplay = serde_json::from_str(json).unwrap();
        replay.proof.terminal = sudoku_core::ArithmeticTerminal::Residue { modulus: 3 };
        assert!(!verify_arithmetic_replay_json(
            &serde_json::to_string(&replay).unwrap()
        ));
    }
}

use std::process::{Command, Output};
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

struct Scratch(std::path::PathBuf);
impl Scratch {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "ukodus-arithmetic-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn write(&self, name: &str, value: &serde_json::Value) -> String {
        let path = self.0.join(name);
        std::fs::write(&path, serde_json::to_vec(value).unwrap()).unwrap();
        path.to_str().unwrap().to_owned()
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn cli(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_ukodus-analyzer"))
        .env("NEO4J_URI", "bolt://127.0.0.1:1")
        .args(args)
        .output()
        .unwrap()
}

fn assert_rejected(args: &[&str], expected: &str) {
    let output = cli(args);
    let error = String::from_utf8_lossy(&output.stderr);
    assert_eq!(output.status.code(), Some(1), "{args:?}: {error}");
    assert!(error.contains(expected), "{args:?}: {error}");
    assert!(
        output.stdout.is_empty(),
        "rejected input must not emit a successful report: {}",
        String::from_utf8_lossy(&output.stdout)
    );
    assert!(!error.contains("Failed to connect to Neo4j"), "{error}");
}

#[test]
fn offline_search_exports_replay_and_rejects_changed_premises() {
    let scratch = Scratch::new();
    let mut masks = vec![511; 81];
    masks[0] = 1;
    let state = scratch.write(
        "state.json",
        &serde_json::json!({
            "version":1, "values":vec![0;81], "domains":masks
        }),
    );
    let output = cli(&["search-arithmetic", "--state", &state]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let mut report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    let repeated = cli(&["search-arithmetic", "--state", &state]);
    assert!(repeated.status.success());
    assert_eq!(
        output.stdout, repeated.stdout,
        "the same candidate snapshot and default options must produce identical exports"
    );
    assert_eq!(report["schema_version"], 1);
    assert!(report["error"].is_null());
    assert!(!report["replay"].is_null());
    assert_eq!(report["state"]["domains"][0], 1);
    assert_eq!(report["replay"]["state"], report["state"]);
    assert_eq!(
        report["options"],
        serde_json::to_value(sudoku_core::ArithmeticSearchOptions::default()).unwrap()
    );
    assert!(report["engine"]["source_sha256"].as_str().unwrap().len() == 64);
    let export = scratch.write("proof.json", &report);
    let verification = cli(&["verify-arithmetic", "--replay", &export]);
    assert!(verification.status.success());
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&verification.stdout).unwrap()["verified"],
        true
    );
    report["replay"]["state"]["domains"][80] = serde_json::json!(255);
    let changed = scratch.write("changed.json", &report);
    assert_rejected(
        &["verify-arithmetic", "--replay", &changed],
        "Arithmetic certificate does not verify for its recorded state",
    );
}

#[test]
fn a_completed_puzzle_emits_a_complete_search_without_a_certificate() {
    let puzzle =
        "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    let output = cli(&["search-arithmetic", "--puzzle", puzzle]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert!(report["hint"].is_null());
    assert!(report["replay"].is_null());
    assert!(report["error"].is_null());
    assert_eq!(report["tested_combinations"], 0);
    assert_eq!(report["budget_exhausted"], false);
    assert_eq!(report["beam_pruned"], false);
    let values: Vec<_> = puzzle.bytes().map(|digit| digit - b'0').collect();
    let domains: Vec<u16> = values.iter().map(|digit| 1 << (digit - 1)).collect();
    assert_eq!(report["state"]["values"], serde_json::json!(values));
    assert_eq!(report["state"]["domains"], serde_json::json!(domains));

    let scratch = Scratch::new();
    let path = scratch.write("completed.json", &report);
    assert_rejected(
        &["verify-arithmetic", "--replay", &path],
        "Search report contains no arithmetic certificate",
    );
}

#[test]
fn search_rejects_contradictory_puzzles_and_preserves_snapshot_errors() {
    // The duplicate givens parse as 81 cells, but cannot become valid premises.
    let conflicting = format!("11{}", "0".repeat(79));
    assert_rejected(
        &["search-arithmetic", "--puzzle", &conflicting],
        "Conflicting placed values in arithmetic state",
    );
    // Row one needs a 9 in its last cell, where the second row already places 9.
    let empty_domain = format!("123456780000000009{}", "0".repeat(63));
    assert_rejected(
        &["search-arithmetic", "--puzzle", &empty_domain],
        "Empty cell has an empty or invalid candidate mask",
    );

    let scratch = Scratch::new();
    let mut state = serde_json::json!({
        "version":1, "values":vec![0;81], "domains":vec![511;81]
    });
    // A caller-supplied zero mask must be rejected instead of being recalculated.
    state["domains"][0] = serde_json::json!(0);
    let path = scratch.write("empty-domain.json", &state);
    assert_rejected(
        &["search-arithmetic", "--state", &path],
        "Invalid arithmetic state value or domain",
    );
}

#[test]
fn input_file_failures_name_the_requested_file() {
    let scratch = Scratch::new();
    let puzzle = "0".repeat(81);
    let missing = scratch.0.join("does-not-exist.json");
    let missing = missing.to_str().unwrap();
    for args in [
        vec![
            "search-arithmetic",
            "--puzzle",
            &puzzle,
            "--options",
            missing,
        ],
        vec!["verify-arithmetic", "--replay", missing],
    ] {
        assert_rejected(&args, &format!("Cannot read {missing}"));
    }

    let malformed = scratch.0.join("malformed-options.json");
    std::fs::write(&malformed, "{").unwrap();
    let malformed = malformed.to_str().unwrap();
    assert_rejected(
        &[
            "search-arithmetic",
            "--puzzle",
            &puzzle,
            "--options",
            malformed,
        ],
        &format!("Invalid JSON in {malformed}"),
    );
}

#[test]
fn verification_distinguishes_missing_malformed_and_unsupported_envelopes() {
    let scratch = Scratch::new();
    for (name, value, expected) in [
        (
            "null.json",
            serde_json::Value::Null,
            "Search report contains no arithmetic certificate",
        ),
        (
            "missing-proof.json",
            serde_json::json!({"version":1}),
            "Invalid arithmetic replay envelope",
        ),
        (
            "malformed-nested-replay.json",
            serde_json::json!({"replay": "not an envelope"}),
            "Invalid arithmetic replay envelope",
        ),
    ] {
        let path = scratch.write(name, &value);
        assert_rejected(&["verify-arithmetic", "--replay", &path], expected);
    }

    let mut replay: serde_json::Value = serde_json::from_str(include_str!(
        "../../../frontend/tests/fixtures/arithmetic-residue-replay.json"
    ))
    .unwrap();
    replay["version"] = serde_json::json!(2);
    let path = scratch.write("future-version.json", &replay);
    assert_rejected(
        &["verify-arithmetic", "--replay", &path],
        "Unsupported arithmetic replay version",
    );
}

#[test]
fn malformed_inputs_fail_and_budget_exhaustion_is_inconclusive() {
    let scratch = Scratch::new();
    let options = scratch.write(
        "options.json",
        &serde_json::json!({
            "max_sources":6, "max_weight":2, "beam_width":64, "max_combinations":0
        }),
    );
    let puzzle = "0".repeat(81);
    let output = cli(&[
        "search-arithmetic",
        "--puzzle",
        &puzzle,
        "--options",
        &options,
    ]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert!(report["hint"].is_null());
    assert_eq!(report["budget_exhausted"], true);
    let missing = scratch.write("missing.json", &report);
    assert!(!cli(&["verify-arithmetic", "--replay", &missing])
        .status
        .success());
    let invalid = scratch.write(
        "invalid.json",
        &serde_json::json!({"version":1,"values":[],"domains":[]}),
    );
    assert!(!cli(&["search-arithmetic", "--state", &invalid])
        .status
        .success());
    assert!(!cli(&["search-arithmetic", "--puzzle", "bad"])
        .status
        .success());
    assert!(!cli(&["search-arithmetic"]).status.success());
    assert!(!cli(&[
        "search-arithmetic",
        "--state",
        &invalid,
        "--puzzle",
        &puzzle
    ])
    .status
    .success());

    let invalid_options = scratch.write(
        "invalid-options.json",
        &serde_json::json!({
            "max_sources":7, "max_weight":2, "beam_width":64, "max_combinations":1
        }),
    );
    assert!(!cli(&[
        "search-arithmetic",
        "--puzzle",
        &puzzle,
        "--options",
        &invalid_options
    ])
    .status
    .success());
    let malformed = scratch.0.join("malformed.json");
    std::fs::write(&malformed, "{").unwrap();
    assert!(
        !cli(&["search-arithmetic", "--state", malformed.to_str().unwrap()])
            .status
            .success()
    );
    assert!(
        !cli(&["verify-arithmetic", "--replay", malformed.to_str().unwrap()])
            .status
            .success()
    );
    assert!(!cli(&[
        "search-arithmetic",
        "--state",
        scratch.0.join("missing-file").to_str().unwrap()
    ])
    .status
    .success());
}

#[test]
fn directly_verifies_the_modulus_four_portable_fixture() {
    let fixture = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../frontend/tests/fixtures/arithmetic-residue-replay.json"
    );
    let output = cli(&["verify-arithmetic", "--replay", fixture]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["check"]["Residue"]["modulus"], 4);
    assert_eq!(result["check"]["Residue"]["required_residue"], 2);
    assert_eq!(
        result["check"]["Residue"]["reachable_residues"],
        serde_json::json!([0, 1, 3])
    );
}

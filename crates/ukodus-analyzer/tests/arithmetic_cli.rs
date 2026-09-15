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
    assert!(!report["replay"].is_null());
    assert_eq!(report["state"]["domains"][0], 1);
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
    assert!(!cli(&["verify-arithmetic", "--replay", &changed])
        .status
        .success());
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

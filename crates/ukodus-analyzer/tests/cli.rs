use std::process::Command;

#[test]
fn help_describes_commands_and_database_options() {
    let output = Command::new(env!("CARGO_BIN_EXE_ukodus-analyzer"))
        .arg("--help")
        .output()
        .expect("run analyzer help");
    assert!(output.status.success());
    let help = String::from_utf8(output.stdout).unwrap();
    for expected in [
        "seed-techniques",
        "analyze-batch",
        "--neo4j-uri",
        "--neo4j-user",
    ] {
        assert!(help.contains(expected), "missing {expected}: {help}");
    }
}

#[test]
fn malformed_command_and_batch_size_fail_before_connecting() {
    for args in [
        vec!["missing-command"],
        vec!["analyze-batch", "--batch-size", "many"],
    ] {
        let output = Command::new(env!("CARGO_BIN_EXE_ukodus-analyzer"))
            .args(args)
            .output()
            .expect("run analyzer validation");
        assert_eq!(output.status.code(), Some(2));
        let error = String::from_utf8(output.stderr).unwrap();
        assert!(error.contains("error:"), "{error}");
        assert!(!error.contains("Failed to connect"), "{error}");
    }
}

#[test]
fn unsupported_database_uri_reports_a_fatal_configuration_error() {
    let output = Command::new(env!("CARGO_BIN_EXE_ukodus-analyzer"))
        .args(["--neo4j-uri", "https://localhost:7687", "seed-techniques"])
        .output()
        .expect("run analyzer with unsupported URI");
    assert_eq!(output.status.code(), Some(1));
    let error = String::from_utf8(output.stderr).unwrap();
    assert!(error.contains("ukodus-analyzer fatal:"), "{error}");
    assert!(error.contains("Failed to connect to Neo4j"), "{error}");
}

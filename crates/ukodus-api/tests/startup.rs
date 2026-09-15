use std::{process::Output, time::Duration};
use tokio::process::Command;

fn command() -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_ukodus-api"));
    // Preserve LLVM_PROFILE_FILE so subprocess coverage is collected.
    for key in [
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "REDIS_URL",
        "HOST",
        "PORT",
        "BASE_URL",
        "MINING_API_KEY",
        "RUST_LOG",
    ] {
        command.env_remove(key);
    }
    command.env("RUST_LOG", "info").kill_on_drop(true);
    command
}

async fn failure(mut command: Command) -> Output {
    let output = tokio::time::timeout(Duration::from_secs(20), command.output())
        .await
        .expect("startup failure must finish within 20 seconds")
        .expect("execute API binary");
    assert_eq!(output.status.code(), Some(1), "{output:?}");
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("ukodus-api fatal:"),
        "{output:?}"
    );
    output
}

#[tokio::test]
async fn invalid_database_configuration_exits_with_a_diagnostic() {
    let mut command = command();
    command.env("NEO4J_URI", "https://localhost:7687");
    let output = failure(command).await;
    assert!(!String::from_utf8_lossy(&output.stdout).contains("connected to neo4j"));
}

#[cfg(feature = "integration-tests")]
#[tokio::test]
async fn startup_reports_invalid_cache_configuration_and_occupied_port() {
    let database_command = || {
        let mut command = command();
        command
            .env(
                "NEO4J_URI",
                std::env::var("UKODUS_TEST_NEO4J_URI").expect("disposable Neo4j URI"),
            )
            .env(
                "NEO4J_PASSWORD",
                std::env::var("UKODUS_TEST_NEO4J_PASSWORD").expect("disposable Neo4j password"),
            );
        command
    };
    let mut invalid_cache = database_command();
    invalid_cache.env("REDIS_URL", "https://localhost:6379");
    let output = failure(invalid_cache).await;
    let logs = String::from_utf8_lossy(&output.stdout);
    assert!(logs.contains("connected to neo4j"), "{output:?}");
    assert!(!logs.contains("connected to redis"), "{output:?}");

    let reserved = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let mut occupied_port = database_command();
    occupied_port
        .env(
            "REDIS_URL",
            std::env::var("UKODUS_TEST_REDIS_URL").expect("disposable Redis URL"),
        )
        .env("HOST", "127.0.0.1")
        .env("PORT", reserved.local_addr().unwrap().port().to_string());
    let output = failure(occupied_port).await;
    let logs = String::from_utf8_lossy(&output.stdout);
    assert!(
        logs.contains("connected to neo4j") && logs.contains("connected to redis"),
        "{output:?}"
    );
    assert!(!logs.contains("listening"), "{output:?}");
}

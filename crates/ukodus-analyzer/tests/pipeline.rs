#![cfg(feature = "integration-tests")]

use std::{collections::HashMap, process::Output, time::Duration};

use neo4rs::{query, Graph, Query};
use tokio::process::Command;
use ukodus_analyzer::{all_technique_seeds, collect_all_techniques};

const EASY: &str =
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const EXPERT: &str =
    "000704005020010070000080002090006250600070008053200010400090000030060090200301000";

struct Database {
    graph: Graph,
    uri: String,
    password: String,
}

impl Database {
    async fn connect() -> Self {
        assert_eq!(
            std::env::var("UKODUS_TEST_ALLOW_RESET").as_deref(),
            Ok("1"),
            "Integration tests delete test data: explicitly set UKODUS_TEST_ALLOW_RESET=1 with disposable services",
        );
        let uri = std::env::var("UKODUS_ANALYZER_TEST_NEO4J_URI").expect(
            "integration-tests requires UKODUS_ANALYZER_TEST_NEO4J_URI pointing to a disposable analyzer-only Neo4j database",
        );
        let password = std::env::var("UKODUS_TEST_NEO4J_PASSWORD")
            .expect("integration-tests requires UKODUS_TEST_NEO4J_PASSWORD");
        let graph = Graph::new(&uri, "neo4j", &password)
            .await
            .expect("connect to disposable analyzer test database");
        Self {
            graph,
            uri,
            password,
        }
    }

    async fn cli(&self, arguments: &[&str]) -> Output {
        tokio::time::timeout(
            Duration::from_secs(60),
            Command::new(env!("CARGO_BIN_EXE_ukodus-analyzer"))
                .args(["--neo4j-uri", &self.uri, "--neo4j-user", "neo4j"])
                .args(arguments)
                .env("NEO4J_PASSWORD", &self.password)
                .env("RUST_LOG", "info")
                .kill_on_drop(true)
                .output(),
        )
        .await
        .expect("analyzer command must finish within 60 seconds")
        .expect("execute analyzer binary")
    }

    async fn success(&self, arguments: &[&str]) -> Output {
        let output = self.cli(arguments).await;
        assert!(
            output.status.success(),
            "command {arguments:?} failed: {}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr),
        );
        output
    }

    async fn write(&self, q: Query) {
        let mut rows = self.graph.execute(q).await.expect("execute fixture query");
        while rows.next().await.expect("consume fixture query").is_some() {}
    }

    async fn count(&self, cypher: &str) -> i64 {
        self.graph
            .execute(query(cypher))
            .await
            .unwrap()
            .next()
            .await
            .unwrap()
            .unwrap()
            .get("count")
            .unwrap()
    }

    async fn add_puzzle(&self, id: &str, puzzle: &str, pending: bool) {
        self.write(
            query(
                "CREATE (:Puzzle {test_id: $id, puzzle_string: $puzzle, needs_analysis: $pending})",
            )
            .param("id", id)
            .param("puzzle", puzzle)
            .param("pending", pending),
        )
        .await;
    }
}

/// This suite owns the explicitly configured disposable database. Keep the scenarios
/// in one test so batch selection and reference-data seeding cannot race each other.
#[tokio::test]
async fn cli_seeds_reference_data_and_persists_batch_analysis() {
    let db = Database::connect().await;
    db.write(query("MATCH (n) DETACH DELETE n")).await;

    // An empty queue succeeds, and non-pending puzzles remain untouched.
    db.add_puzzle("untouched", EASY, false).await;
    let empty = db.success(&["analyze-batch"]).await;
    assert!(String::from_utf8_lossy(&empty.stdout).contains("No puzzles need analysis"));
    assert_eq!(
        db.count("MATCH (:Puzzle)-[r]->() RETURN count(r) AS count")
            .await,
        0
    );

    // Seed twice: MERGE must preserve unique reference nodes and relationships.
    for _ in 0..2 {
        db.success(&["seed-techniques"]).await;
    }
    assert_eq!(
        db.count("MATCH (t:Technique) RETURN count(t) AS count")
            .await,
        all_technique_seeds().len() as i64
    );
    assert_eq!(
        db.count("MATCH (f:TechniqueFamily) RETURN count(f) AS count")
            .await,
        10
    );
    assert_eq!(
        db.count("MATCH (d:DifficultyTier) RETURN count(d) AS count")
            .await,
        8
    );
    assert_eq!(
        db.count("MATCH (:Technique)-[r:BELONGS_TO]->(:TechniqueFamily) RETURN count(r) AS count")
            .await,
        all_technique_seeds().len() as i64
    );
    let seeds: HashMap<_, _> = all_technique_seeds()
        .into_iter()
        .map(|seed| (seed.name, seed))
        .collect();
    let mut rows = db
        .graph
        .execute(query(
            "MATCH (t:Technique)-[:BELONGS_TO]->(f:TechniqueFamily)
         RETURN t.name AS name, t.display_name AS display_name, t.family AS family,
                t.ordinal AS ordinal, t.se_rating AS rating, f.name AS parent",
        ))
        .await
        .unwrap();
    while let Some(row) = rows.next().await.unwrap() {
        let name: String = row.get("name").unwrap();
        let seed = &seeds[name.as_str()];
        assert_eq!(
            row.get::<String>("display_name").unwrap(),
            seed.display_name
        );
        assert_eq!(row.get::<String>("family").unwrap(), seed.family);
        assert_eq!(row.get::<String>("parent").unwrap(), seed.family);
        assert_eq!(row.get::<i64>("ordinal").unwrap(), i64::from(seed.ordinal));
        assert_eq!(row.get::<f64>("rating").unwrap(), f64::from(seed.se_rating));
    }

    // A size-zero batch does nothing; a size-one batch consumes exactly one item.
    db.add_puzzle("limited-a", EASY, true).await;
    db.add_puzzle("limited-b", EASY, true).await;
    db.success(&["analyze-batch", "--batch-size", "0"]).await;
    assert_eq!(
        db.count("MATCH (p:Puzzle {needs_analysis: true}) RETURN count(p) AS count")
            .await,
        2
    );
    db.success(&["analyze-batch", "--batch-size", "1"]).await;
    assert_eq!(
        db.count("MATCH (p:Puzzle {needs_analysis: true}) RETURN count(p) AS count")
            .await,
        1
    );
    db.success(&["analyze-batch", "--batch-size", "1"]).await;

    for index in 0..10 {
        db.add_puzzle(&format!("easy-{index}"), EASY, true).await;
    }
    db.add_puzzle("expert", EXPERT, true).await;
    db.add_puzzle("broken", "invalid", true).await;
    db.success(&["analyze-batch", "--batch-size", "100"]).await;
    assert_eq!(
        db.count("MATCH (p:Puzzle {needs_analysis: true}) RETURN count(p) AS count")
            .await,
        0
    );
    assert_eq!(db.count("MATCH (p:Puzzle {test_id: 'broken', analysis_error: true, needs_analysis: false}) RETURN count(p) AS count").await, 1);
    assert_eq!(
        db.count("MATCH (:Puzzle {test_id: 'broken'})-[r]->() RETURN count(r) AS count")
            .await,
        0
    );
    assert_eq!(
        db.count("MATCH (:Puzzle {test_id: 'untouched'})-[r]->() RETURN count(r) AS count")
            .await,
        0
    );

    for (id, puzzle) in [("easy-0", EASY), ("expert", EXPERT)] {
        let profile = collect_all_techniques(puzzle).unwrap();
        let mut rows = db
            .graph
            .execute(
                query(
                    "MATCH (p:Puzzle {test_id: $id})-[r:REQUIRES_TECHNIQUE]->(t:Technique)
             RETURN t.display_name AS name, r.count AS uses",
                )
                .param("id", id),
            )
            .await
            .unwrap();
        let mut actual = HashMap::new();
        while let Some(row) = rows.next().await.unwrap() {
            actual.insert(
                row.get::<String>("name").unwrap(),
                row.get::<i64>("uses").unwrap() as u32,
            );
        }
        assert_eq!(
            actual, profile.techniques,
            "persisted technique counts for {id}"
        );
        let row = db
            .graph
            .execute(
                query(
                    "MATCH (p:Puzzle {test_id: $id})-[:MAX_TECHNIQUE]->(t:Technique)
             MATCH (p)-[:IN_TIER]->(d:DifficultyTier)
             RETURN p.max_se_rating AS rating, p.max_technique AS name,
                    t.display_name AS edge_name, d.min_se AS min, d.max_se AS max",
                )
                .param("id", id),
            )
            .await
            .unwrap()
            .next()
            .await
            .unwrap()
            .unwrap();
        let rating = row.get::<f64>("rating").unwrap();
        assert_eq!(rating, f64::from(profile.max_se_rating));
        assert_eq!(row.get::<String>("name").unwrap(), profile.max_technique);
        assert_eq!(
            row.get::<String>("edge_name").unwrap(),
            profile.max_technique
        );
        assert!(row.get::<f64>("min").unwrap() <= rating);
        assert!(rating < row.get::<f64>("max").unwrap());
    }

    // Ten identical profiles create 10*9/2 edges, each with similarity one.
    assert_eq!(db.count(
        "MATCH (a:Puzzle)-[r:SHARES_TECHNIQUE_PROFILE]->(b:Puzzle)
         WHERE a.test_id STARTS WITH 'easy-' AND b.test_id STARTS WITH 'easy-' AND r.similarity = 1.0
         RETURN count(r) AS count",
    ).await, 45);
    let easy = collect_all_techniques(EASY)
        .unwrap()
        .techniques
        .into_keys()
        .collect();
    let expert = collect_all_techniques(EXPERT)
        .unwrap()
        .techniques
        .into_keys()
        .collect();
    assert!(ukodus_analyzer::jaccard_similarity(&easy, &expert) < 0.5);
    assert_eq!(db.count("MATCH (:Puzzle {test_id: 'expert'})-[r:SHARES_TECHNIQUE_PROFILE]-() RETURN count(r) AS count").await, 0);

    // Re-running an empty queue preserves the completed graph.
    let edge_count = db.count("MATCH ()-[r]->() RETURN count(r) AS count").await;
    db.success(&["analyze-batch"]).await;
    assert_eq!(
        db.count("MATCH ()-[r]->() RETURN count(r) AS count").await,
        edge_count
    );

    // A corrupt database row is reported as a fatal error and remains pending.
    db.write(query(
        "CREATE (:Puzzle {test_id: 'missing-string', needs_analysis: true})",
    ))
    .await;
    let malformed = db.cli(&["analyze-batch"]).await;
    assert_eq!(malformed.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&malformed.stderr).contains("ukodus-analyzer fatal:"));
    assert_eq!(db.count("MATCH (p:Puzzle {test_id: 'missing-string', needs_analysis: true}) RETURN count(p) AS count").await, 1);

    db.write(query("MATCH (n) DETACH DELETE n")).await;
}

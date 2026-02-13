use std::collections::HashSet;
use std::sync::Arc;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use neo4rs::{query, Graph, Query};
use tracing::{info, warn};

use ukodus_analyzer::{all_technique_seeds, collect_all_techniques, jaccard_similarity};

#[derive(Parser)]
#[command(name = "ukodus-analyzer", about = "Batch technique extraction and similarity analysis")]
struct Cli {
    #[command(subcommand)]
    command: Command,

    #[arg(long, env = "NEO4J_URI", default_value = "bolt://localhost:7687")]
    neo4j_uri: String,
    #[arg(long, env = "NEO4J_USER", default_value = "neo4j")]
    neo4j_user: String,
    #[arg(long, env = "NEO4J_PASSWORD", default_value = "password")]
    neo4j_password: String,
}

#[derive(Subcommand)]
enum Command {
    /// Create all reference Technique, TechniqueFamily, and DifficultyTier nodes
    SeedTechniques,
    /// Analyze a batch of puzzles that need technique extraction
    AnalyzeBatch {
        #[arg(long, default_value = "100")]
        batch_size: usize,
    },
}

/// Execute a write-only Cypher query, consuming the result stream.
async fn run_query(graph: &Graph, q: Query) -> Result<()> {
    let mut result = graph.execute(q).await?;
    while result.next().await?.is_some() {}
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();
    let graph = Arc::new(
        Graph::new(&cli.neo4j_uri, &cli.neo4j_user, &cli.neo4j_password)
            .await
            .context("Failed to connect to Neo4j")?,
    );

    match cli.command {
        Command::SeedTechniques => seed_techniques(&graph).await?,
        Command::AnalyzeBatch { batch_size } => analyze_batch(&graph, batch_size).await?,
    }

    Ok(())
}

/// Create all reference data: TechniqueFamily, Technique, DifficultyTier nodes and edges.
async fn seed_techniques(graph: &Graph) -> Result<()> {
    info!("Seeding technique reference data...");

    // 1. Create TechniqueFamily nodes
    let families = [
        ("singles", "Singles", "#22c55e"),
        ("pairs_triples", "Pairs & Triples", "#10b981"),
        ("intersections", "Intersections", "#f59e0b"),
        ("fish", "Fish", "#0284c7"),
        ("wings", "Wings", "#a855f7"),
        ("chains", "Chains", "#4f46e5"),
        ("rectangles", "Rectangles", "#f97316"),
        ("als", "ALS", "#db2777"),
        ("forcing", "Forcing Chains", "#e11d48"),
        ("other", "Other", "#64748b"),
    ];

    for (name, display_name, color) in &families {
        run_query(
            graph,
            query(
                "MERGE (f:TechniqueFamily {name: $name})
                 SET f.display_name = $display_name, f.color = $color",
            )
            .param("name", *name)
            .param("display_name", *display_name)
            .param("color", *color),
        )
        .await
        .context("Failed to create TechniqueFamily")?;
    }
    info!("Created {} TechniqueFamily nodes", families.len());

    // 2. Create Technique nodes with BELONGS_TO edges
    let seeds = all_technique_seeds();
    for seed in &seeds {
        run_query(
            graph,
            query(
                "MERGE (t:Technique {name: $name})
                 SET t.display_name = $display_name,
                     t.se_rating = $se_rating,
                     t.family = $family,
                     t.ordinal = $ordinal
                 WITH t
                 MATCH (f:TechniqueFamily {name: $family})
                 MERGE (t)-[:BELONGS_TO]->(f)",
            )
            .param("name", seed.name)
            .param("display_name", seed.display_name)
            .param("se_rating", seed.se_rating as f64)
            .param("family", seed.family)
            .param("ordinal", seed.ordinal as i64),
        )
        .await
        .context("Failed to create Technique node")?;
    }
    info!("Created {} Technique nodes with BELONGS_TO edges", seeds.len());

    // 3. Create DifficultyTier nodes
    let tiers = [
        ("Beginner", 1.0_f64, 2.0_f64, "#86efac"),
        ("Easy", 2.0, 2.9, "#22c55e"),
        ("Medium", 2.9, 3.5, "#f59e0b"),
        ("Intermediate", 3.5, 4.5, "#fb923c"),
        ("Hard", 4.5, 5.5, "#ef4444"),
        ("Expert", 5.5, 6.5, "#dc2626"),
        ("Master", 6.5, 8.0, "#9333ea"),
        ("Extreme", 8.0, 11.0, "#1e293b"),
    ];

    for (name, min_se, max_se, color) in &tiers {
        run_query(
            graph,
            query(
                "MERGE (d:DifficultyTier {name: $name})
                 SET d.min_se = $min_se, d.max_se = $max_se, d.color = $color",
            )
            .param("name", *name)
            .param("min_se", *min_se)
            .param("max_se", *max_se)
            .param("color", *color),
        )
        .await
        .context("Failed to create DifficultyTier")?;
    }
    info!("Created {} DifficultyTier nodes", tiers.len());

    info!("Seed complete.");
    Ok(())
}

/// Analyze a batch of puzzles: extract technique profiles and create graph edges.
async fn analyze_batch(graph: &Graph, batch_size: usize) -> Result<()> {
    info!("Fetching up to {} puzzles needing analysis...", batch_size);

    // 1. Fetch puzzles where needs_analysis = true
    let mut result = graph
        .execute(
            query(
                "MATCH (p:Puzzle)
                 WHERE p.needs_analysis = true
                 RETURN p.puzzle_string AS puzzle_string, elementId(p) AS id
                 LIMIT $limit",
            )
            .param("limit", batch_size as i64),
        )
        .await
        .context("Failed to query puzzles")?;

    // Collect puzzle data
    struct PuzzleRow {
        id: String,
        puzzle_string: String,
    }
    let mut puzzles = Vec::new();
    while let Some(row) = result.next().await? {
        let id: String = row.get("id")?;
        let puzzle_string: String = row.get("puzzle_string")?;
        puzzles.push(PuzzleRow { id, puzzle_string });
    }

    if puzzles.is_empty() {
        info!("No puzzles need analysis.");
        return Ok(());
    }
    info!("Analyzing {} puzzles...", puzzles.len());

    // 2. Analyze each puzzle and store results
    struct AnalyzedPuzzle {
        id: String,
        technique_set: HashSet<String>,
    }
    let mut analyzed: Vec<AnalyzedPuzzle> = Vec::new();

    for (i, puzzle) in puzzles.iter().enumerate() {
        let profile = match collect_all_techniques(&puzzle.puzzle_string) {
            Some(p) => p,
            None => {
                warn!(
                    "Failed to analyze puzzle {} ({}), skipping",
                    i + 1,
                    &puzzle.id
                );
                // Mark as analyzed to avoid retrying broken puzzles forever
                run_query(
                    graph,
                    query(
                        "MATCH (p:Puzzle)
                         WHERE elementId(p) = $id
                         SET p.needs_analysis = false, p.analysis_error = true",
                    )
                    .param("id", puzzle.id.clone()),
                )
                .await?;
                continue;
            }
        };

        // Create REQUIRES_TECHNIQUE edges with count
        for (technique_name, count) in &profile.techniques {
            run_query(
                graph,
                query(
                    "MATCH (p:Puzzle) WHERE elementId(p) = $pid
                     MATCH (t:Technique {display_name: $tname})
                     MERGE (p)-[r:REQUIRES_TECHNIQUE]->(t)
                     SET r.count = $count",
                )
                .param("pid", puzzle.id.clone())
                .param("tname", technique_name.clone())
                .param("count", *count as i64),
            )
            .await
            .context("Failed to create REQUIRES_TECHNIQUE edge")?;
        }

        // Create MAX_TECHNIQUE edge (highest SE rating technique)
        run_query(
            graph,
            query(
                "MATCH (p:Puzzle) WHERE elementId(p) = $pid
                 MATCH (t:Technique {display_name: $tname})
                 MERGE (p)-[:MAX_TECHNIQUE]->(t)",
            )
            .param("pid", puzzle.id.clone())
            .param("tname", profile.max_technique.clone()),
        )
        .await
        .context("Failed to create MAX_TECHNIQUE edge")?;

        // Create IN_TIER edge based on max SE rating
        run_query(
            graph,
            query(
                "MATCH (p:Puzzle) WHERE elementId(p) = $pid
                 MATCH (d:DifficultyTier)
                 WHERE d.min_se <= $se AND $se < d.max_se
                 MERGE (p)-[:IN_TIER]->(d)",
            )
            .param("pid", puzzle.id.clone())
            .param("se", profile.max_se_rating as f64),
        )
        .await
        .context("Failed to create IN_TIER edge")?;

        // Mark puzzle as analyzed
        run_query(
            graph,
            query(
                "MATCH (p:Puzzle) WHERE elementId(p) = $pid
                 SET p.needs_analysis = false,
                     p.max_se_rating = $se,
                     p.max_technique = $tname",
            )
            .param("pid", puzzle.id.clone())
            .param("se", profile.max_se_rating as f64)
            .param("tname", profile.max_technique.clone()),
        )
        .await
        .context("Failed to update puzzle")?;

        let technique_set: HashSet<String> = profile.techniques.keys().cloned().collect();
        analyzed.push(AnalyzedPuzzle {
            id: puzzle.id.clone(),
            technique_set,
        });

        if (i + 1) % 10 == 0 {
            info!("Analyzed {}/{} puzzles", i + 1, puzzles.len());
        }
    }

    info!(
        "Technique extraction complete. {} puzzles analyzed successfully.",
        analyzed.len()
    );

    // 3. Compute SHARES_TECHNIQUE_PROFILE edges (Jaccard >= 0.5)
    if analyzed.len() >= 2 {
        info!("Computing technique similarity between {} puzzles...", analyzed.len());
        let mut edge_count = 0;

        for i in 0..analyzed.len() {
            for j in (i + 1)..analyzed.len() {
                let sim = jaccard_similarity(&analyzed[i].technique_set, &analyzed[j].technique_set);
                if sim >= 0.5 {
                    run_query(
                        graph,
                        query(
                            "MATCH (a:Puzzle) WHERE elementId(a) = $aid
                             MATCH (b:Puzzle) WHERE elementId(b) = $bid
                             MERGE (a)-[r:SHARES_TECHNIQUE_PROFILE]-(b)
                             SET r.similarity = $sim",
                        )
                        .param("aid", analyzed[i].id.clone())
                        .param("bid", analyzed[j].id.clone())
                        .param("sim", sim),
                    )
                    .await
                    .context("Failed to create SHARES_TECHNIQUE_PROFILE edge")?;
                    edge_count += 1;
                }
            }
        }
        info!("Created {} similarity edges (Jaccard >= 0.5)", edge_count);
    }

    info!("Batch analysis complete.");
    Ok(())
}

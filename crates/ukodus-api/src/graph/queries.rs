use neo4rs::{query, Graph};
use uuid::Uuid;

use crate::error::ApiError;
use crate::models::galaxy::{
    GalaxyEdge, GalaxyNode, GalaxyOverview, GalaxyStats, ShareDetail, ShareInput, ShareResponse,
};
use crate::models::puzzle::{LeaderboardEntry, PuzzleDetail, TechniqueInfo};

// ── Puzzle CRUD ──────────────────────────────────────────────────────

pub async fn upsert_puzzle(
    graph: &Graph,
    puzzle_hash: &str,
    puzzle_string: &str,
    short_code: Option<&str>,
    difficulty: &str,
    se_rating: f32,
) -> Result<bool, ApiError> {
    let q = query(
        "MERGE (p:Puzzle {hash: $hash})
         ON CREATE SET p.puzzle_string = $ps, p.short_code = $sc, p.difficulty = $diff,
                       p.se_rating = $rating, p.play_count = 0, p.total_solve_time = 0,
                       p.win_count = 0, p.created_at = datetime()
         ON MATCH SET  p.short_code = COALESCE($sc, p.short_code)
         RETURN p.play_count = 0 AS is_new",
    )
    .param("hash", puzzle_hash)
    .param("ps", puzzle_string)
    .param("sc", short_code.unwrap_or(""))
    .param("diff", difficulty)
    .param("rating", se_rating as f64);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(row.get::<bool>("is_new").unwrap_or(true))
    } else {
        Ok(true)
    }
}

pub async fn create_game_result(
    graph: &Graph,
    puzzle_hash: &str,
    input: &crate::models::puzzle::GameResultInput,
    verified: bool,
) -> Result<String, ApiError> {
    let id = Uuid::new_v4().to_string();
    let q = query(
        "MATCH (p:Puzzle {hash: $hash})
         CREATE (r:GameResult {
             id: $id,
             result: $result,
             time_secs: $time,
             hints_used: $hints,
             mistakes: $mistakes,
             moves_count: $moves,
             avg_move_time_ms: $avg_mt,
             min_move_time_ms: $min_mt,
             move_time_std_dev: $std_dev,
             player_id: $player,
             player_tag: $tag,
             platform: $platform,
             device_model: $device_model,
             os_version: $os_version,
             app_version: $app_version,
             verified: $verified,
             created_at: datetime()
         })
         CREATE (r)-[:FOR_PUZZLE]->(p)
         RETURN r.id AS id",
    )
    .param("hash", puzzle_hash)
    .param("id", id.as_str())
    .param("result", input.result.as_str())
    .param("time", input.time_secs as i64)
    .param("hints", input.hints_used as i64)
    .param("mistakes", input.mistakes as i64)
    .param("moves", input.moves_count.unwrap_or(0) as i64)
    .param("avg_mt", input.avg_move_time_ms.unwrap_or(0) as i64)
    .param("min_mt", input.min_move_time_ms.unwrap_or(0) as i64)
    .param("std_dev", input.move_time_std_dev.unwrap_or(0.0) as f64)
    .param("player", input.player_id.as_str())
    .param("tag", input.player_tag.as_deref().unwrap_or(""))
    .param("platform", input.platform.as_deref().unwrap_or("web"))
    .param("device_model", input.device_model.as_deref().unwrap_or(""))
    .param("os_version", input.os_version.as_deref().unwrap_or(""))
    .param("app_version", input.app_version.as_deref().unwrap_or(""))
    .param("verified", verified);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(row.get::<String>("id").unwrap_or(id))
    } else {
        Ok(id)
    }
}

pub async fn update_puzzle_aggregates(graph: &Graph, puzzle_hash: &str) -> Result<(), ApiError> {
    let q = query(
        "MATCH (p:Puzzle {hash: $hash})
         OPTIONAL MATCH (r:GameResult)-[:FOR_PUZZLE]->(p)
         WITH p, count(r) AS plays,
              sum(CASE WHEN r.result = 'Win' THEN r.time_secs ELSE 0 END) AS total_time,
              sum(CASE WHEN r.result = 'Win' THEN 1 ELSE 0 END) AS wins
         SET p.play_count = plays,
             p.total_solve_time = total_time,
             p.win_count = wins",
    )
    .param("hash", puzzle_hash);

    graph.run(q).await?;
    Ok(())
}

pub async fn get_puzzle_by_hash(
    graph: &Graph,
    hash: &str,
) -> Result<Option<PuzzleDetail>, ApiError> {
    let q = query(
        "MATCH (p:Puzzle {hash: $hash})
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)
         WITH p, collect(t.name) AS techs
         RETURN p.hash AS puzzle_hash, p.puzzle_string AS puzzle_string,
                p.short_code AS short_code, p.difficulty AS difficulty,
                p.se_rating AS se_rating, p.play_count AS play_count,
                CASE WHEN p.win_count > 0
                     THEN toFloat(p.total_solve_time) / p.win_count
                     ELSE 0.0 END AS avg_solve_time,
                CASE WHEN p.play_count > 0
                     THEN toFloat(p.win_count) / p.play_count
                     ELSE 0.0 END AS win_rate,
                techs",
    )
    .param("hash", hash);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(Some(row_to_puzzle_detail(&row)))
    } else {
        Ok(None)
    }
}

pub async fn get_puzzle_by_code(
    graph: &Graph,
    code: &str,
) -> Result<Option<PuzzleDetail>, ApiError> {
    let q = query(
        "MATCH (p:Puzzle {short_code: $code})
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)
         WITH p, collect(t.name) AS techs
         RETURN p.hash AS puzzle_hash, p.puzzle_string AS puzzle_string,
                p.short_code AS short_code, p.difficulty AS difficulty,
                p.se_rating AS se_rating, p.play_count AS play_count,
                CASE WHEN p.win_count > 0
                     THEN toFloat(p.total_solve_time) / p.win_count
                     ELSE 0.0 END AS avg_solve_time,
                CASE WHEN p.play_count > 0
                     THEN toFloat(p.win_count) / p.play_count
                     ELSE 0.0 END AS win_rate,
                techs",
    )
    .param("code", code);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(Some(row_to_puzzle_detail(&row)))
    } else {
        Ok(None)
    }
}

fn row_to_puzzle_detail(row: &neo4rs::Row) -> PuzzleDetail {
    PuzzleDetail {
        puzzle_hash: row.get("puzzle_hash").unwrap_or_default(),
        puzzle_string: row.get("puzzle_string").unwrap_or_default(),
        short_code: row.get("short_code").ok(),
        difficulty: row.get("difficulty").unwrap_or_default(),
        se_rating: row.get::<f64>("se_rating").unwrap_or(0.0) as f32,
        play_count: row.get::<i64>("play_count").unwrap_or(0) as u64,
        avg_solve_time: row.get("avg_solve_time").unwrap_or(0.0),
        win_rate: row.get("win_rate").unwrap_or(0.0),
        techniques: row.get("techs").unwrap_or_default(),
    }
}

// ── Galaxy queries ───────────────────────────────────────────────────

pub async fn get_galaxy_overview(
    graph: &Graph,
    limit: u64,
) -> Result<GalaxyOverview, ApiError> {
    let node_q = query(
        "MATCH (p:Puzzle)
         WITH p ORDER BY p.play_count DESC LIMIT $limit
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)
         WITH p, collect(t.name) AS techniques
         RETURN p.hash AS puzzle_hash, p.short_code AS short_code,
                p.difficulty AS difficulty, p.se_rating AS se_rating,
                p.play_count AS play_count, p.max_technique AS max_technique,
                techniques, p.x AS x, p.y AS y",
    )
    .param("limit", limit as i64);

    let mut nodes = Vec::new();
    let mut result = graph.execute(node_q).await?;
    while let Some(row) = result.next().await? {
        nodes.push(row_to_galaxy_node(&row));
    }

    let hashes: Vec<String> = nodes.iter().map(|n| n.puzzle_hash.clone()).collect();
    let edges = if hashes.len() > 1 {
        get_edges_for_hashes(graph, &hashes).await?
    } else {
        Vec::new()
    };

    Ok(GalaxyOverview { nodes, edges })
}

async fn get_edges_for_hashes(
    graph: &Graph,
    hashes: &[String],
) -> Result<Vec<GalaxyEdge>, ApiError> {
    let q = query(
        "MATCH (a:Puzzle)-[s:SIMILAR_TO]->(b:Puzzle)
         WHERE a.hash IN $hashes AND b.hash IN $hashes
         RETURN a.hash AS source, b.hash AS target, s.similarity AS similarity",
    )
    .param("hashes", hashes.to_vec());

    let mut edges = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        edges.push(GalaxyEdge {
            source: row.get("source").unwrap_or_default(),
            target: row.get("target").unwrap_or_default(),
            similarity: row.get("similarity").unwrap_or(0.0),
        });
    }
    Ok(edges)
}

pub async fn get_galaxy_cluster(
    graph: &Graph,
    family: &str,
) -> Result<Vec<GalaxyNode>, ApiError> {
    let q = query(
        "MATCH (p:Puzzle {difficulty: $family})
         WITH p ORDER BY p.play_count DESC LIMIT 200
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)
         WITH p, collect(t.name) AS techniques
         RETURN p.hash AS puzzle_hash, p.short_code AS short_code,
                p.difficulty AS difficulty, p.se_rating AS se_rating,
                p.play_count AS play_count, p.max_technique AS max_technique,
                techniques, p.x AS x, p.y AS y",
    )
    .param("family", family);

    let mut nodes = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        nodes.push(row_to_galaxy_node(&row));
    }
    Ok(nodes)
}

pub async fn get_galaxy_neighbors(
    graph: &Graph,
    hash: &str,
) -> Result<GalaxyOverview, ApiError> {
    let q = query(
        "MATCH (p:Puzzle {hash: $hash})-[s:SIMILAR_TO]-(n:Puzzle)
         WITH n, s, p ORDER BY s.similarity DESC LIMIT 50
         OPTIONAL MATCH (n)-[:USES_TECHNIQUE]->(t:Technique)
         WITH n, s, p, collect(t.name) AS techniques
         RETURN n.hash AS puzzle_hash, n.short_code AS short_code,
                n.difficulty AS difficulty, n.se_rating AS se_rating,
                n.play_count AS play_count, n.max_technique AS max_technique,
                techniques, n.x AS x, n.y AS y,
                s.similarity AS similarity, p.hash AS origin",
    )
    .param("hash", hash);

    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        let node = row_to_galaxy_node(&row);
        edges.push(GalaxyEdge {
            source: row.get("origin").unwrap_or_default(),
            target: node.puzzle_hash.clone(),
            similarity: row.get("similarity").unwrap_or(0.0),
        });
        nodes.push(node);
    }
    Ok(GalaxyOverview { nodes, edges })
}

pub async fn get_galaxy_stats(graph: &Graph) -> Result<GalaxyStats, ApiError> {
    let q = query(
        "MATCH (p:Puzzle)
         WITH count(p) AS total_puzzles,
              sum(p.play_count) AS total_plays,
              CASE WHEN sum(p.win_count) > 0
                   THEN toFloat(sum(p.total_solve_time)) / sum(p.win_count)
                   ELSE 0.0 END AS avg_solve_time
         OPTIONAL MATCH (t:Technique)
         RETURN total_puzzles, total_plays, count(t) AS total_techniques, avg_solve_time",
    );

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(GalaxyStats {
            total_puzzles: row.get::<i64>("total_puzzles").unwrap_or(0) as u64,
            total_plays: row.get::<i64>("total_plays").unwrap_or(0) as u64,
            total_techniques: row.get::<i64>("total_techniques").unwrap_or(0) as u64,
            avg_solve_time: row.get("avg_solve_time").unwrap_or(0.0),
        })
    } else {
        Ok(GalaxyStats {
            total_puzzles: 0,
            total_plays: 0,
            total_techniques: 0,
            avg_solve_time: 0.0,
        })
    }
}

pub async fn get_recent_plays(
    graph: &Graph,
    limit: u64,
) -> Result<Vec<GalaxyNode>, ApiError> {
    let q = query(
        "MATCH (r:GameResult)-[:FOR_PUZZLE]->(p:Puzzle)
         WITH p, max(r.created_at) AS latest
         ORDER BY latest DESC LIMIT $limit
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)
         WITH p, collect(t.name) AS techniques
         RETURN p.hash AS puzzle_hash, p.short_code AS short_code,
                p.difficulty AS difficulty, p.se_rating AS se_rating,
                p.play_count AS play_count, p.max_technique AS max_technique,
                techniques, p.x AS x, p.y AS y",
    )
    .param("limit", limit as i64);

    let mut nodes = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        nodes.push(row_to_galaxy_node(&row));
    }
    Ok(nodes)
}

fn row_to_galaxy_node(row: &neo4rs::Row) -> GalaxyNode {
    GalaxyNode {
        puzzle_hash: row.get("puzzle_hash").unwrap_or_default(),
        short_code: row.get("short_code").ok(),
        difficulty: row.get("difficulty").unwrap_or_default(),
        se_rating: row.get::<f64>("se_rating").unwrap_or(0.0) as f32,
        play_count: row.get::<i64>("play_count").unwrap_or(0) as u64,
        max_technique: row.get("max_technique").ok(),
        techniques: row.get("techniques").unwrap_or_default(),
        x: row.get("x").ok(),
        y: row.get("y").ok(),
    }
}

// ── Techniques ───────────────────────────────────────────────────────

pub async fn get_all_techniques(graph: &Graph) -> Result<Vec<TechniqueInfo>, ApiError> {
    let q = query(
        "MATCH (t:Technique)
         OPTIONAL MATCH (p:Puzzle)-[:USES_TECHNIQUE]->(t)
         RETURN t.name AS name, count(p) AS puzzle_count
         ORDER BY puzzle_count DESC",
    );

    let mut techniques = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        techniques.push(TechniqueInfo {
            name: row.get("name").unwrap_or_default(),
            puzzle_count: row.get::<i64>("puzzle_count").unwrap_or(0) as u64,
        });
    }
    Ok(techniques)
}

pub async fn get_puzzles_by_technique(
    graph: &Graph,
    name: &str,
    limit: u64,
) -> Result<Vec<GalaxyNode>, ApiError> {
    let q = query(
        "MATCH (p:Puzzle)-[:USES_TECHNIQUE]->(t:Technique {name: $name})
         WITH p ORDER BY p.play_count DESC LIMIT $limit
         OPTIONAL MATCH (p)-[:USES_TECHNIQUE]->(t2:Technique)
         WITH p, collect(t2.name) AS techniques
         RETURN p.hash AS puzzle_hash, p.short_code AS short_code,
                p.difficulty AS difficulty, p.se_rating AS se_rating,
                p.play_count AS play_count, p.max_technique AS max_technique,
                techniques, p.x AS x, p.y AS y",
    )
    .param("name", name)
    .param("limit", limit as i64);

    let mut nodes = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        nodes.push(row_to_galaxy_node(&row));
    }
    Ok(nodes)
}

// ── Share ────────────────────────────────────────────────────────────

pub async fn upsert_shared_puzzle(
    graph: &Graph,
    input: &ShareInput,
    base_url: &str,
) -> Result<ShareResponse, ApiError> {
    let share_id = Uuid::new_v4().to_string();
    let puzzle_hash = format!("{:x}", md5_hash(&input.puzzle_string));

    let q = query(
        "MERGE (s:Share {puzzle_hash: $phash, player_id: $player})
         ON CREATE SET s.share_id = $sid, s.puzzle_string = $ps,
                       s.short_code = $sc, s.difficulty = $diff,
                       s.se_rating = $rating, s.platform = $platform,
                       s.created_at = datetime()
         ON MATCH SET  s.platform = $platform
         RETURN s.share_id AS share_id, s.short_code AS short_code",
    )
    .param("phash", puzzle_hash.as_str())
    .param("player", input.player_id.as_str())
    .param("sid", share_id.as_str())
    .param("ps", input.puzzle_string.as_str())
    .param("sc", input.short_code.as_deref().unwrap_or(""))
    .param("diff", input.difficulty.as_str())
    .param("rating", input.se_rating as f64)
    .param("platform", input.platform.as_str());

    let mut result = graph.execute(q).await?;
    let (final_id, final_code) = if let Some(row) = result.next().await? {
        let id: String = row.get("share_id").unwrap_or(share_id);
        let code: Option<String> = row.get("short_code").ok();
        (id, code)
    } else {
        (share_id, input.short_code.clone())
    };

    let share_url = format!("{}/s/{}", base_url, final_id);
    let qr_data = if let Some(ref code) = final_code {
        if !code.is_empty() {
            format!("{}/play/?s={}", base_url, code)
        } else {
            share_url.clone()
        }
    } else {
        share_url.clone()
    };

    Ok(ShareResponse {
        share_id: final_id,
        share_url,
        short_code: final_code.filter(|c| !c.is_empty()),
        qr_data,
    })
}

pub async fn get_share_by_id(
    graph: &Graph,
    id: &str,
) -> Result<Option<ShareDetail>, ApiError> {
    let q = query(
        "MATCH (s:Share {share_id: $id})
         RETURN s.share_id AS share_id, s.puzzle_hash AS puzzle_hash,
                s.puzzle_string AS puzzle_string, s.short_code AS short_code,
                s.difficulty AS difficulty, s.se_rating AS se_rating,
                s.platform AS platform, s.player_id AS player_id,
                toString(s.created_at) AS created_at",
    )
    .param("id", id);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(Some(row_to_share_detail(&row, "")))
    } else {
        Ok(None)
    }
}

pub async fn get_share_by_code(
    graph: &Graph,
    code: &str,
) -> Result<Option<ShareDetail>, ApiError> {
    let q = query(
        "MATCH (s:Share {short_code: $code})
         RETURN s.share_id AS share_id, s.puzzle_hash AS puzzle_hash,
                s.puzzle_string AS puzzle_string, s.short_code AS short_code,
                s.difficulty AS difficulty, s.se_rating AS se_rating,
                s.platform AS platform, s.player_id AS player_id,
                toString(s.created_at) AS created_at
         LIMIT 1",
    )
    .param("code", code);

    let mut result = graph.execute(q).await?;
    if let Some(row) = result.next().await? {
        Ok(Some(row_to_share_detail(&row, "")))
    } else {
        Ok(None)
    }
}

pub async fn get_recent_shares(
    graph: &Graph,
    limit: u64,
) -> Result<Vec<ShareDetail>, ApiError> {
    let q = query(
        "MATCH (s:Share)
         RETURN s.share_id AS share_id, s.puzzle_hash AS puzzle_hash,
                s.puzzle_string AS puzzle_string, s.short_code AS short_code,
                s.difficulty AS difficulty, s.se_rating AS se_rating,
                s.platform AS platform, s.player_id AS player_id,
                toString(s.created_at) AS created_at
         ORDER BY s.created_at DESC
         LIMIT $limit",
    )
    .param("limit", limit as i64);

    let mut shares = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        shares.push(row_to_share_detail(&row, ""));
    }
    Ok(shares)
}

fn row_to_share_detail(row: &neo4rs::Row, _base_url: &str) -> ShareDetail {
    let share_id: String = row.get("share_id").unwrap_or_default();
    ShareDetail {
        share_id: share_id.clone(),
        puzzle_hash: row.get("puzzle_hash").unwrap_or_default(),
        puzzle_string: row.get("puzzle_string").unwrap_or_default(),
        short_code: row.get("short_code").ok().filter(|s: &String| !s.is_empty()),
        difficulty: row.get("difficulty").unwrap_or_default(),
        se_rating: row.get::<f64>("se_rating").unwrap_or(0.0) as f32,
        platform: row.get("platform").unwrap_or_default(),
        player_id: row.get("player_id").unwrap_or_default(),
        share_url: String::new(),
        created_at: row.get("created_at").unwrap_or_default(),
    }
}

// ── Leaderboard ──────────────────────────────────────────────────────

pub async fn get_leaderboard(
    graph: &Graph,
    difficulty: Option<&str>,
    puzzle_hash: Option<&str>,
    limit: u64,
    offset: u64,
) -> Result<Vec<LeaderboardEntry>, ApiError> {
    let cypher = if puzzle_hash.is_some() {
        "MATCH (r:GameResult)-[:FOR_PUZZLE]->(p:Puzzle {hash: $hash})
         WHERE r.result = 'Win' AND r.verified = true AND r.hints_used = 0 AND r.mistakes < 3
         RETURN r.player_id AS player_id, r.player_tag AS player_tag,
                r.time_secs AS time_secs,
                r.hints_used AS hints_used, r.mistakes AS mistakes,
                p.hash AS puzzle_hash
         ORDER BY r.time_secs ASC
         SKIP $offset LIMIT $limit"
    } else if difficulty.is_some() {
        "MATCH (r:GameResult)-[:FOR_PUZZLE]->(p:Puzzle {difficulty: $diff})
         WHERE r.result = 'Win' AND r.verified = true AND r.hints_used = 0 AND r.mistakes < 3
         RETURN r.player_id AS player_id, r.player_tag AS player_tag,
                r.time_secs AS time_secs,
                r.hints_used AS hints_used, r.mistakes AS mistakes,
                p.hash AS puzzle_hash
         ORDER BY r.time_secs ASC
         SKIP $offset LIMIT $limit"
    } else {
        "MATCH (r:GameResult)-[:FOR_PUZZLE]->(p:Puzzle)
         WHERE r.result = 'Win' AND r.verified = true AND r.hints_used = 0 AND r.mistakes < 3
         RETURN r.player_id AS player_id, r.player_tag AS player_tag,
                r.time_secs AS time_secs,
                r.hints_used AS hints_used, r.mistakes AS mistakes,
                p.hash AS puzzle_hash
         ORDER BY r.time_secs ASC
         SKIP $offset LIMIT $limit"
    };

    let mut q = query(cypher)
        .param("limit", limit as i64)
        .param("offset", offset as i64);

    if let Some(hash) = puzzle_hash {
        q = q.param("hash", hash);
    } else if let Some(diff) = difficulty {
        q = q.param("diff", diff);
    }

    let mut entries = Vec::new();
    let mut result = graph.execute(q).await?;
    while let Some(row) = result.next().await? {
        entries.push(LeaderboardEntry {
            player_id: row.get("player_id").unwrap_or_default(),
            player_tag: row.get::<String>("player_tag").ok().filter(|s| !s.is_empty()),
            time_secs: row.get::<i64>("time_secs").unwrap_or(0) as u64,
            hints_used: row.get::<i64>("hints_used").unwrap_or(0) as u32,
            mistakes: row.get::<i64>("mistakes").unwrap_or(0) as u32,
            puzzle_hash: row.get("puzzle_hash").unwrap_or_default(),
        });
    }
    Ok(entries)
}

// ── Helpers ──────────────────────────────────────────────────────────

fn md5_hash(input: &str) -> u128 {
    // Simple FNV-like hash for puzzle dedup (not cryptographic, just for ID)
    let mut hash: u128 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u128;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

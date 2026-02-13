use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GalaxyOverview {
    pub nodes: Vec<GalaxyNode>,
    pub edges: Vec<GalaxyEdge>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GalaxyNode {
    pub puzzle_hash: String,
    pub short_code: Option<String>,
    pub difficulty: String,
    pub se_rating: f32,
    pub play_count: u64,
    pub max_technique: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GalaxyEdge {
    pub source: String,
    pub target: String,
    pub similarity: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GalaxyStats {
    pub total_puzzles: u64,
    pub total_plays: u64,
    pub total_techniques: u64,
    pub avg_solve_time: f64,
}

#[derive(Debug, Deserialize)]
pub struct ShareInput {
    pub short_code: Option<String>,
    pub puzzle_string: String,
    pub difficulty: String,
    pub se_rating: f32,
    pub platform: String,
    pub player_id: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ShareResponse {
    pub share_id: String,
    pub share_url: String,
    pub short_code: Option<String>,
    pub qr_data: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ShareDetail {
    pub share_id: String,
    pub puzzle_hash: String,
    pub puzzle_string: String,
    pub short_code: Option<String>,
    pub difficulty: String,
    pub se_rating: f32,
    pub platform: String,
    pub player_id: String,
    pub share_url: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct GalaxyQuery {
    pub limit: Option<u64>,
}

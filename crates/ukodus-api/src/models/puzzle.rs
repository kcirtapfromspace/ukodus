use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct GameResultInput {
    pub puzzle_hash: String,
    pub puzzle_string: String,
    pub short_code: Option<String>,
    pub difficulty: String,
    pub se_rating: f32,
    pub result: String,
    pub time_secs: u64,
    pub hints_used: u32,
    pub mistakes: u32,
    pub moves_count: u32,
    pub avg_move_time_ms: u64,
    pub min_move_time_ms: u64,
    pub move_time_std_dev: f32,
    pub player_id: String,
}

#[derive(Debug, Serialize)]
pub struct GameResultResponse {
    pub id: String,
    pub verified: bool,
    pub puzzle_is_new: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct PuzzleDetail {
    pub puzzle_hash: String,
    pub puzzle_string: String,
    pub short_code: Option<String>,
    pub difficulty: String,
    pub se_rating: f32,
    pub play_count: u64,
    pub avg_solve_time: f64,
    pub win_rate: f64,
    pub techniques: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct TechniqueInfo {
    pub name: String,
    pub puzzle_count: u64,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub player_id: String,
    pub time_secs: u64,
    pub hints_used: u32,
    pub mistakes: u32,
    pub puzzle_hash: String,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub difficulty: Option<String>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

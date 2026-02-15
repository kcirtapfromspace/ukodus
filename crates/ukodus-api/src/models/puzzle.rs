use serde::{Deserialize, Serialize};

/// A single move from the WASM move log (mirrors sudoku-wasm types)
#[derive(Debug, Clone, Deserialize)]
pub struct MoveLogEntry {
    pub seq: u32,
    pub ms: u32,
    pub cell: u8,
    pub action: MoveAction,
}

/// The action taken on a cell (mirrors sudoku-wasm MoveAction)
#[derive(Debug, Clone, Deserialize)]
pub enum MoveAction {
    Place(u8),
    Clear(u8),
    Hint(u8),
    Undo(Option<u8>),
    Redo(Option<u8>),
}

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
    pub moves_count: Option<u32>,
    pub avg_move_time_ms: Option<u64>,
    pub min_move_time_ms: Option<u64>,
    pub move_time_std_dev: Option<f32>,
    pub player_id: String,
    pub player_tag: Option<String>,
    pub move_log: Option<Vec<MoveLogEntry>>,
    pub platform: Option<String>,
    pub device_model: Option<String>,
    pub os_version: Option<String>,
    pub app_version: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GameResultResponse {
    pub id: String,
    pub verified: bool,
    pub puzzle_is_new: bool,
    pub leaderboard_eligible: bool,
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
    pub player_tag: Option<String>,
    pub time_secs: u64,
    pub hints_used: u32,
    pub mistakes: u32,
    pub puzzle_hash: String,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub difficulty: Option<String>,
    pub puzzle_hash: Option<String>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

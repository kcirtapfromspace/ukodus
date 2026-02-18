use std::sync::Arc;

use axum::extract::{Query, State};
use axum::Json;

use crate::error::{ApiError, ApiResult};
use crate::extractors::ApiKeyAuth;
use crate::graph::queries;
use crate::models::puzzle::{
    MinedPuzzleInput, MinedPuzzleResponse, PoolInventoryResponse, PoolMonitoringResponse,
    PuzzleDetail, UndiscoveredQuery,
};
use crate::state::AppState;

const VALID_DIFFICULTIES: &[&str] = &["Hard", "Expert", "Master", "Extreme"];

pub async fn submit_mined(
    _auth: ApiKeyAuth,
    State(state): State<Arc<AppState>>,
    Json(input): Json<MinedPuzzleInput>,
) -> ApiResult<Json<MinedPuzzleResponse>> {
    // Validate puzzle_string length
    if input.puzzle_string.len() != 81 {
        return Err(ApiError::BadRequest(
            "puzzle_string must be 81 characters".into(),
        ));
    }

    // Validate solution_string length
    if input.solution_string.len() != 81 {
        return Err(ApiError::BadRequest(
            "solution_string must be 81 characters".into(),
        ));
    }

    // Validate difficulty
    if !VALID_DIFFICULTIES.contains(&input.difficulty.as_str()) {
        return Err(ApiError::BadRequest(
            format!("difficulty must be one of: {}", VALID_DIFFICULTIES.join(", ")),
        ));
    }

    // Validate puzzle_string characters (digits 1-9 and dots)
    if !input
        .puzzle_string
        .chars()
        .all(|c| c.is_ascii_digit() || c == '.')
    {
        return Err(ApiError::BadRequest(
            "puzzle_string contains invalid characters".into(),
        ));
    }

    // Validate solution_string characters (digits 1-9 only)
    if !input
        .solution_string
        .chars()
        .all(|c| matches!(c, '1'..='9'))
    {
        return Err(ApiError::BadRequest(
            "solution_string must contain only digits 1-9".into(),
        ));
    }

    let duplicate = queries::upsert_mined_puzzle(
        state.graph.inner(),
        &input.puzzle_hash,
        &input.puzzle_string,
        &input.solution_string,
        &input.difficulty,
        input.se_rating,
        input.short_code.as_deref(),
    )
    .await?;

    Ok(Json(MinedPuzzleResponse {
        accepted: true,
        duplicate,
    }))
}

pub async fn get_undiscovered(
    _auth: ApiKeyAuth,
    State(state): State<Arc<AppState>>,
    Query(params): Query<UndiscoveredQuery>,
) -> ApiResult<Json<PuzzleDetail>> {
    let puzzle = queries::get_undiscovered_puzzle(
        state.graph.inner(),
        params.difficulty.as_deref(),
    )
    .await?;

    puzzle
        .map(Json)
        .ok_or_else(|| ApiError::NotFound("no undiscovered puzzles available".into()))
}

pub async fn pool_inventory(
    _auth: ApiKeyAuth,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<PoolInventoryResponse>> {
    let counts = queries::get_pool_inventory(state.graph.inner()).await?;
    Ok(Json(PoolInventoryResponse { counts }))
}

pub async fn pool_monitoring(
    _auth: ApiKeyAuth,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<PoolMonitoringResponse>> {
    let pools = queries::get_pool_monitoring(state.graph.inner()).await?;
    Ok(Json(PoolMonitoringResponse { pools }))
}

use axum::extract::{Query, State};
use axum::Json;
use std::sync::Arc;

use crate::error::{ApiError, ApiResult};
use crate::graph::queries;
use crate::models::puzzle::{
    GameResultInput, GameResultResponse, LeaderboardEntry, LeaderboardQuery,
};
use crate::services::galaxy_service;
use crate::services::result_service::AntiBot;
use crate::state::AppState;

pub async fn submit_result(
    State(state): State<Arc<AppState>>,
    Json(input): Json<GameResultInput>,
) -> ApiResult<Json<GameResultResponse>> {
    // Validate puzzle_string: 81 chars, digits 0-9
    if input.puzzle_string.len() != 81 {
        return Err(ApiError::BadRequest(
            "puzzle_string must be exactly 81 characters".into(),
        ));
    }
    if !input.puzzle_string.chars().all(|c| c.is_ascii_digit()) {
        return Err(ApiError::BadRequest(
            "puzzle_string must contain only digits 0-9".into(),
        ));
    }

    // Validate result field
    if input.result != "Win" && input.result != "Loss" {
        return Err(ApiError::BadRequest(
            "result must be 'Win' or 'Loss'".into(),
        ));
    }

    // Anti-bot verification
    let verification = AntiBot::verify(&input);

    // Upsert puzzle
    let puzzle_is_new = queries::upsert_puzzle(
        state.graph.inner(),
        &input.puzzle_hash,
        &input.puzzle_string,
        input.short_code.as_deref(),
        &input.difficulty,
        input.se_rating,
    )
    .await?;

    // Create game result
    let id = queries::create_game_result(state.graph.inner(), &input.puzzle_hash, &input).await?;

    // Update aggregates
    queries::update_puzzle_aggregates(state.graph.inner(), &input.puzzle_hash).await?;

    // Invalidate galaxy cache on new data
    let _ = galaxy_service::invalidate_cache(&state).await;

    Ok(Json(GameResultResponse {
        id,
        verified: verification.verified,
        puzzle_is_new,
    }))
}

pub async fn leaderboard(
    State(state): State<Arc<AppState>>,
    Query(params): Query<LeaderboardQuery>,
) -> ApiResult<Json<Vec<LeaderboardEntry>>> {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);

    let entries = queries::get_leaderboard(
        state.graph.inner(),
        params.difficulty.as_deref(),
        limit,
        offset,
    )
    .await?;

    Ok(Json(entries))
}

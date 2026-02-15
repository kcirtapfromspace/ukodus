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
    // Validate puzzle_string: 81 chars, digits 0-9 or '.' for empty cells
    if input.puzzle_string.len() != 81 {
        return Err(ApiError::BadRequest(
            "puzzle_string must be exactly 81 characters".into(),
        ));
    }
    if !input
        .puzzle_string
        .chars()
        .all(|c| c.is_ascii_digit() || c == '.')
    {
        return Err(ApiError::BadRequest(
            "puzzle_string must contain only digits 0-9 or '.'".into(),
        ));
    }
    // Normalize dots to zeros for consistent storage
    let input = {
        let mut input = input;
        input.puzzle_string = input.puzzle_string.replace('.', "0");
        input
    };

    // Validate result field
    if input.result != "Win" && input.result != "Loss" {
        return Err(ApiError::BadRequest(
            "result must be 'Win' or 'Loss'".into(),
        ));
    }

    // Anti-bot verification
    let verification = AntiBot::verify(&input);

    // Move log replay verification
    let mut replay_valid = true;
    if let Some(ref log) = input.move_log {
        if !log.is_empty() {
            let replay = AntiBot::replay(
                &input.puzzle_string,
                log,
                input.mistakes,
                input.hints_used,
            );
            if !replay.valid {
                for issue in &replay.issues {
                    tracing::warn!(player_id = %input.player_id, "replay issue: {}", issue);
                }
                replay_valid = false;
            }
        }
    }

    let verified = verification.verified && replay_valid;

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
    let id = queries::create_game_result(
        state.graph.inner(),
        &input.puzzle_hash,
        &input,
        verified,
    )
    .await?;

    // Update aggregates
    queries::update_puzzle_aggregates(state.graph.inner(), &input.puzzle_hash).await?;

    // Invalidate galaxy cache on new data
    let _ = galaxy_service::invalidate_cache(&state).await;

    let leaderboard_eligible =
        verified && input.hints_used == 0 && input.mistakes < 3;

    Ok(Json(GameResultResponse {
        id,
        verified,
        puzzle_is_new,
        leaderboard_eligible,
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
        params.puzzle_hash.as_deref(),
        limit,
        offset,
    )
    .await?;

    Ok(Json(entries))
}

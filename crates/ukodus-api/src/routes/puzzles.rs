use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::sync::Arc;

use crate::error::{ApiError, ApiResult};
use crate::graph::queries;
use crate::models::puzzle::PuzzleDetail;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct RandomQuery {
    pub difficulty: Option<String>,
}

pub async fn get_by_hash(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> ApiResult<Json<PuzzleDetail>> {
    let puzzle = queries::get_puzzle_by_hash(state.graph.inner(), &hash)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("puzzle {} not found", hash)))?;

    Ok(Json(puzzle))
}

pub async fn get_by_code(
    State(state): State<Arc<AppState>>,
    Path(short_code): Path<String>,
) -> ApiResult<Json<PuzzleDetail>> {
    let puzzle = queries::get_puzzle_by_code(state.graph.inner(), &short_code)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("puzzle with code {} not found", short_code)))?;

    Ok(Json(puzzle))
}

pub async fn get_random(
    State(state): State<Arc<AppState>>,
    Query(params): Query<RandomQuery>,
) -> ApiResult<Json<PuzzleDetail>> {
    let puzzle = queries::get_random_puzzle(
        state.graph.inner(),
        params.difficulty.as_deref(),
    )
    .await?
    .ok_or_else(|| ApiError::NotFound("no analyzed puzzles available".to_string()))?;

    Ok(Json(puzzle))
}

pub async fn get_techniques(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> ApiResult<Json<Vec<String>>> {
    let puzzle = queries::get_puzzle_by_hash(state.graph.inner(), &hash)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("puzzle {} not found", hash)))?;

    Ok(Json(puzzle.techniques))
}

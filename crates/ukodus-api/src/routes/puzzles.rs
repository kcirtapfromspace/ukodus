use axum::extract::{Path, State};
use axum::Json;
use std::sync::Arc;

use crate::error::{ApiError, ApiResult};
use crate::graph::queries;
use crate::models::puzzle::PuzzleDetail;
use crate::state::AppState;

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

pub async fn get_techniques(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> ApiResult<Json<Vec<String>>> {
    let puzzle = queries::get_puzzle_by_hash(state.graph.inner(), &hash)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("puzzle {} not found", hash)))?;

    Ok(Json(puzzle.techniques))
}

use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Redirect};
use axum::Json;
use std::sync::Arc;

use crate::error::{ApiError, ApiResult};
use crate::graph::queries;
use crate::models::galaxy::{GalaxyQuery, ShareDetail, ShareInput, ShareResponse};
use crate::state::AppState;

pub async fn create_share(
    State(state): State<Arc<AppState>>,
    Json(input): Json<ShareInput>,
) -> ApiResult<Json<ShareResponse>> {
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

    let resp = queries::upsert_shared_puzzle(
        state.graph.inner(),
        &input,
        &state.config.base_url,
    )
    .await?;

    Ok(Json(resp))
}

pub async fn get_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> ApiResult<Json<ShareDetail>> {
    let detail = queries::get_share_by_id(state.graph.inner(), &id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("share {} not found", id)))?;

    Ok(Json(detail))
}

pub async fn get_by_code(
    State(state): State<Arc<AppState>>,
    Path(short_code): Path<String>,
) -> ApiResult<Json<ShareDetail>> {
    let detail = queries::get_share_by_code(state.graph.inner(), &short_code)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("share with code {} not found", short_code)))?;

    Ok(Json(detail))
}

pub async fn recent_shares(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GalaxyQuery>,
) -> ApiResult<Json<Vec<ShareDetail>>> {
    let limit = params.limit.unwrap_or(20).min(100);
    let shares = queries::get_recent_shares(state.graph.inner(), limit).await?;
    Ok(Json(shares))
}

pub async fn vanity_redirect(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // Look up by share_id first, then try short_code
    let detail = if let Some(d) = queries::get_share_by_id(state.graph.inner(), &id).await? {
        d
    } else if let Some(d) = queries::get_share_by_code(state.graph.inner(), &id).await? {
        d
    } else {
        return Err(ApiError::NotFound(format!("share {} not found", id)));
    };

    let redirect_target = if let Some(ref code) = detail.short_code {
        format!("/play/?s={}", code)
    } else {
        format!("/play/?p={}", detail.puzzle_string)
    };

    Ok(Redirect::temporary(&redirect_target))
}

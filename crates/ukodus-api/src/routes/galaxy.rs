use axum::extract::{Path, Query, State};
use axum::Json;
use std::sync::Arc;

use crate::error::ApiResult;
use crate::graph::queries;
use crate::models::galaxy::{GalaxyNode, GalaxyOverview, GalaxyQuery, GalaxyStats};
use crate::services::galaxy_service;
use crate::state::AppState;

pub async fn overview(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GalaxyQuery>,
) -> ApiResult<Json<GalaxyOverview>> {
    let limit = params.limit.unwrap_or(500).min(2000);
    let overview = galaxy_service::get_cached_overview(&state, limit).await?;
    Ok(Json(overview))
}

pub async fn cluster(
    State(state): State<Arc<AppState>>,
    Path(family): Path<String>,
) -> ApiResult<Json<Vec<GalaxyNode>>> {
    let nodes = queries::get_galaxy_cluster(state.graph.inner(), &family).await?;
    Ok(Json(nodes))
}

pub async fn neighbors(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> ApiResult<Json<GalaxyOverview>> {
    let overview = queries::get_galaxy_neighbors(state.graph.inner(), &hash).await?;
    Ok(Json(overview))
}

pub async fn stats(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<GalaxyStats>> {
    let stats = galaxy_service::get_cached_stats(&state).await?;
    Ok(Json(stats))
}

pub async fn recent(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GalaxyQuery>,
) -> ApiResult<Json<Vec<GalaxyNode>>> {
    let limit = params.limit.unwrap_or(20).min(100);
    let nodes = queries::get_recent_plays(state.graph.inner(), limit).await?;
    Ok(Json(nodes))
}

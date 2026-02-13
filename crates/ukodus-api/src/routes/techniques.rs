use axum::extract::{Path, Query, State};
use axum::Json;
use std::sync::Arc;

use crate::error::ApiResult;
use crate::graph::queries;
use crate::models::galaxy::GalaxyNode;
use crate::models::puzzle::TechniqueInfo;
use crate::state::AppState;

#[derive(serde::Deserialize)]
pub struct TechniqueQuery {
    pub limit: Option<u64>,
}

pub async fn list_all(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Vec<TechniqueInfo>>> {
    let techniques = queries::get_all_techniques(state.graph.inner()).await?;
    Ok(Json(techniques))
}

pub async fn puzzles_by_technique(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
    Query(params): Query<TechniqueQuery>,
) -> ApiResult<Json<Vec<GalaxyNode>>> {
    let limit = params.limit.unwrap_or(50).min(200);
    let puzzles = queries::get_puzzles_by_technique(state.graph.inner(), &name, limit).await?;
    Ok(Json(puzzles))
}

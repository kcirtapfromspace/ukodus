use redis::AsyncCommands;

use crate::error::{ApiError, ApiResult};
use crate::graph::queries;
use crate::models::galaxy::{GalaxyOverview, GalaxyStats};
use crate::state::AppState;

const GALAXY_OVERVIEW_KEY: &str = "galaxy:overview";
const GALAXY_STATS_KEY: &str = "galaxy:stats";
const OVERVIEW_TTL_SECS: u64 = 60;
const STATS_TTL_SECS: u64 = 30;

pub async fn get_cached_overview(
    state: &AppState,
    limit: u64,
) -> ApiResult<GalaxyOverview> {
    let cache_key = format!("{}:{}", GALAXY_OVERVIEW_KEY, limit);

    // Try cache first
    let mut redis = state.redis.clone();
    if let Ok(cached) = redis.get::<_, Option<String>>(&cache_key).await {
        if let Some(json) = cached {
            if let Ok(overview) = serde_json::from_str::<GalaxyOverview>(&json) {
                return Ok(overview);
            }
        }
    }

    // Cache miss: query graph
    let overview = queries::get_galaxy_overview(state.graph.inner(), limit).await?;

    // Store in cache
    if let Ok(json) = serde_json::to_string(&overview) {
        let _: Result<(), _> = redis
            .set_ex::<_, _, ()>(&cache_key, json, OVERVIEW_TTL_SECS)
            .await;
    }

    Ok(overview)
}

pub async fn get_cached_stats(state: &AppState) -> ApiResult<GalaxyStats> {
    let mut redis = state.redis.clone();

    if let Ok(cached) = redis.get::<_, Option<String>>(GALAXY_STATS_KEY).await {
        if let Some(json) = cached {
            if let Ok(stats) = serde_json::from_str::<GalaxyStats>(&json) {
                return Ok(stats);
            }
        }
    }

    let stats = queries::get_galaxy_stats(state.graph.inner()).await?;

    if let Ok(json) = serde_json::to_string(&stats) {
        let _: Result<(), _> = redis
            .set_ex::<_, _, ()>(GALAXY_STATS_KEY, json, STATS_TTL_SECS)
            .await;
    }

    Ok(stats)
}

pub async fn invalidate_cache(state: &AppState) -> Result<(), ApiError> {
    let mut redis = state.redis.clone();
    // Delete all galaxy overview keys and stats
    let _: Result<(), _> = redis.del::<_, ()>(GALAXY_STATS_KEY).await;
    // Scan and delete overview keys
    let _: Result<(), _> = redis.del::<_, ()>(format!("{}:*", GALAXY_OVERVIEW_KEY)).await;
    Ok(())
}

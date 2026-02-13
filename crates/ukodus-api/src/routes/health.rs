use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use neo4rs::query;
use redis::cmd;
use std::sync::Arc;

use crate::state::AppState;

pub async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

pub async fn readyz(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    // Check Neo4j
    let neo4j_ok = state
        .graph
        .inner()
        .execute(query("RETURN 1"))
        .await
        .is_ok();

    // Check Redis
    let mut redis = state.redis.clone();
    let redis_ok: bool = cmd("PING")
        .query_async::<String>(&mut redis)
        .await
        .is_ok();

    if neo4j_ok && redis_ok {
        (StatusCode::OK, "ready".to_string())
    } else {
        let mut msg = String::from("not ready:");
        if !neo4j_ok {
            msg.push_str(" neo4j down");
        }
        if !redis_ok {
            msg.push_str(" redis down");
        }
        (StatusCode::SERVICE_UNAVAILABLE, msg)
    }
}

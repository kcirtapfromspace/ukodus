use std::sync::Arc;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::error::ApiError;
use crate::state::AppState;

pub struct ApiKeyAuth;

impl FromRequestParts<Arc<AppState>> for ApiKeyAuth {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let expected = state.config.mining_api_key.as_deref().ok_or_else(|| {
            ApiError::ServiceUnavailable("mining not configured".into())
        })?;

        let provided = parts
            .headers
            .get("X-Api-Key")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| ApiError::Unauthorized("missing X-Api-Key header".into()))?;

        if provided != expected {
            return Err(ApiError::Unauthorized("invalid API key".into()));
        }

        Ok(ApiKeyAuth)
    }
}

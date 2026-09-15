mod error {
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/error.rs"));
}

use axum::{body::to_bytes, http::StatusCode, response::IntoResponse};
use error::{ApiError, ApiResult};

#[tokio::test]
async fn errors_keep_their_http_status_and_json_contract() {
    let graph_error = neo4rs::Graph::new("https://localhost:7687", "neo4j", "unused")
        .await
        .err()
        .expect("unsupported database URI must fail without connecting");
    let cache_error = redis::RedisError::from((redis::ErrorKind::TypeError, "invalid cache value"));
    let graph_message = graph_error.to_string();
    let cache_message = cache_error.to_string();
    let cases: Vec<(ApiError, StatusCode, &str)> = vec![
        (
            ApiError::NotFound("missing".into()),
            StatusCode::NOT_FOUND,
            "missing",
        ),
        (
            ApiError::BadRequest("invalid".into()),
            StatusCode::BAD_REQUEST,
            "invalid",
        ),
        (
            ApiError::Unauthorized("key required".into()),
            StatusCode::UNAUTHORIZED,
            "key required",
        ),
        (
            ApiError::ServiceUnavailable("offline".into()),
            StatusCode::SERVICE_UNAVAILABLE,
            "offline",
        ),
        (
            ApiError::Internal("failure".into()),
            StatusCode::INTERNAL_SERVER_ERROR,
            "failure",
        ),
        (
            graph_error.into(),
            StatusCode::INTERNAL_SERVER_ERROR,
            &graph_message,
        ),
        (
            cache_error.into(),
            StatusCode::INTERNAL_SERVER_ERROR,
            &cache_message,
        ),
    ];
    for (error, status, message) in cases {
        let result: ApiResult<()> = Err(error);
        let response = result.unwrap_err().into_response();
        assert_eq!(response.status(), status);
        assert_eq!(response.headers()["content-type"], "application/json");
        let body = to_bytes(response.into_body(), 4096).await.unwrap();
        let value: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(value, serde_json::json!({"error": message}));
    }
}

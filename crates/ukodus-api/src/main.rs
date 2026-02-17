mod config;
mod error;
mod extractors;
mod graph;
mod models;
mod routes;
mod services;
mod state;

use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;
use tokio::sync::broadcast;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::graph::client::GraphClient;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    if let Err(e) = run().await {
        eprintln!("ukodus-api fatal: {e:#}");
        std::process::exit(1);
    }
}

async fn run() -> anyhow::Result<()> {
    let config = Config::from_env();
    tracing::info!(
        host = %config.host,
        port = %config.port,
        neo4j = %config.neo4j_uri,
        "starting ukodus-api"
    );

    // Connect to Neo4j
    let graph = GraphClient::new(&config).await?;
    tracing::info!("connected to neo4j");

    // Connect to Redis
    let redis_client = redis::Client::open(config.redis_url.as_str())?;
    let redis = redis::aio::ConnectionManager::new(redis_client).await?;
    tracing::info!("connected to redis");

    let (galaxy_tx, _) = broadcast::channel::<String>(64);

    let state = Arc::new(AppState {
        graph,
        redis,
        config: config.clone(),
        galaxy_tx,
    });

    let app = build_router(state);

    let addr = config.listen_addr();
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "listening");

    axum::serve(listener, app).await?;
    Ok(())
}

fn build_router(state: Arc<AppState>) -> Router {
    // API v1 routes
    let api_v1 = Router::new()
        // Health
        .route("/healthz", get(routes::health::healthz))
        .route("/readyz", get(routes::health::readyz))
        // Results
        .route("/results", post(routes::results::submit_result))
        .route("/results/leaderboard", get(routes::results::leaderboard))
        // Puzzles
        .route("/puzzles/random", get(routes::puzzles::get_random))
        .route("/puzzles/{hash}", get(routes::puzzles::get_by_hash))
        .route(
            "/puzzles/code/{short_code}",
            get(routes::puzzles::get_by_code),
        )
        .route(
            "/puzzles/{hash}/techniques",
            get(routes::puzzles::get_techniques),
        )
        // Galaxy
        .route("/galaxy/overview", get(routes::galaxy::overview))
        .route("/galaxy/cluster/{family}", get(routes::galaxy::cluster))
        .route("/galaxy/neighbors/{hash}", get(routes::galaxy::neighbors))
        .route("/galaxy/stats", get(routes::galaxy::stats))
        .route("/galaxy/recent", get(routes::galaxy::recent))
        // Techniques
        .route("/techniques", get(routes::techniques::list_all))
        .route(
            "/techniques/{name}/puzzles",
            get(routes::techniques::puzzles_by_technique),
        )
        // Share
        .route("/share", post(routes::share::create_share))
        .route("/share/{id}", get(routes::share::get_by_id))
        .route("/share/code/{short_code}", get(routes::share::get_by_code))
        .route("/share/recent", get(routes::share::recent_shares))
        // Live updates (SSE)
        .route("/ws/galaxy", get(routes::ws::galaxy_sse))
        // Internal mining
        .route("/internal/puzzles/mine", post(routes::mining::submit_mined))
        .route(
            "/internal/puzzles/undiscovered",
            get(routes::mining::get_undiscovered),
        );

    Router::new()
        .nest("/api/v1", api_v1)
        // Root-level health probes (K8s liveness/readiness)
        .route("/healthz", get(routes::health::healthz))
        .route("/readyz", get(routes::health::readyz))
        // Vanity share redirect
        .route("/s/{id}", get(routes::share::vanity_redirect))
        .layer(CompressionLayer::new())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

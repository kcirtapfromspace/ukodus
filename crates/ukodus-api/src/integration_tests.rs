//! HTTP contracts backed by disposable Neo4j and Redis instances.
//! Opt in with --features integration-tests and UKODUS_TEST_ALLOW_RESET=1.
use super::*;
use axum::body::{to_bytes, Body};
use axum::http::{HeaderMap, Request, StatusCode};
use http_body_util::BodyExt;
use neo4rs::query;
use redis::AsyncCommands;
use serde_json::{json, Value};
use tokio::sync::{Mutex, MutexGuard};
use tower::ServiceExt;

const PUZZLE: &str =
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION: &str =
    "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const KEY: &str = "coverage-mining-key";
static DATABASE_LOCK: Mutex<()> = Mutex::const_new(());

struct TestApp {
    app: Router,
    state: Arc<AppState>,
    _guard: MutexGuard<'static, ()>,
}

impl TestApp {
    async fn new() -> Self {
        let guard = DATABASE_LOCK.lock().await;
        assert_eq!(std::env::var("UKODUS_TEST_ALLOW_RESET").as_deref(), Ok("1"),
            "Integration tests delete test data: explicitly set UKODUS_TEST_ALLOW_RESET=1 with disposable services");
        let required = |key| {
            std::env::var(key)
                .unwrap_or_else(|_| panic!("{key} must name a disposable test service"))
        };
        let config = Config {
            neo4j_uri: required("UKODUS_TEST_NEO4J_URI"),
            neo4j_user: "neo4j".into(),
            neo4j_password: required("UKODUS_TEST_NEO4J_PASSWORD"),
            redis_url: required("UKODUS_TEST_REDIS_URL"),
            host: "127.0.0.1".into(),
            port: 0,
            base_url: "http://ukodus.test".into(),
            mining_api_key: Some(KEY.into()),
        };
        let graph = GraphClient::new(&config)
            .await
            .expect("test Neo4j connection");
        graph
            .inner()
            .run(query("MATCH (n) DETACH DELETE n"))
            .await
            .unwrap();
        let mut redis = redis::Client::open(config.redis_url.as_str())
            .unwrap()
            .get_connection_manager()
            .await
            .expect("test Redis connection");
        redis::cmd("FLUSHDB")
            .query_async::<()>(&mut redis)
            .await
            .unwrap();
        let (galaxy_tx, _) = broadcast::channel(64);
        let state = Arc::new(AppState {
            graph,
            redis,
            config,
            galaxy_tx,
        });
        Self {
            app: build_router(state.clone()),
            state,
            _guard: guard,
        }
    }

    async fn request(
        &self,
        method: &str,
        path: &str,
        body: Option<Value>,
        key: Option<&str>,
    ) -> (StatusCode, HeaderMap, Value) {
        request(&self.app, method, path, body, key).await
    }

    async fn ok(&self, method: &str, path: &str, body: Option<Value>, key: Option<&str>) -> Value {
        let (status, _, value) = self.request(method, path, body, key).await;
        assert_eq!(status, StatusCode::OK, "{method} {path}: {value}");
        value
    }
}

async fn request(
    app: &Router,
    method: &str,
    path: &str,
    body: Option<Value>,
    key: Option<&str>,
) -> (StatusCode, HeaderMap, Value) {
    let mut builder = Request::builder().method(method).uri(path);
    if let Some(key) = key {
        builder = builder.header("X-Api-Key", key);
    }
    let body = if let Some(body) = body {
        builder = builder.header("Content-Type", "application/json");
        Body::from(body.to_string())
    } else {
        Body::empty()
    };
    let response = app
        .clone()
        .oneshot(builder.body(body).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let value =
        serde_json::from_slice(&bytes).unwrap_or_else(|_| json!(String::from_utf8_lossy(&bytes)));
    (status, headers, value)
}

fn game(player: &str) -> Value {
    json!({"puzzle_hash":"puzzle-a", "puzzle_string":PUZZLE, "short_code":"easy-code",
        "difficulty":"Easy", "se_rating":1.2, "result":"Win", "time_secs":300,
        "hints_used":0, "mistakes":0, "moves_count":51, "avg_move_time_ms":1000,
        "min_move_time_ms":200, "move_time_std_dev":200.0, "player_id":player, "player_tag":"Player"})
}

fn mined() -> Value {
    json!({"puzzle_hash":"mined-a", "puzzle_string":PUZZLE, "solution_string":SOLUTION,
        "difficulty":"Hard", "se_rating":4.0, "short_code":"mined-code"})
}

#[tokio::test]
async fn health_authentication_and_request_validation() {
    let t = TestApp::new().await;
    for path in ["/healthz", "/readyz", "/api/v1/healthz", "/api/v1/readyz"] {
        let v = t.ok("GET", path, None, None).await;
        assert!(v == "ok" || v == "ready");
    }
    for key in [None, Some("incorrect")] {
        let (status, _, body) = t
            .request("GET", "/api/v1/internal/puzzles/pool", None, key)
            .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(
            body["error"].as_str().unwrap().contains("key")
                || body["error"].as_str().unwrap().contains("Key")
        );
    }
    let mut disabled = (*t.state).clone();
    disabled.config.mining_api_key = None;
    let (status, _, body) = request(
        &build_router(Arc::new(disabled)),
        "GET",
        "/api/v1/internal/puzzles/pool",
        None,
        Some(KEY),
    )
    .await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["error"], "mining not configured");
    let invalid_header = Request::builder()
        .uri("/api/v1/internal/puzzles/pool")
        .header(
            "X-Api-Key",
            axum::http::HeaderValue::from_bytes(&[255]).unwrap(),
        )
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        t.app
            .clone()
            .oneshot(invalid_header)
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );

    for (field, value) in [
        ("puzzle_string", json!("short")),
        ("puzzle_string", json!("x".repeat(81))),
        ("result", json!("Unknown")),
    ] {
        let mut body = game("invalid");
        body[field] = value;
        let (status, _, error) = t.request("POST", "/api/v1/results", Some(body), None).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{error}");
        assert!(error["error"].is_string());
    }
    for path in [
        "/api/v1/puzzles/missing",
        "/api/v1/puzzles/code/missing",
        "/api/v1/puzzles/missing/techniques",
        "/api/v1/puzzles/random",
        "/api/v1/puzzles/random?difficulty=Extreme",
        "/api/v1/share/missing",
        "/api/v1/share/code/missing",
        "/s/missing",
    ] {
        assert_eq!(
            t.request("GET", path, None, None).await.0,
            StatusCode::NOT_FOUND,
            "{path}"
        );
    }
    assert_eq!(
        t.ok("GET", "/api/v1/results/leaderboard", None, None).await,
        json!([])
    );
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/stats", None, None).await["total_puzzles"],
        0
    );
    assert_eq!(
        crate::graph::queries::get_puzzle_play_count(t.state.graph.inner(), "missing")
            .await
            .unwrap(),
        0
    );
}

#[tokio::test]
async fn results_persist_aggregates_filter_leaderboards_and_broadcast() {
    let t = TestApp::new().await;
    let mut events = t.state.galaxy_tx.subscribe();
    let mut first = game("slow");
    first["puzzle_string"] = json!(PUZZLE.replace('0', "."));
    let saved = t.ok("POST", "/api/v1/results", Some(first), None).await;
    assert_eq!(saved["verified"], true);
    assert_eq!(saved["puzzle_is_new"], true);
    assert_eq!(saved["leaderboard_eligible"], true);
    assert!(uuid::Uuid::parse_str(saved["id"].as_str().unwrap()).is_ok());
    let event: Value = serde_json::from_str(&events.try_recv().unwrap()).unwrap();
    assert_eq!(event["type"], "new_puzzle");
    assert_eq!(event["data"]["puzzle_hash"], "puzzle-a");

    let mut fast = game("fast");
    fast["time_secs"] = json!(100);
    let updated = t.ok("POST", "/api/v1/results", Some(fast), None).await;
    assert_eq!(updated["puzzle_is_new"], false);
    let event: Value = serde_json::from_str(&events.try_recv().unwrap()).unwrap();
    assert_eq!(event["type"], "play_result");
    assert_eq!(event["data"]["play_count"], 2);

    for (player, field, value) in [
        ("hinted", "hints_used", json!(1)),
        ("mistakes", "mistakes", json!(3)),
        ("bot", "time_secs", json!(1)),
        ("lost", "result", json!("Loss")),
    ] {
        let mut body = game(player);
        body[field] = value;
        let response = t.ok("POST", "/api/v1/results", Some(body), None).await;
        assert_eq!(response["leaderboard_eligible"], false, "{player}");
    }
    let mut replay_bad = game("bad-replay");
    replay_bad["move_log"] = json!([{"seq":0,"ms":1000,"cell":0,"action":{"Hint":5}}]);
    assert_eq!(
        t.ok("POST", "/api/v1/results", Some(replay_bad), None)
            .await["verified"],
        false
    );
    let mut replay_ok = game("replay");
    replay_ok["move_log"] = json!([{"seq":0,"ms":1000,"cell":2,"action":{"Place":4}}]);
    assert_eq!(
        t.ok("POST", "/api/v1/results", Some(replay_ok), None).await["verified"],
        true
    );

    for suffix in [
        "",
        "?difficulty=Easy",
        "?puzzle_hash=puzzle-a",
        "?puzzle_hash=puzzle-a&difficulty=Hard",
    ] {
        let entries = t
            .ok(
                "GET",
                &format!("/api/v1/results/leaderboard{suffix}"),
                None,
                None,
            )
            .await;
        let players: Vec<_> = entries
            .as_array()
            .unwrap()
            .iter()
            .map(|e| e["player_id"].as_str().unwrap())
            .collect();
        assert_eq!(players.len(), 3);
        assert_eq!(players[0], "fast");
        assert!(players.contains(&"slow") && players.contains(&"replay"));
    }
    let page = t
        .ok(
            "GET",
            "/api/v1/results/leaderboard?limit=1&offset=1",
            None,
            None,
        )
        .await;
    assert_eq!(page.as_array().unwrap().len(), 1);
    assert_ne!(page[0]["player_id"], "fast");
    assert_eq!(
        t.ok(
            "GET",
            "/api/v1/results/leaderboard?difficulty=Hard",
            None,
            None
        )
        .await,
        json!([])
    );
    let puzzle = t.ok("GET", "/api/v1/puzzles/puzzle-a", None, None).await;
    assert_eq!(puzzle["puzzle_string"], PUZZLE);
    assert_eq!(puzzle["play_count"], 8);
    assert!((puzzle["win_rate"].as_f64().unwrap() - 7.0 / 8.0).abs() < 0.001);
    assert_eq!(
        t.ok("GET", "/api/v1/puzzles/code/easy-code", None, None)
            .await["puzzle_hash"],
        "puzzle-a"
    );
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/recent?limit=1", None, None)
            .await[0]["puzzle_hash"],
        "puzzle-a"
    );
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/stats", None, None).await["total_plays"],
        8
    );
}

#[tokio::test]
async fn mining_deduplicates_and_discovery_removes_pool_entry() {
    let t = TestApp::new().await;
    for (field, value) in [
        ("puzzle_string", json!("short")),
        ("solution_string", json!("short")),
        ("difficulty", json!("Easy")),
        ("puzzle_string", json!("x".repeat(81))),
        ("solution_string", json!("0".repeat(81))),
    ] {
        let mut body = mined();
        body[field] = value;
        assert_eq!(
            t.request(
                "POST",
                "/api/v1/internal/puzzles/mine",
                Some(body),
                Some(KEY)
            )
            .await
            .0,
            StatusCode::BAD_REQUEST
        );
    }
    assert_eq!(
        t.request(
            "GET",
            "/api/v1/internal/puzzles/undiscovered",
            None,
            Some(KEY)
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
    let saved = t
        .ok(
            "POST",
            "/api/v1/internal/puzzles/mine",
            Some(mined()),
            Some(KEY),
        )
        .await;
    assert_eq!(saved, json!({"accepted":true,"duplicate":false}));
    let duplicate = t
        .ok(
            "POST",
            "/api/v1/internal/puzzles/mine",
            Some(mined()),
            Some(KEY),
        )
        .await;
    assert_eq!(duplicate, json!({"accepted":true,"duplicate":true}));
    let inventory = t
        .ok("GET", "/api/v1/internal/puzzles/pool", None, Some(KEY))
        .await;
    assert_eq!(
        inventory,
        json!({"counts":[{"difficulty":"Hard","count":1}]})
    );
    for suffix in ["", "?difficulty=Hard"] {
        let entry = t
            .ok(
                "GET",
                &format!("/api/v1/internal/puzzles/undiscovered{suffix}"),
                None,
                Some(KEY),
            )
            .await;
        assert_eq!(entry["solution_string"], SOLUTION);
        assert_eq!(entry["puzzle_hash"], "mined-a");
    }
    assert_eq!(
        t.request(
            "GET",
            "/api/v1/internal/puzzles/undiscovered?difficulty=Extreme",
            None,
            Some(KEY)
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        t.request("GET", "/api/v1/puzzles/random?difficulty=Hard", None, None)
            .await
            .0,
        StatusCode::NOT_FOUND
    );
    let mut body = game("discoverer");
    body["puzzle_hash"] = json!("mined-a");
    body["difficulty"] = json!("Hard");
    body["short_code"] = json!("mined-code");
    t.ok("POST", "/api/v1/results", Some(body), None).await;
    assert_eq!(
        t.ok("GET", "/api/v1/internal/puzzles/pool", None, Some(KEY))
            .await,
        json!({"counts":[]})
    );
    let metrics = t
        .ok(
            "GET",
            "/api/v1/internal/puzzles/monitoring",
            None,
            Some(KEY),
        )
        .await;
    assert_eq!(
        metrics["pools"][0],
        json!({"difficulty":"Hard","total_mined":1,"pool_size":0,"mined_last_hour":1,"mined_last_day":1})
    );
    for suffix in ["", "?difficulty=Hard"] {
        let entry = t
            .ok(
                "GET",
                &format!("/api/v1/puzzles/random{suffix}"),
                None,
                None,
            )
            .await;
        assert_eq!(entry["puzzle_hash"], "mined-a");
        assert!(entry.get("solution_string").is_none());
    }
}

#[tokio::test]
async fn sharing_is_idempotent_and_redirects_by_code_or_puzzle() {
    let t = TestApp::new().await;
    let share = json!({"puzzle_string":PUZZLE,"short_code":"share-code","difficulty":"Easy","se_rating":1.2,"platform":"web","player_id":"sharer"});
    for value in [json!("short"), json!("x".repeat(81))] {
        let mut bad = share.clone();
        bad["puzzle_string"] = value;
        assert_eq!(
            t.request("POST", "/api/v1/share", Some(bad), None).await.0,
            StatusCode::BAD_REQUEST
        );
    }
    let saved = t
        .ok("POST", "/api/v1/share", Some(share.clone()), None)
        .await;
    let id = saved["share_id"].as_str().unwrap();
    assert_eq!(saved["qr_data"], "http://ukodus.test/play/?s=share-code");
    assert_eq!(saved["share_url"], format!("http://ukodus.test/s/{id}"));
    let mut repeated = share.clone();
    repeated["platform"] = json!("ios");
    assert_eq!(
        t.ok("POST", "/api/v1/share", Some(repeated), None).await["share_id"],
        id
    );
    for path in [
        format!("/api/v1/share/{id}"),
        "/api/v1/share/code/share-code".into(),
    ] {
        let detail = t.ok("GET", &path, None, None).await;
        assert_eq!(detail["puzzle_string"], PUZZLE);
        assert_eq!(detail["platform"], "ios");
    }
    for identifier in [id, "share-code"] {
        let (status, headers, _) = t
            .request("GET", &format!("/s/{identifier}"), None, None)
            .await;
        assert_eq!(status, StatusCode::TEMPORARY_REDIRECT);
        assert_eq!(headers["location"], "/play/?s=share-code");
    }
    let mut without_code = share;
    without_code["short_code"] = Value::Null;
    without_code["player_id"] = json!("another");
    without_code["puzzle_string"] = json!(PUZZLE.replace('0', "."));
    let saved = t
        .ok("POST", "/api/v1/share", Some(without_code), None)
        .await;
    assert!(saved["short_code"].is_null());
    assert_eq!(saved["qr_data"], saved["share_url"]);
    let (_, headers, _) = t
        .request(
            "GET",
            &format!("/s/{}", saved["share_id"].as_str().unwrap()),
            None,
            None,
        )
        .await;
    assert_eq!(headers["location"], format!("/play/?p={PUZZLE}"));
    assert_eq!(
        t.ok("GET", "/api/v1/share/recent?limit=1", None, None)
            .await
            .as_array()
            .unwrap()
            .len(),
        1
    );
}

#[tokio::test]
async fn galaxy_queries_cache_recovery_and_live_stream() {
    let t = TestApp::new().await;
    t.ok("POST", "/api/v1/results", Some(game("one")), None)
        .await;
    let mut other = game("two");
    other["puzzle_hash"] = json!("puzzle-b");
    t.ok("POST", "/api/v1/results", Some(other), None).await;
    t.state.graph.inner().run(query("MATCH (a:Puzzle {hash:'puzzle-a'}), (b:Puzzle {hash:'puzzle-b'}) CREATE (f:TechniqueFamily {name:'singles'}), (t:Technique {name:'NakedSingle', display_name:'Naked Single',se_rating:1.0}), (t)-[:BELONGS_TO]->(f), (a)-[:REQUIRES_TECHNIQUE]->(t), (a)-[:MAX_TECHNIQUE]->(t), (b)-[:REQUIRES_TECHNIQUE]->(t), (a)-[:SHARES_TECHNIQUE_PROFILE {similarity:0.75}]->(b)")).await.unwrap();
    let overview = t
        .ok("GET", "/api/v1/galaxy/overview?limit=2", None, None)
        .await;
    assert_eq!(overview["nodes"].as_array().unwrap().len(), 2);
    assert_eq!(
        overview["edges"],
        json!([{"source":"puzzle-a","target":"puzzle-b","similarity":0.75}])
    );
    let neighbors = t
        .ok("GET", "/api/v1/galaxy/neighbors/puzzle-a", None, None)
        .await;
    assert_eq!(neighbors["nodes"][0]["puzzle_hash"], "puzzle-b");
    assert_eq!(neighbors["edges"][0]["similarity"], 0.75);
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/cluster/Easy", None, None)
            .await
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        t.ok("GET", "/api/v1/techniques", None, None).await,
        json!([{"name":"NakedSingle","puzzle_count":2}])
    );
    assert_eq!(
        t.ok(
            "GET",
            "/api/v1/techniques/NakedSingle/puzzles?limit=1",
            None,
            None
        )
        .await
        .as_array()
        .unwrap()
        .len(),
        1
    );
    assert_eq!(
        t.ok("GET", "/api/v1/puzzles/puzzle-a/techniques", None, None)
            .await,
        json!(["NakedSingle"])
    );

    let mut cache = t.state.redis.clone();
    let cached: String = cache.get("galaxy:overview:2").await.unwrap();
    assert_eq!(serde_json::from_str::<Value>(&cached).unwrap(), overview);
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/overview?limit=2", None, None)
            .await,
        overview
    );
    let ttl: i64 = cache.ttl("galaxy:overview:2").await.unwrap();
    assert!(ttl > 0 && ttl <= 60);
    cache
        .set::<_, _, ()>("galaxy:overview:2", "corrupt")
        .await
        .unwrap();
    assert_eq!(
        t.ok("GET", "/api/v1/galaxy/overview?limit=2", None, None)
            .await,
        overview
    );
    let stats = t.ok("GET", "/api/v1/galaxy/stats", None, None).await;
    assert_eq!(stats["total_techniques"], 1);
    assert_eq!(stats["total_plays"], 2);
    assert_eq!(t.ok("GET", "/api/v1/galaxy/stats", None, None).await, stats);
    cache
        .set::<_, _, ()>("galaxy:stats", "corrupt")
        .await
        .unwrap();
    assert_eq!(t.ok("GET", "/api/v1/galaxy/stats", None, None).await, stats);
    t.ok("GET", "/api/v1/galaxy/overview?limit=1", None, None)
        .await;
    t.ok("POST", "/api/v1/results", Some(game("invalidate")), None)
        .await;
    for key in ["galaxy:overview:1", "galaxy:overview:2", "galaxy:stats"] {
        assert!(
            !cache.exists::<_, bool>(key).await.unwrap(),
            "stale cache key {key}"
        );
    }
    let response = t
        .app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/ws/galaxy")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.headers()["content-type"], "text/event-stream");
    let mut stream = response.into_body();
    t.state
        .galaxy_tx
        .send("{\"type\":\"test_event\"}".into())
        .unwrap();
    let frame = tokio::time::timeout(std::time::Duration::from_secs(2), stream.frame())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert_eq!(
        std::str::from_utf8(frame.data_ref().unwrap()).unwrap(),
        "data: {\"type\":\"test_event\"}\n\n"
    );
}

#[tokio::test]
async fn redis_command_failures_preserve_graph_reads_and_result_writes() {
    let t = TestApp::new().await;
    t.ok("POST", "/api/v1/results", Some(game("cached")), None)
        .await;
    t.ok("GET", "/api/v1/galaxy/overview?limit=2", None, None)
        .await;
    t.ok("GET", "/api/v1/galaxy/stats", None, None).await;

    // Restrict only this connection, keeping the test's admin connection intact.
    // ACL errors exercise real Redis command failures without stopping shared services.
    let user = format!("ukodus-coverage-{}", uuid::Uuid::new_v4());
    let mut admin = t.state.redis.clone();
    redis::cmd("ACL")
        .arg("SETUSER")
        .arg(&user)
        .arg(&[
            "reset",
            "on",
            ">coverage-only",
            "~*",
            "+@all",
            "-ping",
            "-get",
            "-setex",
            "-del",
            "-scan",
        ])
        .query_async::<()>(&mut admin)
        .await
        .unwrap();
    let mut connection = redis::Client::open(t.state.config.redis_url.as_str())
        .unwrap()
        .get_connection_info()
        .clone();
    connection.redis.username = Some(user.clone());
    connection.redis.password = Some("coverage-only".into());
    let mut restricted = (*t.state).clone();
    restricted.redis = redis::Client::open(connection)
        .unwrap()
        .get_connection_manager()
        .await
        .unwrap();
    let restricted = Arc::new(restricted);
    let app = build_router(restricted.clone());

    let (status, _, body) = request(&app, "GET", "/readyz", None, None).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body, "not ready: redis down");
    assert_eq!(
        request(&app, "GET", "/healthz", None, None).await.0,
        StatusCode::OK
    );

    let mut events = t.state.galaxy_tx.subscribe();
    let (status, _, saved) = request(
        &app,
        "POST",
        "/api/v1/results",
        Some(game("redis-unavailable")),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{saved}");
    assert_eq!(saved["verified"], true);
    assert_eq!(saved["puzzle_is_new"], false);
    assert_eq!(
        crate::graph::queries::get_puzzle_play_count(t.state.graph.inner(), "puzzle-a")
            .await
            .unwrap(),
        2
    );
    let event: Value = serde_json::from_str(&events.try_recv().unwrap()).unwrap();
    assert_eq!(event["type"], "play_result");
    assert_eq!(event["data"]["play_count"], 2);

    // Both GET and SETEX fail: reads still return current graph data while the
    // old cache remains untouched, proving that neither operation is required.
    let (status, _, overview) =
        request(&app, "GET", "/api/v1/galaxy/overview?limit=2", None, None).await;
    assert_eq!(status, StatusCode::OK, "{overview}");
    assert_eq!(overview["nodes"][0]["play_count"], 2);
    let (status, _, stats) = request(&app, "GET", "/api/v1/galaxy/stats", None, None).await;
    assert_eq!(status, StatusCode::OK, "{stats}");
    assert_eq!(stats["total_puzzles"], 1);
    assert_eq!(stats["total_plays"], 2);
    let stale: String = admin.get("galaxy:stats").await.unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(&stale).unwrap()["total_plays"],
        1
    );
    let stale: String = admin.get("galaxy:overview:2").await.unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(&stale).unwrap()["nodes"][0]["play_count"],
        1
    );

    // Once SCAN works, overview deletion failures are also best effort.
    redis::cmd("ACL")
        .arg("SETUSER")
        .arg(&user)
        .arg("+scan")
        .query_async::<()>(&mut admin)
        .await
        .unwrap();
    crate::services::galaxy_service::invalidate_cache(&restricted)
        .await
        .unwrap();
    assert!(admin.exists::<_, bool>("galaxy:stats").await.unwrap());
    assert!(admin.exists::<_, bool>("galaxy:overview:2").await.unwrap());

    // A SCAN failure after a successful stats deletion must terminate cleanly.
    redis::cmd("ACL")
        .arg("SETUSER")
        .arg(&user)
        .arg(&["+del", "-scan"])
        .query_async::<()>(&mut admin)
        .await
        .unwrap();
    crate::services::galaxy_service::invalidate_cache(&restricted)
        .await
        .unwrap();
    assert!(!admin.exists::<_, bool>("galaxy:stats").await.unwrap());
    assert!(admin.exists::<_, bool>("galaxy:overview:2").await.unwrap());

    redis::cmd("ACL")
        .arg("DELUSER")
        .arg(&user)
        .query_async::<i64>(&mut admin)
        .await
        .unwrap();
}

#[tokio::test]
async fn cache_invalidation_visits_every_scan_page_and_preserves_unrelated_keys() {
    let t = TestApp::new().await;
    let mut cache = t.state.redis.clone();
    let mut fixtures = redis::pipe();
    for index in 0..600 {
        fixtures
            .cmd("SET")
            .arg(format!("galaxy:overview:{index}"))
            .arg("cached overview")
            .ignore();
    }
    for key in [
        "galaxy:stats",
        "galaxy:overview",
        "galaxy:overview-other:1",
        "unrelated:session",
    ] {
        fixtures.cmd("SET").arg(key).arg("keep").ignore();
    }
    fixtures.query_async::<()>(&mut cache).await.unwrap();
    let (cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(0)
        .arg("MATCH")
        .arg("galaxy:overview:*")
        .arg("COUNT")
        .arg(100)
        .query_async(&mut cache)
        .await
        .unwrap();
    assert_ne!(cursor, 0, "the fixture must require multiple scan pages");
    assert!(!keys.is_empty());

    crate::services::galaxy_service::invalidate_cache(&t.state)
        .await
        .unwrap();
    let mut remaining: Vec<String> = cache.keys("*").await.unwrap();
    remaining.sort();
    assert_eq!(
        remaining,
        [
            "galaxy:overview",
            "galaxy:overview-other:1",
            "unrelated:session"
        ]
    );
    for key in &remaining {
        assert_eq!(cache.get::<_, String>(key).await.unwrap(), "keep");
    }
}

#[tokio::test]
async fn live_stream_recovers_after_a_slow_subscriber_misses_events() {
    let t = TestApp::new().await;
    let mut state = (*t.state).clone();
    let (sender, _) = broadcast::channel(2);
    state.galaxy_tx = sender.clone();
    let app = build_router(Arc::new(state));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/ws/galaxy")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let mut stream = response.into_body();

    // Do not poll the subscriber until three messages have fallen out of its buffer.
    for sequence in 0..5 {
        sender
            .send(json!({"sequence": sequence}).to_string())
            .unwrap();
    }
    for sequence in [3, 4, 5] {
        if sequence == 5 {
            sender
                .send(json!({"sequence": sequence}).to_string())
                .unwrap();
        }
        let frame = tokio::time::timeout(std::time::Duration::from_secs(2), stream.frame())
            .await
            .expect("the stream must resume after lagging")
            .expect("the stream must stay connected")
            .unwrap();
        assert_eq!(
            std::str::from_utf8(frame.data_ref().unwrap()).unwrap(),
            format!("data: {}\n\n", json!({"sequence": sequence}))
        );
    }
}

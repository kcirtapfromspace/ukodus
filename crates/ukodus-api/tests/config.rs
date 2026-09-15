// A separate test executable keeps environment changes away from the HTTP suite.
mod config {
    // Use the canonical source path so LLVM attributes this to production code.
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/config.rs"));
}

#[test]
fn defaults_overrides_and_invalid_ports() {
    const KEYS: [&str; 8] = [
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "REDIS_URL",
        "HOST",
        "PORT",
        "BASE_URL",
        "MINING_API_KEY",
    ];
    struct RestoreEnvironment(Vec<(&'static str, Option<std::ffi::OsString>)>);
    impl Drop for RestoreEnvironment {
        fn drop(&mut self) {
            for (key, value) in &self.0 {
                match value {
                    Some(value) => std::env::set_var(key, value),
                    None => std::env::remove_var(key),
                }
            }
        }
    }
    let _restore = RestoreEnvironment(
        KEYS.iter()
            .map(|&key| (key, std::env::var_os(key)))
            .collect(),
    );
    for key in KEYS {
        std::env::remove_var(key);
    }
    let defaults = config::Config::from_env();
    assert_eq!(defaults.neo4j_uri, "bolt://localhost:7687");
    assert_eq!(defaults.neo4j_user, "neo4j");
    assert_eq!(defaults.neo4j_password, "password");
    assert_eq!(defaults.redis_url, "redis://localhost:6379");
    assert_eq!(defaults.listen_addr(), "0.0.0.0:3000");
    assert_eq!(defaults.base_url, "http://localhost:3000");
    assert!(defaults.mining_api_key.is_none());

    for (key, value) in KEYS.into_iter().zip([
        "bolt://test-graph:7687",
        "test-user",
        "test-password",
        "redis://test-cache:6379/2",
        "127.0.0.1",
        "8081",
        "https://ukodus.test",
        "test-api-key",
    ]) {
        std::env::set_var(key, value);
    }
    let configured = config::Config::from_env();
    assert_eq!(configured.neo4j_uri, "bolt://test-graph:7687");
    assert_eq!(configured.neo4j_user, "test-user");
    assert_eq!(configured.neo4j_password, "test-password");
    assert_eq!(configured.redis_url, "redis://test-cache:6379/2");
    assert_eq!(configured.listen_addr(), "127.0.0.1:8081");
    assert_eq!(configured.base_url, "https://ukodus.test");
    assert_eq!(configured.mining_api_key.as_deref(), Some("test-api-key"));

    for port in ["", "invalid", "-1", "65536"] {
        std::env::set_var("PORT", port);
        assert_eq!(config::Config::from_env().port, 3000, "{port:?}");
    }
    for port in [0, 65535] {
        std::env::set_var("PORT", port.to_string());
        assert_eq!(config::Config::from_env().port, port);
    }
}

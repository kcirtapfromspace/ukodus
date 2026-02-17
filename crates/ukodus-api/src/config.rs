use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub neo4j_uri: String,
    pub neo4j_user: String,
    pub neo4j_password: String,
    pub redis_url: String,
    pub host: String,
    pub port: u16,
    pub base_url: String,
    pub mining_api_key: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            neo4j_uri: env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://localhost:7687".into()),
            neo4j_user: env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".into()),
            neo4j_password: env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "password".into()),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".into()),
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            base_url: env::var("BASE_URL").unwrap_or_else(|_| "http://localhost:3000".into()),
            mining_api_key: env::var("MINING_API_KEY").ok(),
        }
    }

    pub fn listen_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

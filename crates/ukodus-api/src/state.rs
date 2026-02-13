use crate::config::Config;
use crate::graph::client::GraphClient;

#[derive(Clone)]
pub struct AppState {
    pub graph: GraphClient,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
}

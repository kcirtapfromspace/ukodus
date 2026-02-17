use tokio::sync::broadcast;

use crate::config::Config;
use crate::graph::client::GraphClient;

/// JSON-serialized event broadcast to WebSocket clients.
pub type GalaxyBroadcast = broadcast::Sender<String>;

#[derive(Clone)]
pub struct AppState {
    pub graph: GraphClient,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
    pub galaxy_tx: GalaxyBroadcast,
}

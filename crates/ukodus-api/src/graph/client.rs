use neo4rs::Graph;

use crate::config::Config;

#[derive(Clone)]
pub struct GraphClient {
    graph: Graph,
}

impl GraphClient {
    pub async fn new(config: &Config) -> Result<Self, neo4rs::Error> {
        let graph = Graph::new(&config.neo4j_uri, &config.neo4j_user, &config.neo4j_password).await?;
        Ok(Self { graph })
    }

    pub fn inner(&self) -> &Graph {
        &self.graph
    }
}

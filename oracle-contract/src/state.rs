// Copyright (c) MDLabs
// Oracle Application State

use async_graphql::SimpleObject;
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use serde::{Deserialize, Serialize};

/// The application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct OracleState {
    /// Next query ID
    pub next_query_id: RegisterView<u64>,
    
    /// All queries (query_id -> Query)
    pub queries: MapView<u64, Query>,
    
    /// Commits (query_id, voter -> commit_hash)
    pub commits: MapView<(u64, String), String>,
    
    /// Revealed votes (query_id, voter -> Vote)
    pub votes: MapView<(u64, String), Vote>,
}

/// A query/market to be resolved by oracle
#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct Query {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub deadline: u64,
    pub commit_end: u64,
    pub reveal_end: u64,
    pub status: String,
    pub resolved_outcome: Option<String>,
}

/// A revealed vote
#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct Vote {
    pub voter: String,
    pub value: String,
    pub timestamp: u64,
}

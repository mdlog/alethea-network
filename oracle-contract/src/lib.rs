// Copyright (c) MDLabs
// Oracle Application ABI

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct OracleAbi;

#[derive(Debug, Deserialize, Serialize)]
pub enum OracleOperation {
    /// Create a new query/market for oracle resolution
    CreateQuery {
        question: String,
        outcomes: Vec<String>,
        deadline: u64,
    },
    
    /// Commit a vote (Phase 1 of commit-reveal)
    CommitVote {
        query_id: u64,
        commit_hash: String,
    },
    
    /// Reveal a vote (Phase 2 of commit-reveal)
    RevealVote {
        query_id: u64,
        value: String,
        salt: String,
    },
    
    /// Resolve a query after reveal phase ends
    ResolveQuery {
        query_id: u64,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OracleResponse {
    pub success: bool,
    pub message: String,
}

impl ContractAbi for OracleAbi {
    type Operation = OracleOperation;
    type Response = OracleResponse;
}

impl ServiceAbi for OracleAbi {
    type Query = Request;
    type QueryResponse = Response;
}

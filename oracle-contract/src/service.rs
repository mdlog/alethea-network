// Copyright (c) MDLabs
// Oracle Service (GraphQL API)

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use oracle::OracleOperation;
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};

use self::state::OracleState;

pub struct OracleService {
    state: Arc<OracleState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(OracleService);

impl WithServiceAbi for OracleService {
    type Abi = oracle::OracleAbi;
}

impl Service for OracleService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = OracleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        OracleService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<OracleState>,
}

#[Object]
impl QueryRoot {
    /// Get next query ID
    async fn next_query_id(&self) -> u64 {
        *self.state.next_query_id.get()
    }

    /// Get a specific query
    async fn query(&self, id: u64) -> Option<state::Query> {
        self.state.queries.get(&id).await.ok().flatten()
    }

    /// Get all queries
    async fn queries(&self) -> Vec<state::Query> {
        let mut result = Vec::new();
        for index in self.state.queries.indices().await.unwrap_or_default() {
            if let Ok(Some(query)) = self.state.queries.get(&index).await {
                result.push(query);
            }
        }
        result
    }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<OracleService>>,
}

#[Object]
impl MutationRoot {
    /// Create a new query
    async fn create_query(
        &self,
        question: String,
        outcomes: Vec<String>,
        deadline: u64,
    ) -> Vec<u8> {
        let operation = OracleOperation::CreateQuery {
            question,
            outcomes,
            deadline,
        };
        self.runtime.schedule_operation(&operation);
        vec![]
    }

    /// Commit a vote
    async fn commit_vote(&self, query_id: u64, commit_hash: String) -> Vec<u8> {
        let operation = OracleOperation::CommitVote {
            query_id,
            commit_hash,
        };
        self.runtime.schedule_operation(&operation);
        vec![]
    }

    /// Reveal a vote
    async fn reveal_vote(&self, query_id: u64, value: String, salt: String) -> Vec<u8> {
        let operation = OracleOperation::RevealVote {
            query_id,
            value,
            salt,
        };
        self.runtime.schedule_operation(&operation);
        vec![]
    }

    /// Resolve a query
    async fn resolve_query(&self, query_id: u64) -> Vec<u8> {
        let operation = OracleOperation::ResolveQuery { query_id };
        self.runtime.schedule_operation(&operation);
        vec![]
    }
}

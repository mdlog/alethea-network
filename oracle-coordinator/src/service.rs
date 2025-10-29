// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;
mod types;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::WithServiceAbi,
    Service, ServiceRuntime,
};
use alethea_oracle_types::{OracleCoordinatorAbi, CoordinatorOperation};
use std::sync::Arc;

use self::state::OracleCoordinatorState;

pub struct OracleCoordinatorService {
    state: Arc<OracleCoordinatorState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(OracleCoordinatorService);

impl WithServiceAbi for OracleCoordinatorService {
    type Abi = OracleCoordinatorAbi;
}

impl Service for OracleCoordinatorService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = OracleCoordinatorState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        OracleCoordinatorService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            CoordinatorOperation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<OracleCoordinatorState>,
}

#[Object]
impl QueryRoot {
    /// Get next market ID
    async fn next_market_id(&self) -> u64 {
        *self.state.next_market_id.get()
    }
    
    /// Get total markets created
    async fn total_markets_created(&self) -> u64 {
        *self.state.total_markets_created.get()
    }
    
    /// Get total markets resolved
    async fn total_markets_resolved(&self) -> u64 {
        *self.state.total_markets_resolved.get()
    }
}

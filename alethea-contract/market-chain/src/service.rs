// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, Result as GraphQLResult};
use linera_sdk::{
    linera_base_types::{AccountOwner, WithServiceAbi, Amount, Timestamp},
    views::View,
    Service, ServiceRuntime,
};
use alethea_market_chain::{MarketChainAbi, MarketOperation};
use std::sync::Arc;
use std::str::FromStr;

use self::state::MarketState;

pub struct MarketChainService {
    state: Arc<MarketState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(MarketChainService);

impl WithServiceAbi for MarketChainService {
    type Abi = MarketChainAbi;
}

impl Service for MarketChainService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .unwrap();
        MarketChainService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            MarketMutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<MarketState>,
}

#[Object]
impl QueryRoot {
    /// Get next market ID
    async fn next_market_id(&self) -> u64 {
        *self.state.next_market_id.get()
    }
    
    /// Get market by ID
    async fn market(&self, id: u64) -> Option<state::Market> {
        self.state.get_market(id).await
    }
    
    /// Get all markets
    async fn markets(&self) -> Vec<state::Market> {
        let mut result = Vec::new();
        let count = *self.state.next_market_id.get();
        
        for i in 0..count {
            if let Some(market) = self.state.get_market(i).await {
                result.push(market);
            }
        }
        
        result
    }
    
    /// Get position for a market and owner
    async fn position(&self, market_id: u64, owner: AccountOwner) -> Option<state::Position> {
        self.state.get_position(market_id, &owner).await
    }
    
    /// Get registry configuration status
    async fn registry_configured(&self) -> bool {
        self.state.registry_application_id.get().is_some()
    }
    
    /// Get registry chain ID (if configured)
    async fn registry_chain_id(&self) -> Option<String> {
        self.state.registry_chain_id.get().map(|id| id.to_string())
    }
    
    /// Get registry application ID (if configured)
    async fn registry_app_id(&self) -> Option<String> {
        self.state.registry_application_id.get().map(|id| id.to_string())
    }
}

/// Custom mutation root that accepts String inputs and converts to proper types
struct MarketMutationRoot {
    runtime: Arc<ServiceRuntime<MarketChainService>>,
}

#[Object]
impl MarketMutationRoot {
    /// Create a new prediction market
    /// Accepts String inputs for Timestamp and Amount
    /// Returns true if operation was scheduled successfully
    async fn create_market(
        &self,
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: String,  // Timestamp as string (microseconds)
        initial_liquidity: String,     // Amount as string
    ) -> GraphQLResult<bool> {
        // Parse Timestamp from string (microseconds)
        let deadline_micros = resolution_deadline.parse::<u64>()
            .map_err(|e| async_graphql::Error::new(format!("Invalid deadline: {}", e)))?;
        let deadline = Timestamp::from(deadline_micros);
        
        // Parse Amount from string
        let liquidity = Amount::from_str(&initial_liquidity)
            .map_err(|e| async_graphql::Error::new(format!("Invalid liquidity amount: {}", e)))?;
        
        // Create operation
        let operation = MarketOperation::CreateMarket {
            question,
            outcomes,
            resolution_deadline: deadline,
            initial_liquidity: liquidity,
        };
        
        // Schedule operation to be executed
        self.runtime.schedule_operation(&operation);
        
        // Return success
        Ok(true)
    }
    
    /// Buy shares for a specific outcome
    /// Returns true if operation was scheduled successfully
    async fn buy_shares(
        &self,
        market_id: u64,
        outcome_index: usize,
        amount: String,  // Amount as string
    ) -> GraphQLResult<bool> {
        let amount_value = Amount::from_str(&amount)
            .map_err(|e| async_graphql::Error::new(format!("Invalid amount: {}", e)))?;
        
        let operation = MarketOperation::BuyShares {
            market_id,
            outcome_index,
            amount: amount_value,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Request oracle resolution (after deadline)
    /// Returns true if operation was scheduled successfully
    async fn request_resolution(&self, market_id: u64) -> GraphQLResult<bool> {
        let operation = MarketOperation::RequestResolution { market_id };
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Claim winnings after market is resolved
    /// Returns true if operation was scheduled successfully
    async fn claim_winnings(&self, market_id: u64) -> GraphQLResult<bool> {
        let operation = MarketOperation::ClaimWinnings { market_id };
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
}


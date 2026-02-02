// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

// Version: 2025-11-12-fix-wasm-panic
// Fixed: GraphQL mutation handling with proper error handling

use std::sync::Arc;
use async_graphql::{Request, Response, EmptySubscription, Schema, Object, SimpleObject, Result as GraphQLResult};
use linera_sdk::{
    views::{View, ViewStorageContext},
    Service, ServiceRuntime,
};
use linera_sdk::linera_base_types::WithServiceAbi;
use voter_template::state::VoterState;

/// GraphQL service for Voter
pub struct VoterService {
    state: Arc<VoterState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(VoterService);

impl WithServiceAbi for VoterService {
    type Abi = alethea_oracle_types::VoterTemplateAbi;
}

impl Service for VoterService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = VoterState::load(ViewStorageContext::from(runtime.root_view_storage_context()))
            .await
            .expect("Failed to load state");
        VoterService { 
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        // GraphQL mutations use runtime.schedule_operation() to execute operations
        // See: https://linera.dev/developers/backend/service.html
        // Version: 2025-11-12 - Fixed mutation handling
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            MutationRoot { runtime: self.runtime.clone() },
            EmptySubscription,
        )
        .finish();

        // Execute query/mutation with proper error handling
        schema.execute(request).await
    }
}

/// GraphQL query root
struct QueryRoot {
    state: Arc<VoterState>,
}

#[Object]
impl QueryRoot {
    /// Get voter status
    async fn status(&self) -> VoterStatusInfo {
        VoterStatusInfo {
            stake: self.state.get_stake().await.to_string(),
            reputation: self.state.get_reputation().await,
            total_votes: *self.state.total_votes.get(),
            correct_votes: *self.state.correct_votes.get(),
            accuracy_rate: self.state.get_accuracy_rate().await,
            auto_vote_enabled: self.state.is_auto_vote_enabled().await,
        }
    }

    /// Get active votes count
    async fn active_votes_count(&self) -> u32 {
        self.state.get_all_active_votes().await.len() as u32
    }

    /// Get vote history count
    async fn vote_history_count(&self) -> u32 {
        self.state.get_vote_history().await.len() as u32
    }
}

/// Mutation root - schedules operations to be executed
/// Uses runtime.schedule_operation() to execute operations
/// See: https://linera.dev/developers/backend/service.html
struct MutationRoot {
    runtime: Arc<ServiceRuntime<VoterService>>,
}

#[Object]
impl MutationRoot {
    /// Initialize voter with registry
    /// Accepts String inputs and converts to proper types
    async fn initialize(
        &self,
        registry_id: String,
        initial_stake: String,
    ) -> GraphQLResult<Vec<u8>> {
        use std::str::FromStr;
        use linera_sdk::linera_base_types::{ApplicationId, Amount};
        use alethea_oracle_types::VoterOperation;
        
        // Parse ApplicationId from string
        let registry_app_id = ApplicationId::from_str(&registry_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid registry ID: {}", e)))?;
        
        // Parse Amount from string
        let stake = Amount::from_str(&initial_stake)
            .map_err(|e| async_graphql::Error::new(format!("Invalid stake amount: {}", e)))?;
        
        // Create operation
        let operation = VoterOperation::Initialize {
            registry_id: registry_app_id,
            initial_stake: stake,
        };
        
        // Schedule operation to be executed!
        // Note: schedule_operation() is safe to call from async context
        // Version: 2025-11-12 - Fixed mutation execution
        self.runtime.schedule_operation(&operation);
        
        // Return empty bytes (operation scheduled successfully)
        Ok(vec![])
    }
    
    /// Update stake
    async fn update_stake(
        &self,
        additional_stake: String,
    ) -> GraphQLResult<Vec<u8>> {
        use std::str::FromStr;
        use linera_sdk::linera_base_types::Amount;
        use alethea_oracle_types::VoterOperation;
        
        // Parse Amount from string
        let stake = Amount::from_str(&additional_stake)
            .map_err(|e| async_graphql::Error::new(format!("Invalid stake amount: {}", e)))?;
        
        // Create operation
        let operation = VoterOperation::UpdateStake {
            additional_stake: stake,
        };
        
        // Schedule operation to be executed!
        self.runtime.schedule_operation(&operation);
        
        // Return empty bytes (operation scheduled successfully)
        Ok(vec![])
    }
    
    /// Submit vote for a market
    async fn submit_vote(
        &self,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
    ) -> GraphQLResult<Vec<u8>> {
        use alethea_oracle_types::VoterOperation;
        
        // Create operation
        let operation = VoterOperation::SubmitVote {
            market_id,
            outcome_index,
            confidence,
        };
        
        // Schedule operation to be executed!
        self.runtime.schedule_operation(&operation);
        
        // Return empty bytes (operation scheduled successfully)
        Ok(vec![])
    }
    
    /// Enable auto-vote
    async fn enable_auto_vote(&self) -> GraphQLResult<Vec<u8>> {
        use alethea_oracle_types::VoterOperation;
        
        let operation = VoterOperation::EnableAutoVote;
        self.runtime.schedule_operation(&operation);
        Ok(vec![])
    }
    
    /// Disable auto-vote
    async fn disable_auto_vote(&self) -> GraphQLResult<Vec<u8>> {
        use alethea_oracle_types::VoterOperation;
        
        let operation = VoterOperation::DisableAutoVote;
        self.runtime.schedule_operation(&operation);
        Ok(vec![])
    }
    
    /// Set decision strategy
    async fn set_decision_strategy(
        &self,
        strategy: String,
    ) -> GraphQLResult<Vec<u8>> {
        use alethea_oracle_types::{VoterOperation, DecisionStrategy};
        
        // Parse strategy
        let strategy_enum = match strategy.to_lowercase().as_str() {
            "manual" => DecisionStrategy::Manual,
            "random" => DecisionStrategy::Random,
            "oracle" => DecisionStrategy::Oracle,
            "ml" => DecisionStrategy::ML,
            _ => return Err(async_graphql::Error::new("Invalid strategy. Use: manual, random, oracle, or ml")),
        };
        
        let operation = VoterOperation::SetDecisionStrategy {
            strategy: strategy_enum,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(vec![])
    }
}

/// Voter status for GraphQL
#[derive(SimpleObject)]
struct VoterStatusInfo {
    stake: String,
    reputation: u64,
    total_votes: u32,
    correct_votes: u32,
    accuracy_rate: f64,
    auto_vote_enabled: bool,
}

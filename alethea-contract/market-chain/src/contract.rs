// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{WithContractAbi, AccountOwner, Amount, Timestamp, ChainId},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use std::str::FromStr;
use alethea_market_chain::{
    MarketChainAbi, MarketOperation, MarketResponse, Message,
    Parameters, MarketDetails, PositionDetails, MarketStatus,
};
use alethea_sdk::AletheaClient;
use alethea_oracle_types::RegistryMessage;
use serde::{Deserialize, Serialize};

use self::state::{MarketState, Market, Position};

/// Callback data sent to Registry for market resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCallbackData {
    pub market_id: u64,
    pub chain_id: ChainId,
}

pub struct MarketChainContract {
    state: MarketState,
    runtime: ContractRuntime<Self>,
    alethea: AletheaClient,
}

linera_sdk::contract!(MarketChainContract);

impl WithContractAbi for MarketChainContract {
    type Abi = MarketChainAbi;
}

impl Contract for MarketChainContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        // RootView load should not fail in normal operation
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .unwrap();
        MarketChainContract { 
            state, 
            runtime,
            alethea: AletheaClient::new(),
        }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Initialize with empty state
        // Markets will be created via operations
        self.state.next_market_id.set(0);
        
        // Configure Oracle Registry v2 for automatic resolution
        // Updated to use Registry v2 with commitEnd/revealEnd fields
        let registry_chain_id = linera_sdk::linera_base_types::ChainId::from_str(
            "8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
        ).expect("Invalid registry chain ID");
        
        let registry_app_id = linera_sdk::linera_base_types::ApplicationId::from_str(
            "9e5e530312d7f508b5b7056407025ebd0d42ddfdd3a0db7c364eb3ed7a8fe3b5"  // Registry v2 with commitEnd/revealEnd
        ).expect("Invalid registry app ID");
        
        self.state.set_registry_app(registry_chain_id, registry_app_id).await;
    }

    async fn execute_operation(&mut self, operation: MarketOperation) -> MarketResponse {
        match operation {
            MarketOperation::CreateMarket {
                question,
                outcomes,
                resolution_deadline,
                initial_liquidity,
            } => self.create_market(question, outcomes, resolution_deadline, initial_liquidity).await,
            
            MarketOperation::BuyShares {
                market_id,
                outcome_index,
                amount,
            } => self.buy_shares(market_id, outcome_index, amount).await,
            
            MarketOperation::RequestResolution { market_id } => {
                self.request_resolution(market_id).await
            }
            
            MarketOperation::ClaimWinnings { market_id } => {
                self.claim_winnings(market_id).await
            }
            
            MarketOperation::GetMarket { market_id } => {
                self.get_market(market_id).await
            }
            
            MarketOperation::GetPosition { market_id, owner } => {
                self.get_position(market_id, owner).await
            }
            

        }
    }

    async fn execute_message(&mut self, message: Message) -> () {
        match message {
            // Handle Registry callback
            Message::Registry(registry_msg) => {
                match registry_msg {
                    RegistryMessage::MarketResolved {
                        market_id,
                        outcome_index,
                        confidence,
                        callback_data,
                    } => {
                        self.handle_resolution_callback(market_id, outcome_index, confidence, callback_data).await;
                    }
                    _ => {}
                }
            }
            // Handle legacy messages
            Message::MarketResolved { market_id, outcome, .. } => {
                self.handle_resolution(market_id, outcome).await;
            }
            _ => {}
        }
    }

    async fn store(mut self) {
        // RootView automatically persists, no manual save needed
        let _ = self.state.save().await;
    }
}

impl MarketChainContract {
    async fn create_market(
        &mut self,
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: Timestamp,
        initial_liquidity: Amount,
    ) -> MarketResponse {
        let market_id = *self.state.next_market_id.get();
        
        // Safe authentication check
        let creator = match self.runtime.authenticated_signer() {
            Some(signer) => signer,
            None => return MarketResponse::Error,
        };
        
        let num_outcomes = outcomes.len();
        if num_outcomes == 0 {
            return MarketResponse::Error;
        }
        
        // FIX: Use checked division to prevent overflow
        let liquidity_u128: u128 = initial_liquidity.into();
        let liquidity_per_outcome = liquidity_u128.checked_div(num_outcomes as u128)
            .map(Amount::from_attos)
            .unwrap_or(Amount::ZERO);
        
        let market = Market {
            id: market_id,
            question,
            outcomes,
            creator: Some(creator),
            total_liquidity: initial_liquidity,
            outcome_pools: vec![liquidity_per_outcome; num_outcomes],
            resolution_deadline,
            status: MarketStatus::Open,
            final_outcome: None,
        };
        
        // Safe insert
        if self.state.markets.insert(&market_id, market).is_err() {
            return MarketResponse::Error;
        }
        self.state.next_market_id.set(market_id + 1);
        
        MarketResponse::MarketCreated(market_id)
    }

    async fn buy_shares(
        &mut self,
        market_id: u64,
        outcome_index: usize,
        amount: Amount,
    ) -> MarketResponse {
        // Safe market retrieval
        let mut market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return MarketResponse::Error,
        };
        
        // Safe validation without assert
        if !matches!(market.status, MarketStatus::Open) {
            return MarketResponse::Error;
        }
        if outcome_index >= market.outcomes.len() {
            return MarketResponse::Error;
        }
        
        // Simple linear pricing for demo
        let shares = self.calculate_shares(&market, outcome_index, amount);
        
        market.outcome_pools[outcome_index].saturating_add_assign(amount);
        market.total_liquidity.saturating_add_assign(amount);
        
        // Safe update
        if self.state.markets.insert(&market_id, market).is_err() {
            return MarketResponse::Error;
        }
        
        // Update position
        let owner = match self.runtime.authenticated_signer() {
            Some(signer) => signer,
            None => return MarketResponse::Error,
        };
        
        let position_key = (market_id, owner);
        let mut position = self.state.get_position(market_id, &owner).await
            .unwrap_or(Position {
                market_id,
                owner,
                outcome_index,
                shares: 0,
                average_price: Amount::ZERO,
            });
        
        position.shares += shares;
        position.average_price = amount;
        
        // Safe position update
        if self.state.positions.insert(&position_key, position).is_err() {
            return MarketResponse::Error;
        }
        
        MarketResponse::SharesPurchased { shares }
    }

    async fn request_resolution(&mut self, market_id: u64) -> MarketResponse {
        // Safe market retrieval
        let mut market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return MarketResponse::Error,
        };
        
        // Verify market is ready for resolution
        if self.runtime.system_time() < market.resolution_deadline {
            return MarketResponse::Error;
        }
        
        // Verify market status is Open (Trading)
        if !matches!(market.status, MarketStatus::Open) {
            return MarketResponse::Error;
        }
        
        // Check Registry is configured
        if self.state.get_registry_app().await.is_none() {
            return MarketResponse::Error; // Registry not configured
        }
        
        // Prepare callback data with market_id
        let callback_data = serde_json::to_vec(&MarketCallbackData {
            market_id,
            chain_id: self.runtime.chain_id(),
        }).unwrap_or_default();
        
        // Update market status to WaitingResolution FIRST
        market.status = MarketStatus::WaitingResolution;
        
        // Safe update
        if self.state.markets.insert(&market_id, market.clone()).is_err() {
            return MarketResponse::Error;
        }
        
        // Send cross-chain message to Registry to create query
        // This will automatically create a query in Oracle Registry
        let registry_message = RegistryMessage::CreateQueryFromMarket {
            market_id,
            question: market.question.clone(),
            outcomes: market.outcomes.clone(),
            deadline: market.resolution_deadline,
            callback_chain: self.runtime.chain_id(),
            callback_data,
        };
        
        // Send message to Registry application
        // Note: This uses Linera's cross-chain messaging
        // send_to() expects ChainId, not ApplicationId
        let registry_chain = self.state.registry_chain_id.get().clone()
            .expect("Registry chain ID not configured");
        
        self.runtime
            .prepare_message(Message::Registry(registry_message))
            .with_authentication()
            .send_to(registry_chain);
        
        MarketResponse::ResolutionRequested
    }

    async fn handle_resolution(&mut self, market_id: u64, outcome_index: usize) {
        // Safe market retrieval
        if let Some(mut market) = self.state.get_market(market_id).await {
            market.status = MarketStatus::Resolved;
            market.final_outcome = Some(outcome_index);
            
            // Safe update - ignore error in message handler
            let _ = self.state.markets.insert(&market_id, market);
        }
    }
    
    async fn handle_resolution_callback(
        &mut self,
        market_id: u64,
        outcome_index: usize,
        _confidence: u8,
        callback_data: Vec<u8>,
    ) {
        // TODO: Verify message is from Registry
        // Note: In Linera SDK, message authentication is handled differently
        // For now, we'll trust the message routing system
        // In production, add proper authentication checks
        
        // Parse callback data to verify it's for the correct market
        if let Ok(data) = serde_json::from_slice::<MarketCallbackData>(&callback_data) {
            if data.market_id != market_id {
                // Market ID mismatch, ignore
                return;
            }
        } else {
            // Invalid callback data, ignore
            return;
        }
        
        // Get market
        if let Some(mut market) = self.state.get_market(market_id).await {
            // Update market status to Resolved
            market.status = MarketStatus::Resolved;
            market.final_outcome = Some(outcome_index);
            
            // Safe update - ignore error in message handler
            let _ = self.state.markets.insert(&market_id, market);
            
            // Distribute winnings
            self.distribute_winnings_internal(market_id, outcome_index).await;
        }
    }
    
    async fn distribute_winnings_internal(&mut self, market_id: u64, _winning_outcome: usize) {
        // Get market
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return,
        };
        
        // Calculate total winning pool
        let _total_pool = market.total_liquidity;
        
        // TODO: Implement actual token distribution logic
        // For now, this is a placeholder that marks the market as resolved
        // In a full implementation, this would:
        // 1. Iterate through all positions for this market
        // 2. Calculate each winner's share based on their position
        // 3. Transfer tokens to winners
        // 4. Update position states
    }

    async fn claim_winnings(&mut self, market_id: u64) -> MarketResponse {
        // Safe market retrieval
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return MarketResponse::Error,
        };
        
        // Safe status check
        if !matches!(market.status, MarketStatus::Resolved) {
            return MarketResponse::Error;
        }
        
        // Safe authentication
        let owner = match self.runtime.authenticated_signer() {
            Some(signer) => signer,
            None => return MarketResponse::Error,
        };
        
        // Safe position retrieval
        let position = match self.state.get_position(market_id, &owner).await {
            Some(p) => p,
            None => return MarketResponse::WinningsClaimed { amount: Amount::ZERO },
        };
        
        // Safe outcome check
        let final_outcome = match market.final_outcome {
            Some(outcome) => outcome,
            None => return MarketResponse::Error,
        };
        
        if position.outcome_index == final_outcome {
            // FIX: Use from_attos instead of from_tokens for shares
            let winnings = Amount::from_attos(position.shares as u128);
            // TODO: Actual token transfer logic
            MarketResponse::WinningsClaimed { amount: winnings }
        } else {
            MarketResponse::WinningsClaimed { amount: Amount::ZERO }
        }
    }

    async fn get_market(&mut self, market_id: u64) -> MarketResponse {
        // Safe market retrieval
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return MarketResponse::Error,
        };
        
        MarketResponse::Market(MarketDetails {
            id: market.id,
            question: market.question,
            outcomes: market.outcomes,
            creator: market.creator,
            total_liquidity: market.total_liquidity,
            outcome_pools: market.outcome_pools,
            resolution_deadline: market.resolution_deadline,
            status: market.status,
            final_outcome: market.final_outcome,
        })
    }

    async fn get_position(&mut self, market_id: u64, owner: AccountOwner) -> MarketResponse {
        let position = self.state.get_position(market_id, &owner).await
            .unwrap_or(Position {
                market_id,
                owner,
                outcome_index: 0,
                shares: 0,
                average_price: Amount::ZERO,
            });
        
        MarketResponse::Position(PositionDetails {
            market_id: position.market_id,
            owner: position.owner,
            outcome_index: position.outcome_index,
            shares: position.shares,
            average_price: position.average_price,
        })
    }

    fn calculate_shares(&self, market: &Market, _outcome_index: usize, amount: Amount) -> u64 {
        let total_pool = market.total_liquidity;
        
        if total_pool == Amount::ZERO {
            // Convert Amount to u64 for shares
            let amount_u128: u128 = amount.into();
            return amount_u128 as u64;
        }
        
        // Simple linear pricing: shares proportional to amount
        let shares_u128: u128 = amount.into();
        shares_u128 as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::{util::BlockingWait, views::View, Contract, ContractRuntime};
    use market_chain::MarketOperation;
    use futures::FutureExt;

    #[test]
    fn test_create_market() {
        let mut contract = create_test_contract();
        
        let operation = MarketOperation::CreateMarket {
            question: "Will BTC hit 100k?".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            resolution_deadline: Timestamp::from(1000000),
            initial_liquidity: Amount::from_tokens(1000),
        };
        
        let response = contract
            .execute_operation(operation)
            .now_or_never()
            .expect("Should not await");
        
        match response {
            MarketResponse::MarketCreated(id) => {
                assert_eq!(id, 0);
            }
            _ => panic!("Expected MarketCreated"),
        }
    }

    fn create_test_contract() -> MarketChainContract {
        let runtime = ContractRuntime::new();
        let state = MarketState::load(runtime.root_view_storage_context())
            .blocking_wait()
            .expect("Failed to load state");
        
        let mut contract = MarketChainContract { state, runtime };
        
        contract
            .instantiate(())
            .now_or_never()
            .expect("Should not await");
        
        contract
    }
}


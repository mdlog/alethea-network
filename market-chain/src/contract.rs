// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{WithContractAbi, AccountOwner, Amount, Timestamp},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use alethea_market_chain::{
    MarketChainAbi, MarketOperation, MarketResponse, InitialState, Message,
    Parameters, MarketDetails, PositionDetails, MarketStatus,
};

use self::state::{MarketState, Market, Position};

pub struct MarketChainContract {
    state: MarketState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MarketChainContract);

impl WithContractAbi for MarketChainContract {
    type Abi = MarketChainAbi;
}

impl Contract for MarketChainContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = InitialState;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketChainContract { state, runtime }
    }

    async fn instantiate(&mut self, initial_state: InitialState) {
        // Validate parameters
        let _params = self.runtime.application_parameters();
        
        // Initialize with initial markets if any
        self.state.initialize_markets(initial_state.markets).await;
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
            
            MarketOperation::SetOracleChain { oracle_chain_id } => {
                self.set_oracle_chain(oracle_chain_id).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) -> () {
        match message {
            Message::ResolutionResult { market_id, outcome_index } => {
                self.handle_resolution(market_id, outcome_index).await;
            }
            Message::ResolutionRequest { .. } => {
                // This message is sent FROM Market to Oracle, not received
                // No action needed here
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
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
        let creator = self.runtime
            .authenticated_signer()
            .expect("Market creation requires authentication");
        
        let num_outcomes = outcomes.len();
        let liquidity_u128: u128 = initial_liquidity.into();
        let liquidity_per_outcome = Amount::from_tokens(liquidity_u128 / num_outcomes as u128);
        
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
        
        self.state.markets.insert(&market_id, market)
            .expect("Failed to insert market");
        self.state.next_market_id.set(market_id + 1);
        
        MarketResponse::MarketCreated(market_id)
    }

    async fn buy_shares(
        &mut self,
        market_id: u64,
        outcome_index: usize,
        amount: Amount,
    ) -> MarketResponse {
        let mut market = self.state.get_market(market_id).await
            .expect("Market not found");
        
        assert!(matches!(market.status, MarketStatus::Open), "Market closed");
        assert!(outcome_index < market.outcomes.len(), "Invalid outcome");
        
        // Simple linear pricing for demo
        let shares = self.calculate_shares(&market, outcome_index, amount);
        
        market.outcome_pools[outcome_index].saturating_add_assign(amount);
        market.total_liquidity.saturating_add_assign(amount);
        
        self.state.markets.insert(&market_id, market)
            .expect("Failed to update market");
        
        // Update position
        let owner = self.runtime
            .authenticated_signer()
            .expect("Buy shares requires authentication");
        
        let position_key = (market_id, owner);
        let mut position = self.state.positions.get(&position_key).await
            .expect("Failed to read position")
            .unwrap_or(Position {
                market_id,
                owner,
                outcome_index,
                shares: 0,
                average_price: Amount::ZERO,
            });
        
        position.shares += shares;
        // Simple average price calculation
        position.average_price = amount;
        
        self.state.positions.insert(&position_key, position)
            .expect("Failed to update position");
        
        MarketResponse::SharesPurchased { shares }
    }

    async fn request_resolution(&mut self, market_id: u64) -> MarketResponse {
        let mut market = self.state.get_market(market_id).await
            .expect("Market not found");
        
        assert!(
            self.runtime.system_time() >= market.resolution_deadline,
            "Market deadline not reached"
        );
        
        // Clone data needed for message before moving market
        let question = market.question.clone();
        let outcomes = market.outcomes.clone();
        
        market.status = MarketStatus::WaitingResolution;
        self.state.markets.insert(&market_id, market)
            .expect("Failed to update market");
        
        // Send message to Oracle Coordinator if configured
        if let Some(oracle_chain) = self.state.oracle_chain.get() {
            self.runtime.send_message(
                *oracle_chain,
                Message::ResolutionRequest {
                    market_id,
                    question,
                    outcomes,
                },
            );
        }
        
        MarketResponse::ResolutionRequested
    }

    async fn handle_resolution(&mut self, market_id: u64, outcome_index: usize) {
        let mut market = self.state.get_market(market_id).await
            .expect("Market not found");
        
        market.status = MarketStatus::Resolved;
        market.final_outcome = Some(outcome_index);
        
        self.state.markets.insert(&market_id, market)
            .expect("Failed to update market");
    }

    async fn claim_winnings(&mut self, market_id: u64) -> MarketResponse {
        let market = self.state.get_market(market_id).await
            .expect("Market not found");
        
        assert!(matches!(market.status, MarketStatus::Resolved), "Not resolved");
        
        let owner = self.runtime
            .authenticated_signer()
            .expect("Claim requires authentication");
        
        let position = self.state.get_position(market_id, &owner).await
            .expect("No position found");
        
        let final_outcome = market.final_outcome.expect("No outcome");
        
        if position.outcome_index == final_outcome {
            // Winner! Calculate payout (1:1 for demo)
            let winnings = Amount::from_tokens(position.shares as u128);
            // TODO: Actual token transfer logic
            MarketResponse::WinningsClaimed { amount: winnings }
        } else {
            MarketResponse::WinningsClaimed { amount: Amount::ZERO }
        }
    }

    async fn get_market(&mut self, market_id: u64) -> MarketResponse {
        let market = self.state.get_market(market_id).await
            .expect("Market not found");
        
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
    
    async fn set_oracle_chain(&mut self, oracle_chain_id: Option<linera_sdk::linera_base_types::ChainId>) -> MarketResponse {
        self.state.oracle_chain.set(oracle_chain_id);
        MarketResponse::Ok
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::{util::BlockingWait, views::View, Contract, ContractRuntime};
    use market_chain::{MarketOperation, InitialState};
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
            .instantiate(InitialState { markets: vec![] })
            .now_or_never()
            .expect("Should not await");
        
        contract
    }
}


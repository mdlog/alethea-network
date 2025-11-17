// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Market Chain Contract with Alethea SDK Integration
//! 
//! This is an example of how to integrate Alethea Oracle Protocol
//! into a prediction market dApp using the Alethea SDK.

#![cfg_attr(target_arch = "wasm32", no_main)]

use linera_sdk::{
    base::{WithContractAbi, AccountOwner, Amount, Timestamp},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use alethea_sdk::AletheaClient;
use alethea_oracle_types::RegistryMessage;

// Import your market types
use crate::state::{MarketState, Market};

/// Market Chain Contract with SDK Integration
pub struct MarketChainWithSDK {
    state: MarketState,
    runtime: ContractRuntime<Self>,
    alethea: AletheaClient, // ✅ Add Alethea client
}

impl Contract for MarketChainWithSDK {
    type Message = RegistryMessage; // ✅ Use RegistryMessage
    type Parameters = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        Self {
            state,
            runtime,
            alethea: AletheaClient::new(), // ✅ Create client
        }
    }

    async fn instantiate(&mut self, _arg: ()) {
        self.state.next_market_id.set(0);
    }

    async fn execute_operation(&mut self, operation: MarketOperation) -> MarketResponse {
        match operation {
            MarketOperation::CreateMarket {
                question,
                outcomes,
                resolution_deadline,
                initial_liquidity,
            } => {
                // Create market locally
                let market_id = self.create_market_internal(
                    question.clone(),
                    outcomes.clone(),
                    resolution_deadline,
                    initial_liquidity,
                ).await?;
                
                // ✅ Request oracle resolution (ONE LINE!)
                self.alethea.request_resolution(
                    &self.runtime,
                    question,
                    outcomes,
                    resolution_deadline,
                    market_id.to_le_bytes().to_vec(), // Store market ID in callback
                ).await?;
                
                MarketResponse::MarketCreated { market_id }
            }
            
            MarketOperation::RequestResolution { market_id } => {
                // Get market details
                let market = self.state.get_market(market_id).await?;
                
                // ✅ Request resolution
                self.alethea.request_resolution(
                    &self.runtime,
                    market.question,
                    market.outcomes,
                    market.resolution_deadline,
                    market_id.to_le_bytes().to_vec(),
                ).await?;
                
                MarketResponse::ResolutionRequested { market_id }
            }
            
            // ... other operations
        }
    }

    async fn execute_message(&mut self, message: RegistryMessage) {
        // ✅ Handle oracle resolution (ONE LINE!)
        if let Some(result) = self.alethea.handle_resolution(message) {
            // Extract market ID from callback data
            let market_id = result.market_id_from_callback()
                .expect("Invalid callback data");
            
            // Settle market with oracle result
            self.settle_market(market_id, result.outcome_index).await;
            
            log::info!(
                "Market {} resolved: outcome {}, confidence {}%",
                market_id,
                result.outcome_index,
                result.confidence
            );
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl MarketChainWithSDK {
    /// Create market internally (without oracle)
    async fn create_market_internal(
        &mut self,
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: Timestamp,
        initial_liquidity: Amount,
    ) -> Result<u64, MarketError> {
        let market_id = *self.state.next_market_id.get();
        self.state.next_market_id.set(market_id + 1);
        
        let market = Market {
            id: market_id,
            question,
            outcomes,
            resolution_deadline,
            initial_liquidity,
            status: MarketStatus::Active,
            winning_outcome: None,
        };
        
        self.state.markets.insert(&market_id, market).await?;
        
        Ok(market_id)
    }
    
    /// Settle market with oracle result
    async fn settle_market(&mut self, market_id: u64, outcome_index: usize) {
        if let Ok(Some(mut market)) = self.state.markets.get(&market_id).await {
            market.status = MarketStatus::Resolved;
            market.winning_outcome = Some(outcome_index);
            
            let _ = self.state.markets.insert(&market_id, market).await;
            
            // Distribute winnings to correct positions
            self.distribute_winnings(market_id, outcome_index).await;
        }
    }
    
    /// Distribute winnings to winners
    async fn distribute_winnings(&mut self, market_id: u64, winning_outcome: usize) {
        // Implementation depends on your AMM logic
        // This is just a placeholder
    }
}

// ==================== COMPARISON ====================

/// OLD WAY (3-chain model)
/// 
/// ```rust,ignore
/// // 1. Deploy oracle-coordinator on chain B
/// // 2. Deploy voter-chain on chain C  
/// // 3. Configure oracle_app_id in market-chain
/// // 4. Send complex messages
/// 
/// pub struct OldMarketChain {
///     oracle_app_id: Option<ApplicationId>, // ❌ Need to configure
/// }
/// 
/// impl OldMarketChain {
///     async fn request_resolution(&mut self, market_id: u64) {
///         let oracle_id = self.oracle_app_id
///             .ok_or(Error::OracleNotConfigured)?; // ❌ Can fail
///         
///         // ❌ Complex message construction
///         self.runtime.send_message(
///             oracle_id,
///             Message::ResolutionRequest {
///                 market_id,
///                 question: market.question.clone(),
///                 outcomes: market.outcomes.clone(),
///             }
///         );
///     }
/// }
/// ```

/// NEW WAY (Protocol model with SDK)
/// 
/// ```rust
/// use alethea_sdk::AletheaClient;
/// 
/// pub struct NewMarketChain {
///     alethea: AletheaClient, // ✅ No configuration needed!
/// }
/// 
/// impl NewMarketChain {
///     async fn request_resolution(&mut self, market_id: u64) {
///         // ✅ ONE LINE! No configuration, no complexity
///         self.alethea.request_resolution(
///             &self.runtime,
///             question,
///             outcomes,
///             deadline,
///             market_id.to_le_bytes().to_vec(),
///         ).await?;
///     }
///     
///     async fn handle_message(&mut self, message: RegistryMessage) {
///         // ✅ ONE LINE! Automatic parsing
///         if let Some(result) = self.alethea.handle_resolution(message) {
///             self.settle_market(result.market_id, result.outcome_index).await;
///         }
///     }
/// }
/// ```

// ==================== TYPES ====================

#[derive(Debug)]
pub enum MarketOperation {
    CreateMarket {
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: Timestamp,
        initial_liquidity: Amount,
    },
    RequestResolution {
        market_id: u64,
    },
    // ... other operations
}

#[derive(Debug)]
pub enum MarketResponse {
    MarketCreated { market_id: u64 },
    ResolutionRequested { market_id: u64 },
    // ... other responses
}

#[derive(Debug)]
pub enum MarketStatus {
    Active,
    Resolved,
}

#[derive(Debug)]
pub enum MarketError {
    MarketNotFound,
    InvalidOperation,
}

impl From<MarketError> for String {
    fn from(e: MarketError) -> String {
        format!("{:?}", e)
    }
}

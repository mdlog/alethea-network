// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

/*! 
 * Market Chain - Prediction Market Contract
 * 
 * Simplified version following Linera SDK 0.14.0 API patterns
 */

use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi, AccountOwner, Timestamp, Amount, ChainId},
};
use serde::{Deserialize, Serialize};

pub struct MarketChainAbi;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameters {
    /// Oracle chain ID for resolving markets
    pub oracle_chain_id: Option<linera_sdk::linera_base_types::ChainId>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InitialState {
    /// Initial markets (if any)
    pub markets: Vec<MarketConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketConfig {
    pub question: String,
    pub outcomes: Vec<String>,
    pub resolution_deadline: Timestamp,
}

#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum MarketOperation {
    /// Create a new prediction market
    CreateMarket {
        question: String,
        outcomes: Vec<String>,
        resolution_deadline: Timestamp,
        initial_liquidity: Amount,
    },
    
    /// Buy shares for a specific outcome
    BuyShares {
        market_id: u64,
        outcome_index: usize,
        amount: Amount,
    },
    
    /// Request oracle resolution (after deadline)
    RequestResolution {
        market_id: u64,
    },
    
    /// Claim winnings after market is resolved
    ClaimWinnings {
        market_id: u64,
    },
    
    /// Query market details
    GetMarket {
        market_id: u64,
    },
    
    /// Query user position
    GetPosition {
        market_id: u64,
        owner: AccountOwner,
    },
    
    /// Set oracle chain ID for resolution coordination
    SetOracleChain {
        oracle_chain_id: Option<ChainId>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub enum MarketResponse {
    /// Market ID of newly created market
    MarketCreated(u64),
    
    /// Shares purchased
    SharesPurchased { shares: u64 },
    
    /// Resolution requested
    ResolutionRequested,
    
    /// Winnings claimed
    WinningsClaimed { amount: Amount },
    
    /// Market details
    Market(MarketDetails),
    
    /// Position details
    Position(PositionDetails),
    
    /// Generic OK response
    Ok,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketDetails {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub creator: Option<AccountOwner>,
    pub total_liquidity: Amount,
    pub outcome_pools: Vec<Amount>,
    pub resolution_deadline: Timestamp,
    pub status: MarketStatus,
    pub final_outcome: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::Enum, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Closed,
    WaitingResolution,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionDetails {
    pub market_id: u64,
    pub owner: AccountOwner,
    pub outcome_index: usize,
    pub shares: u64,
    pub average_price: Amount,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Message {
    /// Resolution result from oracle
    ResolutionResult {
        market_id: u64,
        outcome_index: usize,
    },
    /// Request resolution from oracle
    ResolutionRequest {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
    },
}

impl ContractAbi for MarketChainAbi {
    type Operation = MarketOperation;
    type Response = MarketResponse;
}

impl ServiceAbi for MarketChainAbi {
    type Query = Request;
    type QueryResponse = Response;
}

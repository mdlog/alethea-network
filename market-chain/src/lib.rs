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
    linera_base_types::{ContractAbi, ServiceAbi, AccountOwner, Timestamp, Amount, ApplicationId},
};
use serde::{Deserialize, Serialize};

// Import shared Message types from oracle types
pub use alethea_oracle_types::{Message, RegistryMessage};

pub struct MarketChainAbi;

#[derive(Debug, Clone, Serialize)]
pub struct Parameters {}

impl Default for Parameters {
    fn default() -> Self {
        Parameters {}
    }
}

// Custom deserializer untuk empty object
impl<'de> serde::Deserialize<'de> for Parameters {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct ParametersVisitor;
        
        impl<'de> serde::de::Visitor<'de> for ParametersVisitor {
            type Value = Parameters;
            
            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("an empty object {}")
            }
            
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: serde::de::MapAccess<'de>,
            {
                while map.next_entry::<serde::de::IgnoredAny, serde::de::IgnoredAny>()?.is_some() {}
                Ok(Parameters {})
            }
        }
        
        deserializer.deserialize_map(ParametersVisitor)
    }
}

// InstantiationArgument is now () - no initial state needed
// Markets are created via operations after deployment

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
    
    /// Error response (WASM-safe, no string allocation)
    Error,
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

// Message type now imported from alethea-oracle-types (see top of file)
// This ensures cross-chain message compatibility

impl ContractAbi for MarketChainAbi {
    type Operation = MarketOperation;
    type Response = MarketResponse;
}

impl ServiceAbi for MarketChainAbi {
    type Query = Request;
    type QueryResponse = Response;
}

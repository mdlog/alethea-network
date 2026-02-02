// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Simple Prediction Market - Hub-and-Spoke Architecture
//! 
//! This market implementation demonstrates:
//! - Creating binary (Yes/No) prediction markets
//! - Placing bets on outcomes
//! - Oracle integration via Hub-and-Spoke architecture
//! - Receiving resolution callbacks from Oracle Registry
//! - Claiming payouts based on oracle results
//!
//! ## Hub-and-Spoke Architecture
//!
//! This market integrates with Alethea Oracle using the Hub-and-Spoke pattern:
//!
//! ```
//!                    ┌─────────────────────────────────┐
//!                    │         HUB CHAIN               │
//!                    │      (Alethea Main)             │
//!                    │                                 │
//!                    │  ┌───────────────────────────┐  │
//!                    │  │   Registry (HUB MODE)     │  │
//!                    │  │ - Global voter registry   │  │
//!                    │  │ - Voting happens HERE     │  │
//!                    │  │ - Resolution authority    │  │
//!                    │  └───────────────────────────┘  │
//!                    └───────────────┬─────────────────┘
//!                                    │
//!           Cross-chain messaging (SAME APP = Registry)
//!                                    │
//!                                    ▼
//!                    ┌─────────────────────────────────┐
//!                    │       YOUR CHAIN                │
//!                    │                                 │
//!                    │  ┌───────────────────────────┐  │
//!                    │  │ Registry (INSTANCE MODE)  │  │
//!                    │  │ - Forwards queries to Hub │  │
//!                    │  │ - Receives callbacks      │  │
//!                    │  └──────────┬────────────────┘  │
//!                    │             │                   │
//!                    │    call_application()           │
//!                    │    (TRUSTLESS!)                 │
//!                    │             │                   │
//!                    │             ▼                   │
//!                    │  ┌───────────────────────────┐  │
//!                    │  │   Simple Market App       │  │
//!                    │  │   (THIS CONTRACT)         │  │
//!                    │  └───────────────────────────┘  │
//!                    └─────────────────────────────────┘
//! ```
//!
//! ## Integration Modes
//!
//! 1. **Same-chain mode** (recommended): Market and Registry Instance on same chain
//!    - Uses `call_application()` for trustless on-chain calls
//!    - Registry Instance forwards to Hub automatically
//!
//! 2. **Cross-chain mode** (legacy): Market on different chain from Registry
//!    - Uses cross-chain messaging directly to Hub
//!    - Requires Registry chain ID configuration

pub mod state;

// Re-export shared message types for cross-chain communication
pub use alethea_oracle_messages::{OracleCallback, OracleRequest};

use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, ApplicationId, ChainId, Timestamp, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct SimpleMarketAbi;

impl ContractAbi for SimpleMarketAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for SimpleMarketAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Instantiation argument for Simple Market
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantiationArgument {
    /// Registry v2 Application ID (can be Hub or Instance on same chain)
    pub registry_app_id: ApplicationId<oracle_registry_v2::OracleRegistryV2Abi>,
    /// Registry v2 Chain ID (for cross-chain messaging fallback)
    /// If None, assumes Registry Instance is on same chain (use call_application)
    pub registry_chain_id: ChainId,
    /// Whether to use call_application() for same-chain Registry Instance
    /// If true, uses call_application() (recommended for Hub-and-Spoke)
    /// If false, uses cross-chain messaging (legacy mode)
    #[serde(default)]
    pub use_local_instance: bool,
}

/// Operations that can be performed on the market
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new prediction market
    CreateMarket {
        question: String,
        end_time: Timestamp,
    },
    
    /// Place a bet on a market outcome
    PlaceBet {
        market_id: u64,
        outcome: String,  // "Yes" or "No"
        stake: Amount,
    },
    
    /// Claim payout for a winning bet
    ClaimPayout {
        market_id: u64,
    },
    
    /// Request resolution for an expired market
    /// This sends OracleRequest to Registry chain
    RequestResolution {
        market_id: u64,
    },
    
    /// Link market with query ID (called after query is created in Registry)
    LinkQueryToMarket {
        market_id: u64,
        query_id: u64,
    },
}

/// Cross-chain messages using shared types
/// 
/// This enum wraps the shared message types from alethea-oracle-messages
/// to enable cross-chain communication with Oracle Registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Outgoing: Request to Oracle Registry
    OracleRequest(OracleRequest),
    
    /// Incoming: Callback from Oracle Registry
    OracleCallback(OracleCallback),
}

/// Market status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MarketStatus {
    Open,      // Accepting bets
    Voting,    // Oracle voting in progress
    Resolved,  // Oracle resolved, payouts available
    Cancelled, // Market cancelled
}

/// Market data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Market {
    pub id: u64,
    pub question: String,
    pub creator: ChainId,
    pub created_at: Timestamp,
    pub end_time: Timestamp,
    pub status: MarketStatus,
    
    // Betting pools
    pub yes_pool: Amount,
    pub no_pool: Amount,
    pub total_pool: Amount,
    
    // Oracle integration
    pub query_id: Option<u64>,
    pub registry_chain: Option<ChainId>,
    
    // Resolution
    pub winning_outcome: Option<String>,
    pub resolved_at: Option<Timestamp>,
}

/// Bet data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bet {
    pub bettor: ChainId,
    pub market_id: u64,
    pub outcome: String,  // "Yes" or "No"
    pub stake: Amount,
    pub placed_at: Timestamp,
    pub claim_status: ClaimStatus,
    pub payout_amount: Option<Amount>,
}

/// Claim status for bets
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ClaimStatus {
    Pending,   // Not yet claimed
    Claimed,   // Payout claimed
}

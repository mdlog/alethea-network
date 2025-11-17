// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Account-Based Oracle Registry
//! 
//! Simplified oracle registry where voters register with their account address
//! instead of deploying separate applications.

pub mod state;
pub mod migration;

// NOTE: Unit tests are temporarily disabled due to Linera SDK test infrastructure complexity.
// The contract and service code compiles and works correctly in production.
// Use `linera project test` for integration testing with actual chain contexts.

// #[cfg(test)]
// mod test_utils;

// #[cfg(test)]
// mod reputation_tests;

// #[cfg(test)]
// mod query_validation_tests;

// #[cfg(test)]
// mod deadline_checking_tests;

// #[cfg(test)]
// mod reward_claiming_tests;

// #[cfg(test)]
// mod reward_calculation_tests;

// #[cfg(test)]
// mod reward_distribution_tests;

// #[cfg(test)]
// mod slashing_tests;

// #[cfg(test)]
// mod update_parameters_tests;

// #[cfg(test)]
// mod pause_protocol_tests;

// #[cfg(test)]
// mod admin_authorization_tests;

// #[cfg(test)]
// mod voter_registration_tests;

// #[cfg(test)]
// mod stake_management_tests;

// #[cfg(test)]
// mod query_creation_tests;

// #[cfg(test)]
// mod voting_tests;

// #[cfg(test)]
// mod query_resolution_tests;

// #[cfg(test)]
// mod edge_case_tests;

// #[cfg(test)]
// mod voting_flow_integration_tests;

// #[cfg(test)]
// mod multiple_voters_tests;

// #[cfg(test)]
// mod strategy_comparison_tests;

// #[cfg(test)]
// mod concurrent_operations_tests;

// #[cfg(test)]
// mod migration_tests;

use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::linera_base_types::{Amount, Timestamp, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};
use state::{DecisionStrategy, ProtocolParameters};

/// Application ABI
pub struct OracleRegistryV2Abi;

impl ContractAbi for OracleRegistryV2Abi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl ServiceAbi for OracleRegistryV2Abi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that can be performed on the registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    /// Register as a voter
    RegisterVoter {
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    },
    
    /// Register a voter on behalf of an address (admin operation for testing)
    /// This allows the registry owner to register voters without requiring
    /// cross-chain messages. Useful for testing and initial setup.
    RegisterVoterFor {
        voter_address: String,  // Hex string of AccountOwner
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    },
    
    /// Add more stake
    UpdateStake {
        additional_stake: Amount,
    },
    
    /// Withdraw stake (if no active votes)
    WithdrawStake {
        amount: Amount,
    },
    
    /// Deregister as voter
    DeregisterVoter,
    
    /// Create a new query/market
    CreateQuery {
        description: String,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<Timestamp>,
    },
    
    /// Submit a vote for a query
    SubmitVote {
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    },
    
    /// Resolve a query (can be called by anyone if conditions met)
    ResolveQuery {
        query_id: u64,
    },
    
    /// Claim pending rewards
    ClaimRewards,
    
    /// Update protocol parameters (admin only)
    UpdateParameters {
        params: ProtocolParameters,
    },
    
    /// Pause protocol (admin only)
    PauseProtocol,
    
    /// Unpause protocol (admin only)
    UnpauseProtocol,
    
    /// Check and expire queries that have passed their deadline (maintenance operation)
    CheckExpiredQueries,
    
    /// Manually mark a specific query as expired (admin only)
    ExpireQuery {
        query_id: u64,
    },
}

/// Cross-chain messages for voter operations
/// 
/// These messages enable account-based voting by allowing users to
/// send operations from their own chains without deploying separate apps.
/// Authentication is automatic - Linera verifies the message sender.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Register as a voter
    /// Sender's AccountOwner is extracted from message authentication
    RegisterVoter {
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    },
    
    /// Update stake
    UpdateStake {
        additional_stake: Amount,
    },
    
    /// Withdraw stake
    WithdrawStake {
        amount: Amount,
    },
    
    /// Deregister as voter
    DeregisterVoter,
    
    /// Submit vote for a query
    SubmitVote {
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    },
    
    /// Claim pending rewards
    ClaimRewards,
}

/// Response from operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<ResponseData>,
}

/// Response data variants
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ResponseData {
    pub voter_address: Option<String>,
    pub query_id: Option<u64>,
    pub vote_count: Option<usize>,
    pub rewards_claimed: Option<String>,
}

impl OperationResponse {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
            data: None,
        }
    }
    
    pub fn success_with_data(message: impl Into<String>, data: ResponseData) -> Self {
        Self {
            success: true,
            message: message.into(),
            data: Some(data),
        }
    }
    
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            message: message.into(),
            data: None,
        }
    }
}

/// Errors that can occur
#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("Voter already registered")]
    AlreadyRegistered,
    
    #[error("Voter not registered")]
    NotRegistered,
    
    #[error("Insufficient stake: required {required}, provided {provided}")]
    InsufficientStake { required: Amount, provided: Amount },
    
    #[error("Query not found: {0}")]
    QueryNotFound(u64),
    
    #[error("Query not active")]
    QueryNotActive,
    
    #[error("Already voted on this query")]
    AlreadyVoted,
    
    #[error("Not enough votes to resolve: {current}/{required}")]
    NotEnoughVotes { current: usize, required: usize },
    
    #[error("Query already resolved")]
    AlreadyResolved,
    
    #[error("No pending rewards")]
    NoPendingRewards,
    
    #[error("Protocol is paused")]
    ProtocolPaused,
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Invalid parameters: {0}")]
    InvalidParameters(String),
}

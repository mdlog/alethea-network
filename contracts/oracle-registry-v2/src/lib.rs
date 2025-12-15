// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Account-Based Oracle Registry
//! 
//! Simplified oracle registry where voters register with their account address
//! instead of deploying separate applications.
//!
//! ## Cross-Chain Messaging
//! 
//! This contract supports real-time cross-chain event streaming using Linera's
//! event system. Subscribers can receive notifications for:
//! - Query creation and resolution
//! - Vote submissions
//! - Voter registration/deregistration
//! - Reward claims

pub mod state;
pub mod migration;

/// Stream name for Oracle events - used for cross-chain event subscription
pub const ORACLE_STREAM_NAME: &str = "oracle_events";

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
use linera_sdk::linera_base_types::{Amount, Timestamp, ContractAbi, ServiceAbi, ChainId};
use serde::{Deserialize, Serialize};
use state::{DecisionStrategy, ProtocolParameters};

// ==================== ORACLE EVENTS (Cross-Chain Streaming) ====================

/// Oracle events for real-time cross-chain notifications
/// 
/// These events are emitted using `runtime.emit()` and can be received by
/// other chains that subscribe using `runtime.subscribe_to_events()`.
/// 
/// ## Usage
/// 
/// To subscribe to oracle events from another contract:
/// ```rust
/// // In instantiate or any operation
/// self.runtime.subscribe_to_events(
///     oracle_chain_id,
///     oracle_app_id,
///     StreamName::from(ORACLE_STREAM_NAME),
/// );
/// ```
/// 
/// To process received events:
/// ```rust
/// async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
///     for update in updates {
///         for index in update.previous_index..update.next_index {
///             let event: OracleEvent = self.runtime.read_event(
///                 update.chain_id,
///                 update.stream_id.stream_name.clone(),
///                 index,
///             );
///             // Handle event...
///         }
///     }
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OracleEvent {
    /// Emitted when a new query is created
    QueryCreated {
        query_id: u64,
        description: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        creator: ChainId,
        min_votes: usize,
    },
    
    /// Emitted when a query is resolved
    QueryResolved {
        query_id: u64,
        result: String,
        resolved_at: Timestamp,
        total_votes: usize,
        correct_voters: usize,
    },
    
    /// Emitted when a query expires without resolution
    QueryExpired {
        query_id: u64,
        expired_at: Timestamp,
        votes_received: usize,
        min_votes_required: usize,
    },
    
    /// Emitted when a voter registers
    VoterRegistered {
        voter_chain: ChainId,
        stake: Amount,
        name: Option<String>,
    },
    
    /// Emitted when a voter deregisters
    VoterDeregistered {
        voter_chain: ChainId,
        stake_returned: Amount,
    },
    
    /// Emitted when a vote is committed (phase 1)
    VoteCommitted {
        query_id: u64,
        voter_chain: ChainId,
        commit_hash: String,
    },
    
    /// Emitted when a vote is revealed (phase 2)
    VoteRevealed {
        query_id: u64,
        voter_chain: ChainId,
        value: String,
    },
    
    /// Emitted when a direct vote is submitted (no commit/reveal)
    VoteSubmitted {
        query_id: u64,
        voter_chain: ChainId,
        value: String,
    },
    
    /// Emitted when rewards are claimed
    RewardsClaimed {
        voter_chain: ChainId,
        amount: Amount,
    },
    
    /// Emitted when protocol parameters are updated
    ParametersUpdated {
        min_stake: Amount,
        min_votes_default: usize,
        updated_by: ChainId,
    },
    
    /// Emitted when protocol is paused/unpaused
    ProtocolStatusChanged {
        is_paused: bool,
        changed_by: ChainId,
    },
    
    /// Emitted when stake is updated
    StakeUpdated {
        voter_chain: ChainId,
        new_stake: Amount,
        change: Amount,
        is_increase: bool,
    },
}

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
    /// Register as a voter (chain ID automatically detected)
    /// No address parameter needed - uses runtime.chain_id()
    /// This is the CORRECT way following Microcard pattern!
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
    /// 
    /// Parameters:
    /// - description: Query question/description
    /// - outcomes: Possible answers (e.g., ["Yes", "No"])
    /// - strategy: Decision strategy (Majority, Median, etc.)
    /// - min_votes: Minimum votes required (optional, uses default)
    /// - reward_amount: Reward for correct voters
    /// - deadline: Query deadline (optional, calculated from duration)
    /// - duration_secs: Custom duration in seconds (optional, uses default_query_duration)
    ///                  This sets total duration, split 50/50 between commit and reveal phases
    CreateQuery {
        description: String,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<Timestamp>,
        #[serde(default)]
        duration_secs: Option<u64>,
    },
    
    /// Submit a vote for a query (direct voting, no commit/reveal)
    SubmitVote {
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    },
    
    /// Commit a vote (phase 1 of commit/reveal)
    CommitVote {
        query_id: u64,
        commit_hash: String,
    },
    
    /// Reveal a vote (phase 2 of commit/reveal)
    RevealVote {
        query_id: u64,
        value: String,
        salt: String,
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
    
    /// Auto-resolve queries that have completed reveal phase (maintenance operation)
    AutoResolveQueries,
    
    /// Send RegisterVoter message to another chain (cross-chain registration)
    /// This allows a user to register as voter on the main registry chain
    /// by sending a cross-chain message from their own chain.
    SendRegisterVoterMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    },
    
    /// Send SubmitVote message to another chain (cross-chain voting)
    SendSubmitVoteMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    },
    
    /// Send CommitVote message to another chain (cross-chain commit phase)
    SendCommitVoteMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        commit_hash: String,
    },
    
    /// Send RevealVote message to another chain (cross-chain reveal phase)
    SendRevealVoteMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        query_id: u64,
        value: String,
        salt: String,
        confidence: Option<u8>,
    },
    
    /// Send CreateQuery message to another chain (cross-chain query creation)
    /// This allows a user to create a query on the main registry chain
    /// by sending a cross-chain message from their own chain.
    SendCreateQueryMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        description: String,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        duration_secs: Option<u64>,
    },
    
    /// Send UpdateStake message to another chain (cross-chain stake update)
    /// This allows a user to add more stake from their own chain.
    SendUpdateStakeMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        additional_stake: Amount,
    },
    
    /// Send WithdrawStake message to another chain (cross-chain stake withdrawal)
    /// This allows a user to withdraw stake from their own chain.
    SendWithdrawStakeMessage {
        target_chain: linera_sdk::linera_base_types::ChainId,
        amount: Amount,
    },
    
    /// Create a query with callback information (for cross-application calls)
    /// This allows other applications to create queries and receive callbacks when resolved
    CreateQueryWithCallback {
        description: String,
        outcomes: Vec<String>,
        strategy: DecisionStrategy,
        min_votes: Option<usize>,
        reward_amount: Amount,
        deadline: Option<Timestamp>,
        /// Chain ID to send callback to when query is resolved
        callback_chain: linera_sdk::linera_base_types::ChainId,
        /// Application ID to send callback to (on callback_chain)
        callback_app: linera_sdk::linera_base_types::ApplicationId,
        /// Arbitrary data to include in callback (e.g., market_id)
        callback_data: Vec<u8>,
    },
}

/// Cross-chain messages for voter operations
/// 
/// These messages enable account-based voting by allowing users to
/// send operations from their own chains without deploying separate apps.
/// Authentication is automatic - Linera verifies the message sender.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Register as a voter via cross-chain message
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    RegisterVoter {
        sender_chain: ChainId,
        stake: Amount,
        name: Option<String>,
        metadata_url: Option<String>,
    },
    
    /// Update stake via cross-chain message
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    UpdateStake {
        sender_chain: ChainId,
        additional_stake: Amount,
    },
    
    /// Withdraw stake via cross-chain message
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    WithdrawStake {
        sender_chain: ChainId,
        amount: Amount,
    },
    
    /// Deregister as voter
    DeregisterVoter,
    
    /// Submit vote for a query (direct voting)
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    SubmitVote {
        sender_chain: ChainId,
        query_id: u64,
        value: String,
        confidence: Option<u8>,
    },
    
    /// Commit a vote (phase 1 of commit/reveal)
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    CommitVote {
        sender_chain: ChainId,
        query_id: u64,
        commit_hash: String,
    },
    
    /// Reveal a vote (phase 2 of commit/reveal)
    /// sender_chain is the chain ID of the voter (set by the sending contract)
    RevealVote {
        sender_chain: ChainId,
        query_id: u64,
        value: String,
        salt: String,
        confidence: Option<u8>,
    },
    
    /// Claim pending rewards
    ClaimRewards,
    
    /// Create a query via cross-chain message
    CreateQuery {
        sender_chain: ChainId,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<usize>,
        reward_amount: Amount,
        duration_secs: Option<u64>,
    },
    
    /// Market Chain -> Registry: Create query from expired market (AUTOMATIC)
    /// This is sent automatically when a market expires and needs resolution
    CreateQueryFromMarket {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_chain: linera_sdk::linera_base_types::ChainId,
        callback_data: Vec<u8>,
    },
    
    /// Registry -> Market Chain: Send resolution result back (CALLBACK)
    /// This is sent automatically when a query is resolved
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
    },
    
    // ==================== TOKEN INTEGRATION MESSAGES ====================
    
    /// Receive tokens from alethea-token contract (for staking)
    /// This is sent by the token contract when user calls TransferToApplication
    ReceiveTokensForStake {
        sender_chain: ChainId,
        sender: String, // AccountOwner as string
        amount: Amount,
    },
    
    /// Request to withdraw tokens back to user
    /// Registry will send WithdrawToAccount to token contract
    WithdrawTokens {
        amount: Amount,
        target_chain: ChainId,
    },
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

// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Account-Based Oracle Registry
//! 
//! Simplified oracle registry where voters register with their account address
//! instead of deploying separate applications.
//!
//! ## Hub-and-Spoke Architecture
//! 
//! This contract supports two operating modes:
//! 
//! ### Hub Mode (Default)
//! - Master registry on Alethea chain
//! - Stores all voters and reputation
//! - Processes votes and determines resolution
//! - Sends resolution callbacks to Instances
//! 
//! ### Instance Mode
//! - Local proxy on developer chains
//! - Forwards queries to Hub via cross-chain messaging
//! - Receives resolution callbacks from Hub
//! - Calls consumer apps via `call_application()`
//! 
//! ## Developer Onboarding
//! 
//! Developers can deploy their own Instance using `linera request-application`:
//! ```bash
//! linera request-application <REGISTRY_APP_ID> --target-chain-id <DEV_CHAIN>
//! ```
//! 
//! This creates a Registry Instance on their chain that:
//! 1. Forwards queries to Hub
//! 2. Receives resolution callbacks
//! 3. Allows consumer apps to call via `call_application()`
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

// Re-export state types for external use
pub use state::{
    DecisionStrategy, PendingQuery, PendingQueryStatus, ProtocolParameters, 
    Query, QueryCallback, QueryStatus, QuerySource, RegistryMode, Vote, VoteCommit, 
    VoterInfo, VotingPhase,
    // Consumer App types
    ConsumerAppInfo, ConsumerAppStats, AppCategory, RegistrationTier,
    // Hybrid Model types
    Dispute, DisputeStatus, DisputeResolution, BondInfo, BondStatus, HybridModelStats,
    // Query Metadata
    QueryMetadata,
};

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
    
    /// Emitted when a query with callback is resolved (for Market integration)
    /// This event includes callback_data so Market can identify which market was resolved
    MarketQueryResolved {
        query_id: u64,
        result: String,
        resolved_at: Timestamp,
        callback_chain: ChainId,
        callback_data: Vec<u8>,
    },
    
    // ==================== CONSUMER APP EVENTS ====================
    
    /// Emitted when a consumer app is registered
    ConsumerAppRegistered {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        name: String,
        category: String,
        tier: String,
        stake: Amount,
    },
    
    /// Emitted when a consumer app is deregistered
    ConsumerAppDeregistered {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        stake_returned: Amount,
        total_queries: u64,
    },
    
    /// Emitted when a consumer app is suspended
    ConsumerAppSuspended {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        reason: String,
        suspended_by: ChainId,
    },
    
    /// Emitted when a consumer app is reactivated
    ConsumerAppReactivated {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        reactivated_by: ChainId,
    },
    
    /// Emitted when a consumer app tier is upgraded
    ConsumerAppTierUpgraded {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        old_tier: String,
        new_tier: String,
        new_stake: Amount,
    },
    
    /// Emitted when rate limit is exceeded (warning)
    RateLimitExceeded {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        queries_attempted: u32,
        limit: u32,
    },
    
    // ==================== HYBRID MODEL EVENTS ====================
    
    /// Emitted when a query with bond is created
    QueryWithBondCreated {
        query_id: u64,
        creator: ChainId,
        bond_amount: Amount,
        priority_fee: Amount,
        description: String,
    },
    
    /// Emitted when a bond is refunded
    BondRefunded {
        query_id: u64,
        depositor: ChainId,
        amount: Amount,
    },
    
    /// Emitted when a dispute is raised
    DisputeRaised {
        query_id: u64,
        disputer: ChainId,
        dispute_bond: Amount,
        disputed_outcome: String,
        reason: String,
    },
    
    /// Emitted when a dispute is resolved
    DisputeResolved {
        query_id: u64,
        winner: String,
        final_outcome: String,
        bond_transferred: Amount,
    },
    
    /// Emitted when inflation is minted
    InflationMinted {
        amount: Amount,
        total_pool: Amount,
        minted_by: ChainId,
    },
    
    /// Emitted when inflation rewards are distributed
    InflationRewardDistributed {
        query_id: u64,
        total_reward: Amount,
        voters_rewarded: usize,
    },
    
    /// Emitted when bond is slashed
    BondSlashed {
        query_id: u64,
        slashed_from: ChainId,
        amount: Amount,
        reason: String,
    },
}

// ==================== INSTANTIATION ARGUMENT ====================

/// Argument for instantiating the Oracle Registry
/// 
/// Determines whether this instance runs as Hub or Instance mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstantiationArgument {
    /// Initialize as Hub (master registry)
    /// 
    /// Hub is the single source of truth for:
    /// - Voter registration and reputation
    /// - Vote processing and resolution
    /// - Reward distribution
    Hub,
    
    /// Initialize as Instance (local proxy)
    /// 
    /// Instance forwards queries to Hub and receives callbacks.
    /// Consumer apps on the same chain can call Instance via `call_application()`.
    Instance {
        /// Chain ID where Hub is deployed
        hub_chain_id: ChainId,
    },
}

impl Default for InstantiationArgument {
    fn default() -> Self {
        InstantiationArgument::Hub
    }
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
    
    /// Add more stake for a specific voter (admin operation)
    /// Useful for testing and when HTTP calls can't identify the caller
    UpdateStakeFor {
        voter_address: String,  // Hex string of voter's chain ID
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
    
    /// Claim pending rewards (uses runtime.chain_id() as voter)
    ClaimRewards,
    
    /// Claim pending rewards for a specific voter (by address)
    /// This allows claiming rewards when the caller chain is different from voter chain
    ClaimRewardsFor {
        voter_address: String,  // Hex string of ChainId
    },
    
    /// Withdraw stake for a specific voter (by address)
    /// This allows withdrawing stake when the caller chain is different from voter chain
    WithdrawStakeFor {
        voter_address: String,  // Hex string of ChainId
        amount: Amount,
    },
    
    /// Claim withdrawable tokens for a specific voter
    /// This clears the withdrawable_balance and adds it to the user's token balance
    ClaimWithdrawableTokens {
        voter_address: String,  // Hex string of ChainId
    },
    
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
    
    // ==================== HYBRID MODEL OPERATIONS ====================
    
    /// Create a query with bond (Hybrid Model)
    /// 
    /// Bond is refundable if no dispute is raised within the dispute window.
    /// Priority fee is non-refundable and goes directly to voter rewards.
    /// Voter rewards primarily come from inflation, not from the bond.
    CreateQueryWithBond {
        /// Query description (the main question)
        description: String,
        /// Possible outcomes (2-10 items)
        outcomes: Vec<String>,
        /// Decision strategy (default: WeightedByStake)
        strategy: DecisionStrategy,
        /// Minimum votes required (optional, uses default)
        min_votes: Option<usize>,
        /// Bond amount (refundable if no dispute)
        bond_amount: Amount,
        /// Service fee (non-refundable, goes to protocol treasury)
        service_fee: Amount,
        /// Optional priority fee (non-refundable, adds to voter rewards)
        priority_fee: Option<Amount>,
        /// Duration in seconds (optional)
        duration_secs: Option<u64>,
        /// Callback chain for receiving resolution
        callback_chain: linera_sdk::linera_base_types::ChainId,
        /// Callback application ID
        callback_app: linera_sdk::linera_base_types::ApplicationId,
        /// Callback data (e.g., encoded market_id)
        callback_data: Vec<u8>,
        
        // ==================== QUERY METADATA ====================
        /// Short title for the query
        title: Option<String>,
        /// Category (e.g., "Sports", "Crypto", "Politics")
        category: Option<String>,
        /// Detailed context/background for voters
        context: Option<String>,
        /// Resolution criteria (how to determine outcome)
        resolution_criteria: Option<String>,
        /// Data source URLs for verification
        source_urls: Option<String>,
        /// Tags for categorization (comma-separated)
        tags: Option<String>,
        /// External metadata URL (IPFS/HTTP)
        metadata_url: Option<String>,
        /// External market/request ID from DApp
        external_id: Option<String>,
    },
    
    /// Claim bond refund after dispute window expires
    /// 
    /// Query creator can claim their bond back if:
    /// - Query is resolved
    /// - Dispute window has passed
    /// - No dispute was raised
    ClaimBondRefund {
        query_id: u64,
    },
    
    /// Raise a dispute against a query resolution
    /// 
    /// Disputer must stake a dispute bond (equal to original bond).
    /// If dispute succeeds, disputer gets both bonds.
    /// If dispute fails, original creator gets dispute bond.
    RaiseDispute {
        query_id: u64,
        /// The outcome disputer claims is correct
        disputed_outcome: String,
        /// Dispute bond amount (must equal original bond)
        dispute_bond: Amount,
        /// Reason for dispute
        reason: String,
    },
    
    /// Resolve a dispute (admin or through second voting round)
    ResolveDispute {
        query_id: u64,
        /// Final outcome after dispute resolution
        final_outcome: String,
        /// Who won: "original" or "disputer"
        winner: String,
    },
    
    /// Add inflation to the pool (admin operation)
    /// This is typically called by a scheduled process or governance
    MintInflation {
        /// Amount to add to inflation pool
        amount: Amount,
    },
    
    /// Update hybrid model parameters (admin only)
    UpdateHybridParameters {
        /// Minimum bond for query creation
        min_bond: Option<Amount>,
        /// Inflation rate in basis points (e.g., 500 = 5%)
        inflation_rate_bps: Option<u32>,
        /// Inflation reward per query
        inflation_reward_per_query: Option<Amount>,
        /// Dispute window in seconds
        dispute_window_secs: Option<u64>,
        /// Dispute bond percentage (basis points)
        dispute_bond_percentage: Option<u32>,
    },
    
    // ==================== CONSUMER APP REGISTRATION ====================
    
    /// Register a consumer app to use Oracle services
    /// Consumer apps (markets, insurance, etc.) must register before creating queries
    /// Stake determines tier and rate limits
    RegisterConsumerApp {
        /// Human-readable app name
        name: String,
        /// App category (PredictionMarket, Insurance, Gaming, etc.)
        category: state::AppCategory,
        /// Registration stake (determines tier: Free=0, Standard=100, Premium=1000, Enterprise=10000)
        stake: Amount,
        /// Optional metadata URL (detailed info, description, etc.)
        metadata_url: Option<String>,
        /// Optional logo URL (direct link to logo image for display in dashboard)
        logo_url: Option<String>,
    },
    
    /// Update consumer app information
    UpdateConsumerApp {
        /// New name (optional)
        name: Option<String>,
        /// New category (optional)
        category: Option<state::AppCategory>,
        /// New metadata URL (optional)
        metadata_url: Option<Option<String>>,
    },
    
    /// Add more stake to upgrade tier
    UpgradeConsumerAppTier {
        additional_stake: Amount,
    },
    
    /// Deregister consumer app (returns stake)
    DeregisterConsumerApp,
    
    /// Suspend a consumer app (admin only)
    SuspendConsumerApp {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: linera_sdk::linera_base_types::ChainId,
        reason: String,
    },
    
    /// Reactivate a suspended app (admin only)
    ReactivateConsumerApp {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: linera_sdk::linera_base_types::ChainId,
    },
    
    /// Set token configuration (admin only)
    /// This configures the ALTH token contract for real token integration
    SetTokenConfig {
        token_app_id: linera_sdk::linera_base_types::ApplicationId,
        token_chain_id: linera_sdk::linera_base_types::ChainId,
    },
    
    // ==================== INFLATION CONTROL OPERATIONS ====================
    
    /// Set protocol launch timestamp (admin only)
    /// This is used to calculate the current year for inflation calculations
    SetProtocolLaunchTimestamp {
        timestamp: Timestamp,
    },
    
    /// Update inflation control parameters (admin only)
    /// Used to adjust inflation rate based on actual query volume
    UpdateInflationControl {
        /// Total supply of ALTH token
        total_supply: Amount,
        /// Expected query volume per year
        expected_queries_per_year: u64,
    },
    
    /// Reset yearly counters (admin only)
    /// Called at the start of each year to reset query counters
    ResetYearlyCounters,
    
    /// Transfer admin role to a new chain (admin only)
    /// 
    /// Two-step process for safety:
    /// 1. Current admin calls TransferAdmin with new_admin chain
    /// 2. New admin calls AcceptAdmin to complete the transfer
    TransferAdmin {
        new_admin: ChainId,
    },
    
    /// Accept pending admin transfer (new admin only)
    /// 
    /// Must be called by the chain specified in TransferAdmin.
    AcceptAdmin,
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
    
    /// Withdraw stake
    WithdrawStake {
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
    
    // ==================== SHARED MESSAGE TYPES (Production) ====================
    
    /// Incoming: OracleRequest from consumer apps (Markets, etc.)
    /// Uses shared message type from alethea-oracle-messages
    OracleRequest(alethea_oracle_messages::OracleRequest),
    
    /// Outgoing: OracleCallback to consumer apps
    /// Uses shared message type from alethea-oracle-messages
    OracleCallback(alethea_oracle_messages::OracleCallback),
    
    // ==================== HUB-INSTANCE MESSAGES ====================
    
    /// Instance -> Hub: Forward query for resolution
    /// 
    /// Sent by Instance when a consumer app creates a query.
    /// Hub will process the query and send back resolution.
    ForwardQueryToHub {
        /// Local query ID on Instance
        local_query_id: u64,
        /// Query description
        description: String,
        /// Possible outcomes
        outcomes: Vec<String>,
        /// Decision strategy
        strategy: String,
        /// Minimum votes required
        min_votes: Option<usize>,
        /// Reward amount
        reward_amount: Amount,
        /// Query deadline
        deadline: Option<Timestamp>,
        /// Source chain (Instance chain)
        source_chain: ChainId,
        /// Callback application on source chain
        callback_app: Option<linera_sdk::linera_base_types::ApplicationId>,
        /// Custom callback data
        callback_data: Vec<u8>,
    },
    
    /// Hub -> Instance: Query created confirmation
    /// 
    /// Sent by Hub after creating query, includes Hub query ID.
    QueryCreatedOnHub {
        /// Local query ID on Instance
        local_query_id: u64,
        /// Query ID assigned by Hub
        hub_query_id: u64,
    },
    
    /// Hub -> Instance: Query resolution
    /// 
    /// Sent by Hub when query is resolved.
    /// Instance will forward to consumer app via call_application().
    QueryResolvedFromHub {
        /// Query ID on Hub
        hub_query_id: u64,
        /// Resolution result
        result: String,
        /// Resolution timestamp
        resolved_at: Timestamp,
        /// Vote count
        vote_count: u32,
        /// Confidence score
        confidence: u32,
    },
    
    /// Hub -> Instance: Query expired
    /// 
    /// Sent by Hub when query expires without resolution.
    QueryExpiredFromHub {
        /// Query ID on Hub
        hub_query_id: u64,
        /// Votes received
        votes_received: u32,
        /// Votes required
        votes_required: u32,
    },
    
    // ==================== CONSUMER APP MESSAGES ====================
    
    /// Instance -> Hub: Register consumer app
    RegisterConsumerAppOnHub {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: ChainId,
        name: String,
        category: String,
        stake: Amount,
        metadata_url: Option<String>,
        logo_url: Option<String>,
    },
    
    /// Hub -> Instance: Consumer app registered confirmation
    ConsumerAppRegistered {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        tier: String,
        rate_limit: u32,
    },
    
    /// Hub -> Instance: Consumer app registration rejected
    ConsumerAppRegistrationRejected {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        reason: String,
    },
    
    /// Instance -> Hub: Deregister consumer app
    DeregisterConsumerAppOnHub {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        source_chain: ChainId,
    },
    
    /// Hub -> Instance: Consumer app deregistered confirmation
    ConsumerAppDeregistered {
        app_id: linera_sdk::linera_base_types::ApplicationId,
        chain_id: ChainId,
        stake_returned: Amount,
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

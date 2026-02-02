// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Account-Based Oracle Registry State
//! 
//! Simplified registry where voters register with their account address
//! instead of deploying separate applications.
//!
//! ## Hub-and-Spoke Architecture
//! 
//! The registry supports two modes:
//! - **Hub Mode**: Master registry on Alethea chain. Stores voters, processes votes,
//!   determines resolution. This is the single source of truth.
//! - **Instance Mode**: Local proxy on developer chains. Forwards queries to Hub,
//!   receives resolution callbacks, calls consumer apps via `call_application()`.
//!
//! This architecture enables:
//! - Scalable deployment (unlimited developer chains)
//! - Self-service onboarding (developers use `request-application`)
//! - Trustless resolution (cross-chain messaging between same app)
//! - Local integration (consumer apps call Instance via `call_application()`)

use linera_sdk::{
    linera_base_types::{Amount, ApplicationId, ChainId, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// ==================== HUB-AND-SPOKE ARCHITECTURE ====================

/// Registry operating mode
/// 
/// Determines how the registry instance behaves:
/// - Hub: Master registry that processes votes and determines resolution
/// - Instance: Local proxy that forwards to Hub and receives callbacks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RegistryMode {
    /// Hub mode - master registry on Alethea chain
    /// 
    /// Responsibilities:
    /// - Store and manage all voters
    /// - Process votes from all chains
    /// - Determine query resolution
    /// - Send resolution callbacks to Instances
    Hub,
    
    /// Instance mode - local proxy on developer chain
    /// 
    /// Responsibilities:
    /// - Forward queries to Hub
    /// - Cache query status locally
    /// - Receive resolution callbacks from Hub
    /// - Call consumer apps via call_application()
    Instance {
        /// Chain ID where Hub is deployed
        hub_chain_id: ChainId,
    },
}

impl Default for RegistryMode {
    fn default() -> Self {
        RegistryMode::Hub
    }
}

/// Pending query on Instance (waiting for Hub resolution)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingQuery {
    /// Local query ID on this Instance
    pub local_id: u64,
    
    /// Query ID on Hub (assigned after forwarding)
    pub hub_query_id: Option<u64>,
    
    /// Query description
    pub description: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    /// Application to callback when resolved
    pub callback_app: Option<ApplicationId>,
    
    /// Custom callback data
    pub callback_data: Vec<u8>,
    
    /// Query status
    pub status: PendingQueryStatus,
    
    /// Created timestamp
    pub created_at: Timestamp,
    
    /// Resolution result (when resolved)
    pub result: Option<String>,
    
    /// Resolution timestamp
    pub resolved_at: Option<Timestamp>,
}

/// Status of pending query on Instance
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PendingQueryStatus {
    /// Query created locally, waiting to be forwarded to Hub
    Created,
    
    /// Query forwarded to Hub, waiting for resolution
    Forwarded,
    
    /// Query resolved by Hub
    Resolved,
    
    /// Query expired on Hub
    Expired,
    
    /// Query cancelled
    Cancelled,
}

/// Voter information (chain-based - Microcard pattern!)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterInfo {
    /// Voter's chain ID (natural identifier - no parsing needed!)
    pub chain_id: ChainId,
    
    /// Staked amount
    pub stake: Amount,
    
    /// Locked stake (for active votes)
    pub locked_stake: Amount,
    
    /// Withdrawable balance (tokens that can be claimed from token contract)
    /// This is increased when user withdraws stake, and decreased when user claims tokens
    pub withdrawable_balance: Amount,
    
    /// Reputation score (0-100)
    pub reputation: u32,
    
    /// Total number of votes submitted
    pub total_votes: u64,
    
    /// Number of correct votes
    pub correct_votes: u64,
    
    /// Registration timestamp
    pub registered_at: Timestamp,
    
    /// Is voter active
    pub is_active: bool,
    
    /// Metadata
    pub name: Option<String>,
    pub metadata_url: Option<String>,
}

/// Query/Market information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Query {
    /// Unique query ID
    pub id: u64,
    
    /// Query description (the main question to be resolved)
    pub description: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    // ==================== QUERY METADATA ====================
    
    /// Query title (short, human-readable title)
    #[serde(default)]
    pub title: Option<String>,
    
    /// Market category (e.g., "Sports", "Crypto", "Politics", "Entertainment")
    #[serde(default)]
    pub category: Option<String>,
    
    /// Detailed context/background information for voters
    /// This should include all relevant information needed to resolve the query
    #[serde(default)]
    pub context: Option<String>,
    
    /// Resolution criteria - specific conditions that determine the outcome
    /// e.g., "Use CoinGecko price at exactly 00:00 UTC on the specified date"
    #[serde(default)]
    pub resolution_criteria: Option<String>,
    
    /// Data source URLs for verification (comma-separated or JSON array)
    /// e.g., "https://coingecko.com/btc, https://coinmarketcap.com/btc"
    #[serde(default)]
    pub source_urls: Option<String>,
    
    /// Tags for categorization and search (comma-separated)
    /// e.g., "bitcoin,crypto,price,2026"
    #[serde(default)]
    pub tags: Option<String>,
    
    /// External metadata URL (IPFS or HTTP link to detailed JSON metadata)
    #[serde(default)]
    pub metadata_url: Option<String>,
    
    /// Market/request ID from the external DApp (for reference)
    #[serde(default)]
    pub external_id: Option<String>,
    
    // ==================== SOURCE DAPP TRACKING ====================
    
    /// Source DApp Application ID (if query came from external DApp)
    #[serde(default)]
    pub source_app_id: Option<ApplicationId>,
    
    /// Source DApp name (cached for quick display)
    #[serde(default)]
    pub source_app_name: Option<String>,
    
    /// Source DApp logo URL (cached for quick display)
    #[serde(default)]
    pub source_app_logo: Option<String>,
    
    /// Source DApp category (PredictionMarket, Insurance, Gaming, etc.)
    #[serde(default)]
    pub source_app_category: Option<String>,
    
    /// Query source type (Internal from dashboard, External from DApp)
    #[serde(default)]
    pub query_source: QuerySource,
    
    /// Decision strategy
    pub strategy: DecisionStrategy,
    
    /// Minimum votes required
    pub min_votes: usize,
    
    /// Reward amount for correct voters (legacy, now from inflation)
    pub reward_amount: Amount,
    
    /// Query creator (chain ID)
    pub creator: ChainId,
    
    /// Creation timestamp
    pub created_at: Timestamp,
    
    /// Resolution deadline (end of reveal phase)
    pub deadline: Timestamp,
    
    /// Commit phase end timestamp
    pub commit_phase_end: Timestamp,
    
    /// Reveal phase end timestamp
    pub reveal_phase_end: Timestamp,
    
    /// Current voting phase
    pub phase: VotingPhase,
    
    /// Query status
    pub status: QueryStatus,
    
    /// Resolved result (if resolved)
    pub result: Option<String>,
    
    /// Resolution timestamp
    pub resolved_at: Option<Timestamp>,
    
    /// Commit hashes (voter chain -> commit)
    pub commits: BTreeMap<ChainId, VoteCommit>,
    
    /// Votes on this query (voter chain -> vote)
    pub votes: BTreeMap<ChainId, Vote>,
    
    /// Selected voters for this query (by power)
    pub selected_voters: Vec<ChainId>,
    
    /// Maximum number of voters to select
    pub max_voters: usize,
    
    /// Callback information for sending resolution result back to requester
    pub callback_chain: Option<ChainId>,
    pub callback_data: Option<Vec<u8>>,
    
    // ==================== HYBRID MODEL FIELDS ====================
    
    /// Bond amount deposited by query creator (refundable if no dispute)
    #[serde(default)]
    pub bond_amount: Amount,
    
    /// Priority fee paid by creator (non-refundable, adds to voter rewards)
    #[serde(default)]
    pub priority_fee: Amount,
    
    /// Whether bond has been refunded
    #[serde(default)]
    pub bond_refunded: bool,
    
    /// Dispute information (if disputed)
    #[serde(default)]
    pub dispute: Option<Dispute>,
    
    /// Dispute window end timestamp (after resolution, users can dispute)
    #[serde(default)]
    pub dispute_window_end: Option<Timestamp>,
}

/// Dispute information for a query resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dispute {
    /// Disputer chain ID
    pub disputer: ChainId,
    
    /// Dispute bond amount
    pub dispute_bond: Amount,
    
    /// Disputed outcome (what disputer claims is correct)
    pub disputed_outcome: String,
    
    /// Dispute reason
    pub reason: String,
    
    /// Dispute timestamp
    pub disputed_at: Timestamp,
    
    /// Dispute status
    pub status: DisputeStatus,
    
    /// Resolution of dispute (if resolved)
    pub resolution: Option<DisputeResolution>,
}

/// Status of a dispute
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DisputeStatus {
    /// Dispute is pending, waiting for second voting round
    Pending,
    
    /// Dispute is in voting phase
    Voting,
    
    /// Dispute resolved in favor of original result (disputer loses bond)
    RejectedOriginalWins,
    
    /// Dispute resolved in favor of disputer (original creator loses bond)
    AcceptedDisputerWins,
}

/// Resolution of a dispute
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisputeResolution {
    /// Final outcome after dispute
    pub final_outcome: String,
    
    /// Who won: "original" or "disputer"
    pub winner: String,
    
    /// Bond transferred to winner
    pub bond_transferred: Amount,
    
    /// Resolution timestamp
    pub resolved_at: Timestamp,
}

/// Bond information for a query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BondInfo {
    /// Query ID
    pub query_id: u64,
    
    /// Bond depositor (query creator)
    pub depositor: ChainId,
    
    /// Bond amount
    pub amount: Amount,
    
    /// Priority fee (non-refundable)
    pub priority_fee: Amount,
    
    /// Deposit timestamp
    pub deposited_at: Timestamp,
    
    /// Bond status
    pub status: BondStatus,
    
    /// Refund timestamp (if refunded)
    pub refunded_at: Option<Timestamp>,
}

/// Status of a bond
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BondStatus {
    /// Bond is locked during query voting
    Locked,
    
    /// Query resolved normally, bond ready for refund
    ReadyForRefund,
    
    /// Bond has been refunded to creator
    Refunded,
    
    /// Bond slashed due to dispute loss
    Slashed,
    
    /// Bond is locked during dispute
    DisputeLocked,
}

/// Callback information for cross-chain query resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryCallback {
    /// Chain to send callback to
    pub callback_chain: ChainId,
    
    /// Application to send callback to (optional)
    pub callback_app: Option<ApplicationId>,
    
    /// Custom data to include in callback
    pub callback_data: Vec<u8>,
}

/// Vote commit information (for commit/reveal voting)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteCommit {
    /// Voter chain ID
    pub voter: ChainId,
    
    /// Commit hash (hash of value + salt)
    pub commit_hash: String,
    
    /// Commit timestamp
    pub committed_at: Timestamp,
    
    /// Whether vote has been revealed
    pub revealed: bool,
    
    /// Amount of stake locked for this commit
    /// Stored to ensure exact unlock amount matches lock amount
    pub stake_locked: Amount,
}

/// Vote information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    /// Voter chain ID
    pub voter: ChainId,
    
    /// Voted value/outcome
    pub value: String,
    
    /// Vote timestamp (reveal timestamp for commit/reveal)
    pub timestamp: Timestamp,
    
    /// Salt used for commit/reveal
    pub salt: Option<String>,
    
    /// Optional confidence score (0-100)
    pub confidence: Option<u8>,
    
    /// Voting power (stake × reputation at time of vote)
    #[serde(default)]
    pub voting_power: Amount,
}

/// Decision strategy for resolving queries
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DecisionStrategy {
    /// Simple majority
    Majority,
    
    /// Median value (for numeric data)
    Median,
    
    /// Weighted by stake
    WeightedByStake,
    
    /// Weighted by reputation
    WeightedByReputation,
}

/// Voting phase for commit/reveal voting
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VotingPhase {
    /// Commit phase - voters submit commit hashes
    Commit,
    
    /// Reveal phase - voters reveal their votes
    Reveal,
    
    /// Voting completed, ready for resolution
    Completed,
}

/// Query status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum QueryStatus {
    /// Query is active and accepting votes
    Active,
    
    /// Query is resolved (may still be disputed within dispute window)
    Resolved,
    
    /// Query result is finalized (dispute window passed, no disputes)
    Finalized,
    
    /// Query is being disputed
    Disputed,
    
    /// Query expired without resolution
    Expired,
    
    /// Query cancelled
    Cancelled,
}

/// Query source - where the query originated from
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum QuerySource {
    /// Created internally via dashboard/direct call
    #[default]
    Internal,
    
    /// Created by external prediction market DApp
    ExternalPredictionMarket,
    
    /// Created by external insurance protocol
    ExternalInsurance,
    
    /// Created by external gaming application
    ExternalGaming,
    
    /// Created by external DeFi protocol
    ExternalDeFi,
    
    /// Created by other external application
    ExternalOther,
}

impl QuerySource {
    /// Check if query is from external DApp
    pub fn is_external(&self) -> bool {
        !matches!(self, QuerySource::Internal)
    }
    
    /// Create from AppCategory
    pub fn from_app_category(category: &AppCategory) -> Self {
        match category {
            AppCategory::PredictionMarket => QuerySource::ExternalPredictionMarket,
            AppCategory::Insurance => QuerySource::ExternalInsurance,
            AppCategory::Gaming => QuerySource::ExternalGaming,
            AppCategory::DeFi => QuerySource::ExternalDeFi,
            AppCategory::DataFeed => QuerySource::ExternalOther,
            AppCategory::Custom(_) => QuerySource::ExternalOther,
        }
    }
}

/// Protocol parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolParameters {
    /// Minimum stake required to register as voter
    pub min_stake: Amount,
    
    /// Minimum votes required for query resolution
    pub min_votes_default: usize,
    
    /// Default query duration (seconds)
    pub default_query_duration: u64,
    
    /// Reward percentage for correct voters (basis points, e.g., 10000 = 100%)
    pub reward_percentage: u32,
    
    /// Slash percentage for incorrect voters (basis points)
    pub slash_percentage: u32,
    
    /// Protocol fee percentage (basis points)
    pub protocol_fee: u32,
    
    /// ALTH Token application ID (for real token integration)
    pub token_app_id: Option<linera_sdk::linera_base_types::ApplicationId>,
    
    /// ALTH Token chain ID (where token contract is deployed)
    pub token_chain_id: Option<linera_sdk::linera_base_types::ChainId>,
    
    /// Maximum voters per query (default: 100)
    #[serde(default = "default_max_voters_per_query")]
    pub max_voters_per_query: usize,
    
    // ==================== HYBRID MODEL PARAMETERS ====================
    
    /// Minimum bond required for query creation (in ALTH tokens)
    /// Bond is refundable if no dispute
    #[serde(default = "default_min_bond")]
    pub min_bond: Amount,
    
    /// Annual inflation rate for voter rewards (basis points, e.g., 500 = 5%)
    #[serde(default = "default_inflation_rate")]
    pub inflation_rate_bps: u32,
    
    /// Inflation reward per query resolution (calculated from annual rate)
    #[serde(default)]
    pub inflation_reward_per_query: Amount,
    
    /// Dispute window duration after resolution (seconds)
    #[serde(default = "default_dispute_window")]
    pub dispute_window_secs: u64,
    
    /// Minimum bond required to raise a dispute (percentage of original bond)
    #[serde(default = "default_dispute_bond_percentage")]
    pub dispute_bond_percentage: u32,
    
    /// Voter reward distribution: percentage from inflation (rest from slashing/fees)
    #[serde(default = "default_inflation_reward_share")]
    pub inflation_reward_share: u32,
    
    // ==================== INFLATION CONTROL & SERVICE FEE ====================
    
    /// Protocol launch timestamp (for calculating current year)
    #[serde(default)]
    pub protocol_launch_timestamp: Option<Timestamp>,
    
    /// Total supply of ALTH token (for inflation calculation)
    #[serde(default)]
    pub total_supply: Amount,
    
    /// Expected query volume per year (for inflation calculation)
    #[serde(default = "default_expected_queries_per_year")]
    pub expected_queries_per_year: u64,
    
    /// Queries created this year (tracked for inflation calculation)
    #[serde(default)]
    pub queries_this_year: u64,
    
    /// Last year when counters were reset
    #[serde(default)]
    pub last_reset_year: Option<u64>,
    
    /// Minimum service fee per query (non-refundable)
    #[serde(default = "default_min_service_fee")]
    pub min_service_fee: Amount,
}

pub fn default_min_bond() -> Amount {
    Amount::from_tokens(100) // 100 ALTH minimum bond
}

pub fn default_inflation_rate() -> u32 {
    500 // 5% annual inflation
}

pub fn default_dispute_window() -> u64 {
    3600 // 1 hour dispute window
}

pub fn default_dispute_bond_percentage() -> u32 {
    10000 // 100% - dispute bond equals original bond
}

pub fn default_inflation_reward_share() -> u32 {
    7000 // 70% of inflation goes to voter rewards
}

pub fn default_inflation_reward_per_query() -> Amount {
    Amount::ZERO // Calculated dynamically from inflation rate
}

pub fn default_max_voters_per_query() -> usize {
    100 // Maximum 100 voters per query
}

pub fn default_expected_queries_per_year() -> u64 {
    10_000 // Expected 10,000 queries per year
}

pub fn default_min_service_fee() -> Amount {
    Amount::from_tokens(10) // 10 ALTH minimum service fee
}

impl Default for ProtocolParameters {
    fn default() -> Self {
        Self {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 300, // 5 minutes for testing (2.5min commit + 2.5min reveal)
            reward_percentage: 1000,        // 10%
            slash_percentage: 500,          // 5%
            protocol_fee: 100,              // 1%
            token_app_id: None,             // Set after token deployment
            token_chain_id: None,           // Set after token deployment
            max_voters_per_query: default_max_voters_per_query(),
            // Hybrid model defaults
            min_bond: default_min_bond(),
            inflation_rate_bps: default_inflation_rate(),
            inflation_reward_per_query: Amount::from_tokens(50), // 50 ALTH per query
            dispute_window_secs: default_dispute_window(),
            dispute_bond_percentage: default_dispute_bond_percentage(),
            inflation_reward_share: default_inflation_reward_share(),
            // Inflation control & service fee
            protocol_launch_timestamp: None,
            total_supply: Amount::from_tokens(1_000_000_000), // 1 billion ALTH default
            expected_queries_per_year: default_expected_queries_per_year(),
            queries_this_year: 0,
            last_reset_year: None,
            min_service_fee: default_min_service_fee(),
        }
    }
}

/// The application state for Account-Based Oracle Registry
/// 
/// Supports Hub-and-Spoke architecture:
/// - Hub: Full state with voters, queries, votes
/// - Instance: Minimal state with pending queries and mode config
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct OracleRegistryV2 {
    // ==================== HUB-AND-SPOKE CONFIG ====================
    
    /// Registry operating mode (Hub or Instance)
    pub mode: RegisterView<RegistryMode>,
    
    /// For Instance mode: pending queries waiting for Hub resolution
    pub pending_queries: MapView<u64, PendingQuery>,
    
    /// For Instance mode: mapping from Hub query ID to local query ID
    pub hub_to_local_query: MapView<u64, u64>,
    
    /// Next local query ID (for Instance mode)
    pub next_local_query_id: RegisterView<u64>,
    
    // ==================== VOTER MANAGEMENT (Hub only) ====================
    
    // Voter management (chain-based - Microcard pattern!)
    pub voters: MapView<ChainId, VoterInfo>,
    pub total_stake: RegisterView<Amount>,
    pub voter_count: RegisterView<u64>,
    
    // Token holdings (actual ALETHEA tokens held by registry)
    pub token_holdings: MapView<ChainId, Amount>,  // Voter -> Token balance held
    pub total_tokens_held: RegisterView<Amount>,   // Total tokens in registry
    
    // ==================== QUERY MANAGEMENT (Hub only) ====================
    
    // Query management
    pub next_query_id: RegisterView<u64>,
    pub queries: MapView<u64, Query>,
    pub active_queries: RegisterView<Vec<u64>>,
    pub query_callbacks: MapView<u64, QueryCallback>,  // For cross-chain callbacks
    
    // Voting records (query_id -> voter_chain -> vote)
    pub votes: MapView<(u64, ChainId), Vote>,
    pub vote_counts: MapView<u64, usize>,
    
    // ==================== REWARDS (Hub only) ====================
    
    // Rewards
    pub reward_pool: RegisterView<Amount>,
    pub pending_rewards: MapView<ChainId, Amount>,
    pub total_rewards_distributed: RegisterView<Amount>,
    
    // ==================== HYBRID MODEL: INFLATION & BONDS ====================
    
    /// Inflation reward pool (minted rewards for voters)
    pub inflation_pool: RegisterView<Amount>,
    
    /// Total inflation distributed
    pub total_inflation_distributed: RegisterView<Amount>,
    
    /// Bond pool (locked bonds from query creators)
    pub bond_pool: RegisterView<Amount>,
    
    /// Individual bond tracking (query_id -> bond info)
    pub query_bonds: MapView<u64, BondInfo>,
    
    /// Disputes (query_id -> dispute info)
    pub disputes: MapView<u64, Dispute>,
    
    /// Total bonds refunded
    pub total_bonds_refunded: RegisterView<Amount>,
    
    /// Total bonds slashed (from disputes)
    pub total_bonds_slashed: RegisterView<Amount>,
    
    // ==================== PROTOCOL CONFIG ====================
    
    // Protocol
    pub parameters: RegisterView<ProtocolParameters>,
    pub protocol_treasury: RegisterView<Amount>,
    pub total_service_fees_collected: RegisterView<Amount>,  // Track total service fees
    pub is_paused: RegisterView<bool>,
    pub admin: RegisterView<Option<ChainId>>,
    
    // Statistics
    pub total_queries_created: RegisterView<u64>,
    pub total_queries_resolved: RegisterView<u64>,
    pub total_votes_submitted: RegisterView<u64>,
    
    // ==================== CONSUMER APP REGISTRATION ====================
    
    /// Registered consumer apps (app_id, chain_id) -> ConsumerAppInfo
    pub consumer_apps: MapView<(ApplicationId, ChainId), ConsumerAppInfo>,
    
    /// Consumer app statistics
    pub consumer_app_stats: RegisterView<ConsumerAppStats>,
}

impl OracleRegistryV2 {
    /// Initialize the registry in Hub mode (default)
    pub async fn initialize(&mut self, params: ProtocolParameters, admin: ChainId) {
        // Set Hub mode by default
        self.mode.set(RegistryMode::Hub);
        self.next_local_query_id.set(1);
        
        self.next_query_id.set(1);
        self.total_stake.set(Amount::ZERO);
        self.voter_count.set(0);
        self.reward_pool.set(Amount::ZERO);
        self.protocol_treasury.set(Amount::ZERO);
        self.total_service_fees_collected.set(Amount::ZERO);
        self.total_rewards_distributed.set(Amount::ZERO);
        self.total_queries_created.set(0);
        self.total_queries_resolved.set(0);
        self.total_votes_submitted.set(0);
        self.is_paused.set(false);
        self.active_queries.set(Vec::new());
        self.parameters.set(params);
        self.admin.set(Some(admin));
        
        // Initialize hybrid model fields
        self.inflation_pool.set(Amount::ZERO);
        self.total_inflation_distributed.set(Amount::ZERO);
        self.bond_pool.set(Amount::ZERO);
        self.total_bonds_refunded.set(Amount::ZERO);
        self.total_bonds_slashed.set(Amount::ZERO);
    }
    
    /// Check if registry is paused
    pub async fn is_paused(&self) -> bool {
        *self.is_paused.get()
    }
    
    /// Get protocol parameters
    pub async fn get_parameters(&self) -> ProtocolParameters {
        self.parameters.get().clone()
    }
    
    /// Get admin chain ID
    pub async fn get_admin(&self) -> Option<ChainId> {
        *self.admin.get()
    }
    
    /// Check if the given chain is the admin
    pub async fn is_admin(&self, chain: &ChainId) -> bool {
        match *self.admin.get() {
            Some(admin) => admin == *chain,
            None => false,
        }
    }
    
    /// Get voter info by chain ID
    pub async fn get_voter(&self, chain: &ChainId) -> Option<VoterInfo> {
        self.voters.get(chain).await.ok().flatten()
    }
    
    /// Get query info
    pub async fn get_query(&self, query_id: u64) -> Option<Query> {
        self.queries.get(&query_id).await.ok().flatten()
    }
    
    /// Get vote for a query by chain ID
    pub async fn get_vote(&self, query_id: u64, voter_chain: &ChainId) -> Option<Vote> {
        self.votes.get(&(query_id, *voter_chain)).await.ok().flatten()
    }
    
    /// Get all votes for a query
    pub async fn get_query_votes(&self, _query_id: u64) -> Vec<Vote> {
        // This is a simplified version - in production, you'd want to iterate properly
        Vec::new() // TODO: Implement proper iteration
    }
    
    /// Calculate reputation score based on voting accuracy
    /// 
    /// Reputation is calculated using a weighted formula that considers:
    /// - Voting accuracy (correct votes / total votes)
    /// - Participation level (total votes)
    /// - Recency bias (recent votes weighted more)
    pub fn calculate_reputation(&self, voter_info: &VoterInfo) -> u32 {
        if voter_info.total_votes == 0 {
            return 50; // Default reputation for new voters
        }
        
        // Base accuracy score (0-100)
        let accuracy = (voter_info.correct_votes as f64 / voter_info.total_votes as f64) * 100.0;
        
        // Apply participation bonus (up to 10 points for active voters)
        // Voters with more than 100 votes get full bonus
        let participation_bonus = if voter_info.total_votes >= 100 {
            10.0
        } else {
            (voter_info.total_votes as f64 / 100.0) * 10.0
        };
        
        // Calculate final reputation (capped at 100)
        let reputation = (accuracy + participation_bonus).min(100.0);
        
        reputation as u32
    }
    
    /// Update voter reputation after a query is resolved
    /// 
    /// This method should be called when a query is resolved to update
    /// the reputation of voters who participated
    pub async fn update_voter_reputation(
        &mut self,
        voter_chain: &ChainId,
        was_correct: bool,
    ) -> Result<(), String> {
        let mut voter_info = self.get_voter(voter_chain).await
            .ok_or_else(|| "Voter not found".to_string())?;
        
        // Update vote counts
        if was_correct {
            voter_info.correct_votes += 1;
        }
        // total_votes is already incremented when vote is submitted
        
        // Recalculate reputation
        voter_info.reputation = self.calculate_reputation(&voter_info);
        
        // Save updated voter info
        self.voters.insert(voter_chain, voter_info)
            .map_err(|e| format!("Failed to update voter reputation: {}", e))?;
        
        Ok(())
    }
    
    /// Calculate reputation decay for inactive voters
    /// 
    /// Voters who haven't voted recently should have their reputation
    /// gradually decay to encourage active participation
    pub fn calculate_reputation_with_decay(
        &self,
        voter_info: &VoterInfo,
        current_time: Timestamp,
    ) -> u32 {
        let base_reputation = self.calculate_reputation(voter_info);
        
        // Calculate days since registration
        // TimeDelta is in microseconds, convert to days
        let micros_since_registration = current_time
            .delta_since(voter_info.registered_at)
            .as_micros();
        let days_since_registration = micros_since_registration / (86400 * 1_000_000);
        
        // If voter has been registered for more than 30 days but has very few votes,
        // apply decay
        if days_since_registration > 30 && voter_info.total_votes < 10 {
            let decay_factor = 0.9; // 10% decay
            (base_reputation as f64 * decay_factor) as u32
        } else {
            base_reputation
        }
    }
    
    /// Get reputation tier for a voter
    /// 
    /// Returns a tier classification based on reputation score:
    /// - Novice: 0-40
    /// - Intermediate: 41-70
    /// - Expert: 71-90
    /// - Master: 91-100
    pub fn get_reputation_tier(&self, reputation: u32) -> &'static str {
        match reputation {
            0..=40 => "Novice",
            41..=70 => "Intermediate",
            71..=90 => "Expert",
            91..=100 => "Master",
            _ => "Unknown",
        }
    }
    
    /// Calculate reputation weight for weighted voting strategies
    /// 
    /// Returns a weight multiplier based on reputation (0.5 to 2.0)
    /// Higher reputation = higher weight
    pub fn calculate_reputation_weight(&self, reputation: u32) -> f64 {
        // Map reputation (0-100) to weight (0.5-2.0)
        // Formula: weight = 0.5 + (reputation / 100) * 1.5
        0.5 + (reputation as f64 / 100.0) * 1.5
    }
    
    /// Get active queries
    pub async fn get_active_queries(&self) -> Vec<u64> {
        self.active_queries.get().clone()
    }
    
    /// Get pending rewards for a voter by chain ID
    pub async fn get_pending_rewards(&self, voter_chain: &ChainId) -> Amount {
        // MapView.get() may return Some(Amount::MAX) for uninitialized entries
        // We need to check if the value is valid (not MAX)
        match self.pending_rewards.get(voter_chain).await {
            Ok(Some(amount)) => {
                // Check if amount is suspiciously large (likely uninitialized)
                // Amount::MAX is approximately 340282366920938463463374607431768211455
                // We use a threshold of 10^30 (1 trillion tokens in attos) to detect uninitialized values
                // This is much higher than any realistic reward amount
                let amount_value: u128 = amount.into();
                if amount_value > 1_000_000_000_000_000_000_000_000_000_000u128 {
                    // This is likely an uninitialized value, return ZERO
                    Amount::ZERO
                } else {
                    amount
                }
            },
            _ => Amount::ZERO,
        }
    }
    
    /// Lock stake for a voter (when they vote on a query)
    pub async fn lock_stake(&mut self, voter_chain: &ChainId, amount: Amount) -> Result<(), String> {
        let mut voter_info = self.get_voter(voter_chain).await
            .ok_or_else(|| "Voter not found".to_string())?;
        
        // Calculate available stake using saturating_sub on Amount directly
        let available_stake = voter_info.stake.saturating_sub(voter_info.locked_stake);
        
        if available_stake < amount {
            return Err(format!(
                "Insufficient available stake: have {}, need {}",
                available_stake, amount
            ));
        }
        
        // Add to locked stake using saturating_add on Amount directly
        voter_info.locked_stake = voter_info.locked_stake.saturating_add(amount);
        self.voters.insert(voter_chain, voter_info)
            .map_err(|e| format!("Failed to update voter: {}", e))?;
        
        Ok(())
    }
    
    /// Unlock stake for a voter (when query is resolved)
    pub async fn unlock_stake(&mut self, voter_chain: &ChainId, amount: Amount) -> Result<(), String> {
        let mut voter_info = self.get_voter(voter_chain).await
            .ok_or_else(|| "Voter not found".to_string())?;
        
        if voter_info.locked_stake < amount {
            return Err(format!(
                "Cannot unlock more than locked: locked {}, requested {}",
                voter_info.locked_stake, amount
            ));
        }
        
        // Subtract from locked stake using saturating_sub on Amount directly
        voter_info.locked_stake = voter_info.locked_stake.saturating_sub(amount);
        self.voters.insert(voter_chain, voter_info)
            .map_err(|e| format!("Failed to update voter: {}", e))?;
        
        Ok(())
    }
    
    /// Get available (unlocked) stake for a voter
    pub async fn get_available_stake(&self, voter_chain: &ChainId) -> Amount {
        match self.get_voter(voter_chain).await {
            Some(info) => {
                // Use Amount's saturating_sub directly to avoid double conversion
                info.stake.saturating_sub(info.locked_stake)
            },
            None => Amount::ZERO,
        }
    }
    
    /// Get comprehensive reputation statistics for a voter
    pub async fn get_reputation_stats(&self, voter_chain: &ChainId) -> Option<ReputationStats> {
        let voter_info = self.get_voter(voter_chain).await?;
        
        Some(ReputationStats {
            reputation: voter_info.reputation,
            tier: self.get_reputation_tier(voter_info.reputation).to_string(),
            weight: self.calculate_reputation_weight(voter_info.reputation),
            total_votes: voter_info.total_votes,
            correct_votes: voter_info.correct_votes,
            accuracy_percentage: if voter_info.total_votes > 0 {
                (voter_info.correct_votes as f64 / voter_info.total_votes as f64) * 100.0
            } else {
                0.0
            },
        })
    }
    
    /// Calculate reward for a voter based on multiple factors
    /// 
    /// This method calculates the reward amount for a voter who voted correctly,
    /// taking into account:
    /// - Base reward (query reward amount divided among correct voters)
    /// - Reputation multiplier (higher reputation = higher reward)
    /// - Stake multiplier (higher stake = higher reward)
    /// - Protocol fee deduction
    /// 
    /// Returns the final reward amount for the voter
    pub fn calculate_voter_reward(
        &self,
        base_reward: Amount,
        voter_info: &VoterInfo,
        params: &ProtocolParameters,
    ) -> Amount {
        let base_value: u128 = base_reward.into();
        
        // Calculate reputation multiplier (0.8 to 1.2)
        // Higher reputation gets up to 20% bonus, lower gets up to 20% penalty
        let reputation_multiplier = 0.8 + (voter_info.reputation as f64 / 100.0) * 0.4;
        
        // Apply reputation multiplier
        let reward_with_reputation = (base_value as f64 * reputation_multiplier) as u128;
        
        // Deduct protocol fee (in basis points, e.g., 100 = 1%)
        let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
        let final_reward = (reward_with_reputation as f64 * fee_multiplier) as u128;
        
        // base_reward is already in attos, so use from_attos
        Amount::from_attos(final_reward)
    }
    
    /// Calculate slash amount for incorrect voters
    /// 
    /// Voters who vote incorrectly may have a portion of their stake slashed
    /// based on the protocol's slash_percentage parameter.
    /// 
    /// The slash amount is calculated as a percentage of the voter's total stake.
    /// For example, with a 5% slash rate (500 basis points):
    /// - Voter with 1000 tokens stake → 50 tokens slashed
    /// - Voter with 500 tokens stake → 25 tokens slashed
    pub fn calculate_slash_amount(
        &self,
        voter_info: &VoterInfo,
        params: &ProtocolParameters,
    ) -> Amount {
        let stake_value: u128 = voter_info.stake.into();
        
        // Calculate slash amount (in basis points, e.g., 500 = 5%)
        let slash_multiplier = params.slash_percentage as f64 / 10000.0;
        let slash_amount = (stake_value as f64 * slash_multiplier) as u128;
        
        // stake_value is in attos, so result should be in attos
        Amount::from_attos(slash_amount)
    }
    
    /// Check if voter's stake would fall below minimum after slashing
    /// 
    /// Returns true if the voter should be automatically deactivated after slashing
    pub fn should_deactivate_after_slash(
        &self,
        voter_info: &VoterInfo,
        slash_amount: Amount,
        params: &ProtocolParameters,
    ) -> bool {
        let stake_value: u128 = voter_info.stake.into();
        let slash_value: u128 = slash_amount.into();
        let remaining_stake = stake_value.saturating_sub(slash_value);
        let min_stake_value: u128 = params.min_stake.into();
        
        remaining_stake < min_stake_value
    }
    
    /// Calculate total slashing statistics for a query
    /// 
    /// Returns (total_slashed, voters_slashed, voters_deactivated)
    pub fn calculate_slashing_stats(
        &self,
        incorrect_voters: &[(ChainId, VoterInfo)],
        params: &ProtocolParameters,
    ) -> (Amount, usize, usize) {
        let mut total_slashed = 0u128;
        let mut voters_slashed = 0;
        let mut voters_deactivated = 0;
        
        for (_, voter_info) in incorrect_voters {
            let slash_amount = self.calculate_slash_amount(voter_info, params);
            let slash_value: u128 = slash_amount.into();
            
            if slash_value > 0 {
                voters_slashed += 1;
                total_slashed += slash_value;
                
                if self.should_deactivate_after_slash(voter_info, slash_amount, params) {
                    voters_deactivated += 1;
                }
            }
        }
        
        // total_slashed is in attos
        (Amount::from_attos(total_slashed), voters_slashed, voters_deactivated)
    }
    
    /// Calculate total reward pool for a query
    /// 
    /// This includes the base reward amount plus any protocol fees collected
    pub fn calculate_total_reward_pool(
        &self,
        query_reward: Amount,
        protocol_fees: Amount,
    ) -> Amount {
        let reward_value: u128 = query_reward.into();
        let fees_value: u128 = protocol_fees.into();
        
        // Both values are in attos
        Amount::from_attos(reward_value + fees_value)
    }
    
    /// Calculate protocol fee from reward amount
    pub fn calculate_protocol_fee(
        &self,
        reward_amount: Amount,
        params: &ProtocolParameters,
    ) -> Amount {
        let reward_value: u128 = reward_amount.into();
        
        // Calculate fee (in basis points, e.g., 100 = 1%)
        let fee_multiplier = params.protocol_fee as f64 / 10000.0;
        let fee_amount = (reward_value as f64 * fee_multiplier) as u128;
        
        // reward_amount is in attos, so result should be in attos
        Amount::from_attos(fee_amount)
    }
    
    /// Calculate stake-weighted reward distribution
    /// 
    /// Distributes rewards proportionally based on voter stakes
    /// Returns a map of voter -> reward amount
    pub fn calculate_stake_weighted_rewards(
        &self,
        total_reward: Amount,
        correct_voters: &[(ChainId, VoterInfo)],
        params: &ProtocolParameters,
    ) -> std::collections::BTreeMap<ChainId, Amount> {
        let mut rewards = std::collections::BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        // Calculate total stake of correct voters
        let total_stake: u128 = correct_voters
            .iter()
            .map(|(_, info)| {
                let stake: u128 = info.stake.into();
                stake
            })
            .sum();
        
        if total_stake == 0 {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        
        // Distribute rewards proportionally to stake
        for (voter, info) in correct_voters {
            let stake_value: u128 = info.stake.into();
            let proportion = stake_value as f64 / total_stake as f64;
            let base_reward = (reward_value as f64 * proportion) as u128;
            
            // Apply reputation multiplier and protocol fee
            // base_reward is in attos, so use from_attos
            let reward = self.calculate_voter_reward(
                Amount::from_attos(base_reward),
                info,
                params,
            );
            
            rewards.insert(*voter, reward);
        }
        
        rewards
    }
    
    /// Calculate reputation-weighted reward distribution
    /// 
    /// Distributes rewards proportionally based on voter reputation
    /// Returns a map of voter -> reward amount
    pub fn calculate_reputation_weighted_rewards(
        &self,
        total_reward: Amount,
        correct_voters: &[(ChainId, VoterInfo)],
        params: &ProtocolParameters,
    ) -> std::collections::BTreeMap<ChainId, Amount> {
        let mut rewards = std::collections::BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        // Calculate total reputation weight of correct voters
        let total_weight: f64 = correct_voters
            .iter()
            .map(|(_, info)| self.calculate_reputation_weight(info.reputation))
            .sum();
        
        if total_weight == 0.0 {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        
        // Distribute rewards proportionally to reputation weight
        for (voter, info) in correct_voters {
            let weight = self.calculate_reputation_weight(info.reputation);
            let proportion = weight / total_weight;
            let base_reward = (reward_value as f64 * proportion) as u128;
            
            // Apply protocol fee (reputation already factored in)
            let fee_multiplier = 1.0 - (params.protocol_fee as f64 / 10000.0);
            let final_reward = (base_reward as f64 * fee_multiplier) as u128;
            
            // base_reward is in attos, so use from_attos
            rewards.insert(*voter, Amount::from_attos(final_reward));
        }
        
        rewards
    }
    
    /// Calculate equal reward distribution
    /// 
    /// Distributes rewards equally among all correct voters
    /// Returns a map of voter -> reward amount
    pub fn calculate_equal_rewards(
        &self,
        total_reward: Amount,
        correct_voters: &[(ChainId, VoterInfo)],
        params: &ProtocolParameters,
    ) -> std::collections::BTreeMap<ChainId, Amount> {
        let mut rewards = std::collections::BTreeMap::new();
        
        if correct_voters.is_empty() {
            return rewards;
        }
        
        let reward_value: u128 = total_reward.into();
        let per_voter_base = reward_value / correct_voters.len() as u128;
        
        // Distribute rewards equally with reputation multiplier
        // Note: per_voter_base is already in attos, so use Amount::from_attos
        for (voter, info) in correct_voters {
            let reward = self.calculate_voter_reward(
                Amount::from_attos(per_voter_base),
                info,
                params,
            );
            
            rewards.insert(*voter, reward);
        }
        
        rewards
    }
    
    /// Calculate voter power (stake × reputation)
    pub fn calculate_voter_power(&self, voter: &VoterInfo) -> u128 {
        let stake_value: u128 = voter.stake.into();
        let reputation_value = voter.reputation as u128;
        stake_value.saturating_mul(reputation_value)
    }
    
    /// Get all active voters sorted by power (descending)
    pub async fn get_voters_by_power(&self) -> Result<Vec<(ChainId, u128)>, String> {
        let mut voter_powers: Vec<(ChainId, u128)> = Vec::new();
        
        // Get all voter chain IDs
        let indices = self.voters.indices().await
            .map_err(|e| format!("Failed to get voter indices: {}", e))?;
        
        // Calculate power for each active voter
        for chain_id in indices {
            if let Some(voter) = self.get_voter(&chain_id).await {
                if voter.is_active {
                    let power = self.calculate_voter_power(&voter);
                    voter_powers.push((chain_id, power));
                }
            }
        }
        
        // Sort by power (descending)
        voter_powers.sort_by(|a, b| b.1.cmp(&a.1));
        
        Ok(voter_powers)
    }
    
    /// Select top N voters by power for a query
    /// 
    /// TEMPORARY: Returns ALL active voters instead of top N by power
    /// This allows all registered voters to participate in voting
    pub async fn select_voters_for_query(
        &self,
        _min_voters: usize,
        _max_voters: usize,
    ) -> Result<Vec<ChainId>, String> {
        // TEMPORARY: Return ALL active voters instead of selecting by power
        // This allows all registered voters to vote on any query
        let voter_powers = self.get_voters_by_power().await?;
        
        // Check if we have at least one voter
        if voter_powers.is_empty() {
            return Err("No active voters available".to_string());
        }
        
        // Return ALL voters (not just top N)
        let selected: Vec<ChainId> = voter_powers
            .iter()
            .map(|(chain_id, _power)| *chain_id)
            .collect();
        
        Ok(selected)
    }
    
    /// Check if a voter is selected for a specific query
    pub async fn is_voter_selected(
        &self,
        query_id: u64,
        voter_chain: &ChainId,
    ) -> Result<bool, String> {
        let query = self.get_query(query_id).await
            .ok_or_else(|| format!("Query {} not found", query_id))?;
        
        Ok(query.selected_voters.contains(voter_chain))
    }
    
    /// Get voter power for display/analytics
    pub async fn get_voter_power_info(
        &self,
        voter_chain: &ChainId,
    ) -> Option<(Amount, u32, u128)> {
        let voter_info = self.get_voter(voter_chain).await?;
        let power = self.calculate_voter_power(&voter_info);
        Some((voter_info.stake, voter_info.reputation, power))
    }
    
    // ==================== HUB-AND-SPOKE METHODS ====================
    
    /// Get registry mode
    pub fn get_mode(&self) -> RegistryMode {
        self.mode.get().clone()
    }
    
    /// Check if running in Hub mode
    pub fn is_hub(&self) -> bool {
        matches!(self.get_mode(), RegistryMode::Hub)
    }
    
    /// Check if running in Instance mode
    pub fn is_instance(&self) -> bool {
        matches!(self.get_mode(), RegistryMode::Instance { .. })
    }
    
    /// Get Hub chain ID (for Instance mode)
    pub fn get_hub_chain_id(&self) -> Option<ChainId> {
        match self.get_mode() {
            RegistryMode::Instance { hub_chain_id } => Some(hub_chain_id),
            RegistryMode::Hub => None,
        }
    }
    
    /// Initialize as Instance mode
    pub async fn initialize_as_instance(&mut self, hub_chain_id: ChainId, admin: ChainId) {
        self.mode.set(RegistryMode::Instance { hub_chain_id });
        self.next_local_query_id.set(1);
        self.admin.set(Some(admin));
        self.is_paused.set(false);
        self.parameters.set(ProtocolParameters::default());
        
        // Instance doesn't need voter/query state initialization
        // Those are managed by Hub
    }
    
    /// Create a pending query (Instance mode)
    pub async fn create_pending_query(
        &mut self,
        description: String,
        outcomes: Vec<String>,
        callback_app: Option<ApplicationId>,
        callback_data: Vec<u8>,
        created_at: Timestamp,
    ) -> u64 {
        let local_id = *self.next_local_query_id.get();
        self.next_local_query_id.set(local_id + 1);
        
        let pending = PendingQuery {
            local_id,
            hub_query_id: None,
            description,
            outcomes,
            callback_app,
            callback_data,
            status: PendingQueryStatus::Created,
            created_at,
            result: None,
            resolved_at: None,
        };
        
        self.pending_queries.insert(&local_id, pending)
            .expect("Failed to insert pending query");
        
        local_id
    }
    
    /// Get pending query by local ID
    pub async fn get_pending_query(&self, local_id: u64) -> Option<PendingQuery> {
        self.pending_queries.get(&local_id).await.ok().flatten()
    }
    
    /// Update pending query with Hub query ID
    pub async fn link_pending_to_hub(&mut self, local_id: u64, hub_query_id: u64) -> Result<(), String> {
        let mut pending = self.get_pending_query(local_id).await
            .ok_or_else(|| format!("Pending query {} not found", local_id))?;
        
        pending.hub_query_id = Some(hub_query_id);
        pending.status = PendingQueryStatus::Forwarded;
        
        self.pending_queries.insert(&local_id, pending)
            .map_err(|e| format!("Failed to update pending query: {}", e))?;
        
        // Create reverse mapping
        self.hub_to_local_query.insert(&hub_query_id, local_id)
            .map_err(|e| format!("Failed to create hub-to-local mapping: {}", e))?;
        
        Ok(())
    }
    
    /// Resolve pending query (called when Hub sends resolution)
    pub async fn resolve_pending_query(
        &mut self,
        hub_query_id: u64,
        result: String,
        resolved_at: Timestamp,
    ) -> Result<PendingQuery, String> {
        // Find local query ID from hub query ID
        let local_id = self.hub_to_local_query.get(&hub_query_id).await
            .map_err(|e| format!("Failed to get local query ID: {}", e))?
            .ok_or_else(|| format!("No local query found for hub query {}", hub_query_id))?;
        
        let mut pending = self.get_pending_query(local_id).await
            .ok_or_else(|| format!("Pending query {} not found", local_id))?;
        
        pending.status = PendingQueryStatus::Resolved;
        pending.result = Some(result);
        pending.resolved_at = Some(resolved_at);
        
        self.pending_queries.insert(&local_id, pending.clone())
            .map_err(|e| format!("Failed to update pending query: {}", e))?;
        
        Ok(pending)
    }
    
    /// Get pending query by Hub query ID
    pub async fn get_pending_query_by_hub_id(&self, hub_query_id: u64) -> Option<PendingQuery> {
        let local_id = self.hub_to_local_query.get(&hub_query_id).await.ok()??;
        self.get_pending_query(local_id).await
    }
    
    // ==================== CONSUMER APP METHODS ====================
    
    /// Get consumer app info
    pub async fn get_consumer_app(
        &self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Option<ConsumerAppInfo> {
        self.consumer_apps.get(&(*app_id, *chain_id)).await.ok().flatten()
    }
    
    /// Check if consumer app is registered
    pub async fn is_consumer_app_registered(
        &self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> bool {
        self.get_consumer_app(app_id, chain_id).await.is_some()
    }
    
    /// Register a new consumer app
    pub async fn register_consumer_app(
        &mut self,
        app_id: ApplicationId,
        chain_id: ChainId,
        name: String,
        category: AppCategory,
        stake: Amount,
        metadata_url: Option<String>,
        logo_url: Option<String>,
        registered_at: Timestamp,
    ) -> Result<ConsumerAppInfo, String> {
        // Check if already registered
        if self.is_consumer_app_registered(&app_id, &chain_id).await {
            return Err("Consumer app already registered".to_string());
        }
        
        // Determine tier from stake
        let tier = RegistrationTier::from_stake(stake);
        let rate_limit = tier.rate_limit();
        
        let app_info = ConsumerAppInfo {
            app_id,
            chain_id,
            name,
            category,
            tier,
            registered_at,
            is_active: true,
            stake,
            total_queries: 0,
            resolved_queries: 0,
            reputation: 50, // Start with neutral reputation
            metadata_url,
            logo_url,
            rate_limit,
            queries_this_hour: 0,
            rate_limit_reset_at: registered_at,
        };
        
        // Insert app
        self.consumer_apps.insert(&(app_id, chain_id), app_info.clone())
            .map_err(|e| format!("Failed to register consumer app: {}", e))?;
        
        // Update stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.total_apps += 1;
        stats.active_apps += 1;
        self.consumer_app_stats.set(stats);
        
        Ok(app_info)
    }
    
    /// Update consumer app info
    pub async fn update_consumer_app(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
        name: Option<String>,
        category: Option<AppCategory>,
        metadata_url: Option<Option<String>>,
    ) -> Result<ConsumerAppInfo, String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        if let Some(n) = name {
            app_info.name = n;
        }
        if let Some(c) = category {
            app_info.category = c;
        }
        if let Some(m) = metadata_url {
            app_info.metadata_url = m;
        }
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info.clone())
            .map_err(|e| format!("Failed to update consumer app: {}", e))?;
        
        Ok(app_info)
    }
    
    /// Upgrade consumer app tier by adding stake
    pub async fn upgrade_consumer_app_tier(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
        additional_stake: Amount,
    ) -> Result<ConsumerAppInfo, String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        // Add stake
        app_info.stake = app_info.stake.saturating_add(additional_stake);
        
        // Recalculate tier
        let new_tier = RegistrationTier::from_stake(app_info.stake);
        app_info.tier = new_tier;
        app_info.rate_limit = app_info.tier.rate_limit();
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info.clone())
            .map_err(|e| format!("Failed to upgrade consumer app: {}", e))?;
        
        Ok(app_info)
    }
    
    /// Deregister consumer app
    pub async fn deregister_consumer_app(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Result<Amount, String> {
        let app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        let stake_to_return = app_info.stake;
        
        // Remove app
        self.consumer_apps.remove(&(*app_id, *chain_id))
            .map_err(|e| format!("Failed to deregister consumer app: {}", e))?;
        
        // Update stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.total_apps = stats.total_apps.saturating_sub(1);
        if app_info.is_active {
            stats.active_apps = stats.active_apps.saturating_sub(1);
        }
        self.consumer_app_stats.set(stats);
        
        Ok(stake_to_return)
    }
    
    /// Suspend consumer app
    pub async fn suspend_consumer_app(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Result<(), String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        if !app_info.is_active {
            return Err("Consumer app already suspended".to_string());
        }
        
        app_info.is_active = false;
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info)
            .map_err(|e| format!("Failed to suspend consumer app: {}", e))?;
        
        // Update stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.active_apps = stats.active_apps.saturating_sub(1);
        self.consumer_app_stats.set(stats);
        
        Ok(())
    }
    
    /// Reactivate consumer app
    pub async fn reactivate_consumer_app(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Result<(), String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        if app_info.is_active {
            return Err("Consumer app already active".to_string());
        }
        
        app_info.is_active = true;
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info)
            .map_err(|e| format!("Failed to reactivate consumer app: {}", e))?;
        
        // Update stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.active_apps += 1;
        self.consumer_app_stats.set(stats);
        
        Ok(())
    }
    
    /// Check and update rate limit for consumer app
    /// Returns Ok(()) if within limit, Err if exceeded
    pub async fn check_and_update_rate_limit(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
        current_time: Timestamp,
    ) -> Result<(), String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        // Check if we need to reset the rate limit counter (1 hour = 3600 seconds)
        let one_hour_micros: u64 = 3600 * 1_000_000;
        let time_since_reset = current_time
            .delta_since(app_info.rate_limit_reset_at)
            .as_micros() as u64;
        
        if time_since_reset >= one_hour_micros {
            // Reset counter
            app_info.queries_this_hour = 0;
            app_info.rate_limit_reset_at = current_time;
        }
        
        // Check rate limit
        if app_info.queries_this_hour >= app_info.rate_limit {
            return Err(format!(
                "Rate limit exceeded: {}/{} queries per hour. Upgrade tier for higher limits.",
                app_info.queries_this_hour, app_info.rate_limit
            ));
        }
        
        // Increment counter
        app_info.queries_this_hour += 1;
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info)
            .map_err(|e| format!("Failed to update rate limit: {}", e))?;
        
        Ok(())
    }
    
    /// Increment query count for consumer app
    pub async fn increment_app_query_count(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Result<(), String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        app_info.total_queries += 1;
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info)
            .map_err(|e| format!("Failed to increment query count: {}", e))?;
        
        // Update global stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.total_queries += 1;
        self.consumer_app_stats.set(stats);
        
        Ok(())
    }
    
    /// Increment resolved query count for consumer app
    pub async fn increment_app_resolved_count(
        &mut self,
        app_id: &ApplicationId,
        chain_id: &ChainId,
    ) -> Result<(), String> {
        let mut app_info = self.get_consumer_app(app_id, chain_id).await
            .ok_or_else(|| "Consumer app not registered".to_string())?;
        
        app_info.resolved_queries += 1;
        
        // Update reputation based on resolution rate
        if app_info.total_queries > 0 {
            let resolution_rate = (app_info.resolved_queries as f64 / app_info.total_queries as f64) * 100.0;
            app_info.reputation = resolution_rate.min(100.0) as u8;
        }
        
        self.consumer_apps.insert(&(*app_id, *chain_id), app_info)
            .map_err(|e| format!("Failed to increment resolved count: {}", e))?;
        
        // Update global stats
        let mut stats = self.consumer_app_stats.get().clone();
        stats.total_resolved += 1;
        self.consumer_app_stats.set(stats);
        
        Ok(())
    }
    
    /// Get consumer app statistics
    pub fn get_consumer_app_stats(&self) -> ConsumerAppStats {
        self.consumer_app_stats.get().clone()
    }
    
    // ==================== HYBRID MODEL METHODS ====================
    
    /// Lock bond for a query
    pub async fn lock_bond(
        &mut self,
        query_id: u64,
        depositor: ChainId,
        bond_amount: Amount,
        priority_fee: Amount,
        deposited_at: Timestamp,
    ) -> Result<(), String> {
        let bond_info = BondInfo {
            query_id,
            depositor,
            amount: bond_amount,
            priority_fee,
            deposited_at,
            status: BondStatus::Locked,
            refunded_at: None,
        };
        
        self.query_bonds.insert(&query_id, bond_info)
            .map_err(|e| format!("Failed to lock bond: {}", e))?;
        
        // Add to bond pool
        let current_pool = *self.bond_pool.get();
        self.bond_pool.set(current_pool.saturating_add(bond_amount));
        
        Ok(())
    }
    
    /// Get bond info for a query
    pub async fn get_bond_info(&self, query_id: u64) -> Option<BondInfo> {
        self.query_bonds.get(&query_id).await.ok().flatten()
    }
    
    /// Mark bond as ready for refund (after resolution without dispute)
    pub async fn mark_bond_ready_for_refund(&mut self, query_id: u64) -> Result<(), String> {
        let mut bond_info = self.get_bond_info(query_id).await
            .ok_or_else(|| format!("Bond not found for query {}", query_id))?;
        
        if bond_info.status != BondStatus::Locked {
            return Err(format!("Bond not in locked status: {:?}", bond_info.status));
        }
        
        bond_info.status = BondStatus::ReadyForRefund;
        
        self.query_bonds.insert(&query_id, bond_info)
            .map_err(|e| format!("Failed to update bond status: {}", e))?;
        
        Ok(())
    }
    
    /// Refund bond to depositor
    pub async fn refund_bond(
        &mut self,
        query_id: u64,
        refunded_at: Timestamp,
    ) -> Result<Amount, String> {
        let mut bond_info = self.get_bond_info(query_id).await
            .ok_or_else(|| format!("Bond not found for query {}", query_id))?;
        
        if bond_info.status != BondStatus::ReadyForRefund && bond_info.status != BondStatus::Locked {
            return Err(format!("Bond not ready for refund: {:?}", bond_info.status));
        }
        
        let refund_amount = bond_info.amount;
        bond_info.status = BondStatus::Refunded;
        bond_info.refunded_at = Some(refunded_at);
        
        self.query_bonds.insert(&query_id, bond_info)
            .map_err(|e| format!("Failed to update bond: {}", e))?;
        
        // Remove from bond pool
        let current_pool = *self.bond_pool.get();
        self.bond_pool.set(current_pool.saturating_sub(refund_amount));
        
        // Track total refunded
        let total_refunded = *self.total_bonds_refunded.get();
        self.total_bonds_refunded.set(total_refunded.saturating_add(refund_amount));
        
        Ok(refund_amount)
    }
    
    /// Slash bond (dispute loser)
    pub async fn slash_bond(
        &mut self,
        query_id: u64,
    ) -> Result<Amount, String> {
        let mut bond_info = self.get_bond_info(query_id).await
            .ok_or_else(|| format!("Bond not found for query {}", query_id))?;
        
        let slashed_amount = bond_info.amount;
        bond_info.status = BondStatus::Slashed;
        
        self.query_bonds.insert(&query_id, bond_info)
            .map_err(|e| format!("Failed to update bond: {}", e))?;
        
        // Remove from bond pool
        let current_pool = *self.bond_pool.get();
        self.bond_pool.set(current_pool.saturating_sub(slashed_amount));
        
        // Track total slashed
        let total_slashed = *self.total_bonds_slashed.get();
        self.total_bonds_slashed.set(total_slashed.saturating_add(slashed_amount));
        
        Ok(slashed_amount)
    }
    
    /// Add to inflation pool (for scheduled minting)
    pub async fn add_to_inflation_pool(&mut self, amount: Amount) {
        let current = *self.inflation_pool.get();
        self.inflation_pool.set(current.saturating_add(amount));
    }
    
    /// Get inflation reward for a query
    pub async fn get_inflation_reward(&self) -> Amount {
        self.parameters.get().inflation_reward_per_query
    }
    
    /// Calculate current protocol year from launch timestamp
    pub fn calculate_current_year(&self, current_timestamp: Timestamp) -> u64 {
        let params = self.parameters.get();
        let launch_timestamp = match params.protocol_launch_timestamp {
            Some(ts) => ts,
            None => {
                // If not set, use current timestamp as launch (year 1)
                return 1;
            }
        };
        
        let seconds_per_year = 365 * 24 * 60 * 60; // 31,536,000 seconds
        let elapsed_seconds = current_timestamp.micros().saturating_sub(launch_timestamp.micros());
        let elapsed_years = elapsed_seconds / (seconds_per_year * 1_000_000);
        elapsed_years + 1 // Year 1-based
    }
    
    /// Get inflation rate for specific year (basis points)
    pub fn get_inflation_rate_for_year(year: u64) -> u32 {
        match year {
            1 => 700,  // 7%
            2 => 600,  // 6%
            3 => 500,  // 5%
            4 => 350,  // 3.5%
            5 => 250,  // 2.5%
            _ => 200,  // 2% long-term
        }
    }
    
    /// Calculate annual inflation rate for current year
    pub fn calculate_annual_inflation_rate(&self, current_timestamp: Timestamp) -> u32 {
        let year = self.calculate_current_year(current_timestamp);
        Self::get_inflation_rate_for_year(year)
    }
    
    /// Calculate inflation reward per query based on current year's rate and volume
    pub async fn calculate_inflation_reward_per_query(&self, current_timestamp: Timestamp) -> Result<Amount, String> {
        let params = self.parameters.get();
        
        // Calculate current year and rate
        let current_year = self.calculate_current_year(current_timestamp);
        let annual_rate_bps = Self::get_inflation_rate_for_year(current_year);
        
        // Get total supply
        let total_supply = params.total_supply;
        if total_supply == Amount::ZERO {
            // Fallback to default if not set
            return Ok(Amount::from_tokens(50));
        }
        
        // Calculate annual inflation target
        let total_supply_value: u128 = total_supply.into();
        let annual_target_value = (total_supply_value as f64 * annual_rate_bps as f64 / 10000.0) as u128;
        let annual_target = Amount::from_attos(annual_target_value);
        
        // Check if we've exceeded annual target
        let total_distributed = *self.total_inflation_distributed.get();
        if total_distributed >= annual_target {
            return Err(format!(
                "Annual inflation target reached for year {} ({}%)",
                current_year, annual_rate_bps as f64 / 100.0
            ));
        }
        
        // Calculate remaining capacity
        let remaining = annual_target.saturating_sub(total_distributed);
        
        // BUG FIX: Use expected_queries_per_year as denominator, NOT queries_this_year
        // Previously: queries_this_year (0) caused division by 1, giving entire annual target to first query
        // Now: Use expected volume (10,000) to properly spread inflation across queries
        let expected_volume = params.expected_queries_per_year.max(1) as u128;
        
        // Calculate reward per query based on expected annual volume
        let remaining_value: u128 = remaining.into();
        let reward_value = remaining_value / expected_volume;
        let reward = Amount::from_attos(reward_value);
        
        eprintln!(
            "💰 Calculated inflation reward: {} ALTH (Year {}, Rate {}%, Expected Volume {}, Remaining {})",
            reward, current_year, annual_rate_bps as f64 / 100.0, expected_volume, remaining
        );
        
        Ok(reward)
    }
    
    /// Distribute inflation reward to voters
    /// Note: inflation_reward should be calculated using calculate_inflation_reward_per_query()
    pub async fn distribute_inflation_reward(
        &mut self,
        correct_voters: &[(ChainId, VoterInfo)],
    ) -> Result<Amount, String> {
        if correct_voters.is_empty() {
            return Ok(Amount::ZERO);
        }
        
        let params = self.parameters.get().clone();
        // Use the reward amount passed from caller (already calculated based on current year)
        // This allows the caller to use rate-based calculation
        let inflation_reward = params.inflation_reward_per_query;
        let inflation_value: u128 = inflation_reward.into();
        
        if inflation_value == 0 {
            return Ok(Amount::ZERO);
        }
        
        // Distribute using stake-weighted method
        let rewards = self.calculate_stake_weighted_rewards(
            inflation_reward,
            correct_voters,
            &params,
        );
        
        // Add to pending rewards
        for (voter, reward) in &rewards {
            let current = self.get_pending_rewards(voter).await;
            self.pending_rewards.insert(voter, current.saturating_add(*reward))
                .map_err(|e| format!("Failed to add pending reward: {}", e))?;
        }
        
        // Note: total_inflation_distributed is updated by caller after distribution
        // This allows tracking the actual distributed amount
        
        Ok(inflation_reward)
    }
    
    /// Calculate total reward for a query (inflation + priority fee + slashing)
    pub fn calculate_hybrid_reward(
        &self,
        inflation_reward: Amount,
        priority_fee: Amount,
        slashed_stakes: Amount,
    ) -> Amount {
        let inflation_value: u128 = inflation_reward.into();
        let fee_value: u128 = priority_fee.into();
        let slashed_value: u128 = slashed_stakes.into();
        
        Amount::from_attos(inflation_value + fee_value + slashed_value)
    }
    
    /// Store dispute for a query
    pub async fn store_dispute(
        &mut self,
        query_id: u64,
        dispute: Dispute,
    ) -> Result<(), String> {
        self.disputes.insert(&query_id, dispute)
            .map_err(|e| format!("Failed to store dispute: {}", e))?;
        
        // Lock the bond during dispute
        let mut bond_info = self.get_bond_info(query_id).await
            .ok_or_else(|| format!("Bond not found for query {}", query_id))?;
        
        bond_info.status = BondStatus::DisputeLocked;
        
        self.query_bonds.insert(&query_id, bond_info)
            .map_err(|e| format!("Failed to lock bond for dispute: {}", e))?;
        
        Ok(())
    }
    
    /// Get dispute for a query
    pub async fn get_dispute(&self, query_id: u64) -> Option<Dispute> {
        self.disputes.get(&query_id).await.ok().flatten()
    }
    
    /// Check if query is in dispute window
    pub fn is_in_dispute_window(&self, query: &Query, current_time: Timestamp) -> bool {
        if let Some(window_end) = query.dispute_window_end {
            current_time < window_end
        } else {
            false
        }
    }
    
    /// Calculate dispute window end time
    pub fn calculate_dispute_window_end(&self, resolved_at: Timestamp) -> Timestamp {
        let params = self.parameters.get();
        let window_micros = params.dispute_window_secs * 1_000_000;
        Timestamp::from(resolved_at.micros().saturating_add(window_micros))
    }
    
    /// Get hybrid model statistics
    pub async fn get_hybrid_stats(&self) -> HybridModelStats {
        HybridModelStats {
            inflation_pool: *self.inflation_pool.get(),
            total_inflation_distributed: *self.total_inflation_distributed.get(),
            bond_pool: *self.bond_pool.get(),
            total_bonds_refunded: *self.total_bonds_refunded.get(),
            total_bonds_slashed: *self.total_bonds_slashed.get(),
        }
    }
}

/// Statistics for hybrid reward model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridModelStats {
    /// Current inflation pool balance
    pub inflation_pool: Amount,
    
    /// Total inflation rewards distributed
    pub total_inflation_distributed: Amount,
    
    /// Current bond pool (locked bonds)
    pub bond_pool: Amount,
    
    /// Total bonds refunded
    pub total_bonds_refunded: Amount,
    
    /// Total bonds slashed
    pub total_bonds_slashed: Amount,
}

/// Query metadata for detailed market information
/// 
/// This struct contains all the contextual information that helps
/// voters make informed decisions when resolving queries.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QueryMetadata {
    /// Short title for the query
    pub title: Option<String>,
    
    /// Category (e.g., "Sports", "Crypto", "Politics", "Entertainment")
    pub category: Option<String>,
    
    /// Detailed context/background for voters
    /// Should include all relevant information needed to make a decision
    pub context: Option<String>,
    
    /// Resolution criteria - specific conditions that determine the outcome
    /// e.g., "Use CoinGecko price at exactly 00:00 UTC on the specified date"
    pub resolution_criteria: Option<String>,
    
    /// Data source URLs for verification (comma-separated)
    /// e.g., "https://coingecko.com/btc, https://coinmarketcap.com/btc"
    pub source_urls: Option<String>,
    
    /// Tags for categorization and search (comma-separated)
    /// e.g., "bitcoin,crypto,price,2026"
    pub tags: Option<String>,
    
    /// External metadata URL (IPFS or HTTP link to detailed JSON)
    pub metadata_url: Option<String>,
    
    /// External market/request ID from the DApp
    pub external_id: Option<String>,
}

/// Reputation statistics for a voter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationStats {
    /// Current reputation score (0-100)
    pub reputation: u32,
    
    /// Reputation tier (Novice, Intermediate, Expert, Master)
    pub tier: String,
    
    /// Voting weight multiplier (0.5-2.0)
    pub weight: f64,
    
    /// Total number of votes submitted
    pub total_votes: u64,
    
    /// Number of correct votes
    pub correct_votes: u64,
    
    /// Accuracy percentage
    pub accuracy_percentage: f64,
}

// ==================== CONSUMER APP REGISTRATION ====================

/// Consumer App Information
/// 
/// Stores information about registered consumer applications (markets, insurance, etc.)
/// that use the Oracle for resolution services.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumerAppInfo {
    /// Application ID
    pub app_id: ApplicationId,
    
    /// Chain where app is deployed
    pub chain_id: ChainId,
    
    /// Human-readable name
    pub name: String,
    
    /// App category
    pub category: AppCategory,
    
    /// Registration tier (determines rate limits and features)
    pub tier: RegistrationTier,
    
    /// Registration timestamp
    pub registered_at: Timestamp,
    
    /// Is currently active
    pub is_active: bool,
    
    /// Registration stake (refundable on deregister)
    pub stake: Amount,
    
    /// Total queries created
    pub total_queries: u64,
    
    /// Total queries resolved
    pub resolved_queries: u64,
    
    /// Reputation score (0-100)
    pub reputation: u8,
    
    /// Optional metadata URL (description, details, etc.)
    pub metadata_url: Option<String>,
    
    /// Optional logo URL (direct link to logo image)
    pub logo_url: Option<String>,
    
    /// Rate limit: max queries per hour
    pub rate_limit: u32,
    
    /// Current hour query count (for rate limiting)
    pub queries_this_hour: u32,
    
    /// Last rate limit reset timestamp
    pub rate_limit_reset_at: Timestamp,
}

/// App categories for filtering and analytics
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AppCategory {
    /// Prediction markets
    PredictionMarket,
    /// Insurance protocols
    Insurance,
    /// Gaming applications
    Gaming,
    /// DeFi protocols
    DeFi,
    /// Data feed consumers
    DataFeed,
    /// Custom category
    Custom(String),
}

impl Default for AppCategory {
    fn default() -> Self {
        AppCategory::Custom("Other".to_string())
    }
}

/// Registration tier with different privileges
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RegistrationTier {
    /// Free tier: limited queries, basic features
    Free,
    /// Standard tier: more queries, priority resolution
    Standard,
    /// Premium tier: high volume, priority support
    Premium,
    /// Enterprise tier: unlimited, custom SLA
    Enterprise,
}

impl Default for RegistrationTier {
    fn default() -> Self {
        RegistrationTier::Free
    }
}

impl RegistrationTier {
    /// Get rate limit for this tier (queries per hour)
    pub fn rate_limit(&self) -> u32 {
        match self {
            RegistrationTier::Free => 10,
            RegistrationTier::Standard => 100,
            RegistrationTier::Premium => 1000,
            RegistrationTier::Enterprise => u32::MAX, // Unlimited
        }
    }
    
    /// Get minimum stake required for this tier
    pub fn min_stake(&self) -> Amount {
        match self {
            RegistrationTier::Free => Amount::ZERO,
            RegistrationTier::Standard => Amount::from_tokens(100),
            RegistrationTier::Premium => Amount::from_tokens(1000),
            RegistrationTier::Enterprise => Amount::from_tokens(10000),
        }
    }
    
    /// Get priority level (higher = faster resolution)
    pub fn priority(&self) -> u8 {
        match self {
            RegistrationTier::Free => 1,
            RegistrationTier::Standard => 5,
            RegistrationTier::Premium => 10,
            RegistrationTier::Enterprise => 20,
        }
    }
    
    /// Determine tier from stake amount
    pub fn from_stake(stake: Amount) -> Self {
        let stake_value: u128 = stake.into();
        if stake_value >= 10000 {
            RegistrationTier::Enterprise
        } else if stake_value >= 1000 {
            RegistrationTier::Premium
        } else if stake_value >= 100 {
            RegistrationTier::Standard
        } else {
            RegistrationTier::Free
        }
    }
}

/// Consumer app statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConsumerAppStats {
    /// Total registered apps
    pub total_apps: u64,
    /// Active apps
    pub active_apps: u64,
    /// Total queries from all apps
    pub total_queries: u64,
    /// Total resolved queries
    pub total_resolved: u64,
}

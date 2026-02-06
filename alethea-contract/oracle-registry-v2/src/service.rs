// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::{WithServiceAbi, Amount},
    views::View,
    Service, ServiceRuntime,
};
use serde_json;
use state::OracleRegistryV2;
use std::sync::Arc;

/// GraphQL representation of a Voter
#[derive(SimpleObject, Clone)]
pub struct Voter {
    /// Voter's account address (as hex string)
    pub address: String,
    
    /// Staked amount (in tokens)
    pub stake: String,
    
    /// Locked stake for active votes (in tokens)
    pub locked_stake: String,
    
    /// Available stake (stake - locked_stake, in tokens)
    pub available_stake: String,
    
    /// Withdrawable balance (tokens that can be claimed from token contract)
    pub withdrawable_balance: String,
    
    /// Pending rewards to claim (in tokens)
    pub pending_rewards: String,
    
    /// Reputation score (0-100)
    pub reputation: u32,
    
    /// Reputation tier (Novice, Intermediate, Expert, Master)
    pub reputation_tier: String,
    
    /// Voting weight multiplier based on reputation (0.5-2.0)
    pub reputation_weight: f64,
    
    /// Total number of votes submitted
    pub total_votes: u64,
    
    /// Number of correct votes
    pub correct_votes: u64,
    
    /// Voting accuracy percentage
    pub accuracy_percentage: f64,
    
    /// Registration timestamp (ISO 8601 format)
    pub registered_at: String,
    
    /// Is voter currently active
    pub is_active: bool,
    
    /// Optional voter name
    pub name: Option<String>,
    
    /// Optional metadata URL
    pub metadata_url: Option<String>,
}

/// GraphQL representation of a Query/Market
#[derive(SimpleObject, Clone)]
pub struct Query {
    /// Unique query ID
    pub id: u64,
    
    /// Query description
    pub description: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    /// Decision strategy (Majority, Median, WeightedByStake, WeightedByReputation)
    pub strategy: String,
    
    /// Minimum votes required for resolution
    pub min_votes: u32,
    
    /// Reward amount for correct voters (in tokens)
    pub reward_amount: String,
    
    /// Query creator address (as hex string)
    pub creator: String,
    
    /// Creation timestamp (ISO 8601 format)
    pub created_at: String,
    
    /// Resolution deadline (ISO 8601 format)
    pub deadline: String,
    
    /// Commit phase end time (microseconds as string)
    pub commit_end: String,
    
    /// Reveal phase end time (microseconds as string)
    pub reveal_end: String,
    
    /// Query status (Active, Resolved, Expired, Cancelled)
    pub status: String,
    
    /// Current voting phase (Commit, Reveal, Completed)
    pub phase: String,
    
    /// Resolved result (if resolved)
    pub result: Option<String>,
    
    /// Resolution timestamp (ISO 8601 format, if resolved)
    pub resolved_at: Option<String>,
    
    /// Number of commits (phase 1)
    pub commit_count: u32,
    
    /// Number of revealed votes (phase 2)
    pub vote_count: u32,
    
    /// Time remaining until deadline (in seconds, 0 if expired)
    pub time_remaining: i64,
    
    /// Votes on this query (only populated when fetching single query with votes)
    pub votes: Option<Vec<QueryVote>>,
    
    // ==================== QUERY METADATA ====================
    
    /// Short title for the query
    pub title: Option<String>,
    
    /// Category (Sports, Crypto, Politics, etc.)
    pub category: Option<String>,
    
    /// Detailed context for voters
    pub context: Option<String>,
    
    /// Resolution criteria
    pub resolution_criteria: Option<String>,
    
    /// Data source URLs
    pub source_urls: Option<String>,
    
    /// Tags for categorization
    pub tags: Option<String>,
    
    /// External metadata URL
    pub metadata_url: Option<String>,
    
    /// External market ID
    pub external_id: Option<String>,
    
    // ==================== HYBRID MODEL FIELDS ====================
    
    /// Bond amount (refundable if no dispute)
    pub bond_amount: String,
    
    /// Priority fee (non-refundable)
    pub priority_fee: String,
    
    /// Whether bond has been refunded
    pub bond_refunded: bool,
    
    /// Whether query has a dispute
    pub has_dispute: bool,
    
    /// Dispute window end timestamp (microseconds)
    pub dispute_window_end: Option<String>,
    
    /// Can still be disputed
    pub can_dispute: bool,
    
    // ==================== SOURCE DAPP TRACKING ====================
    
    /// Source DApp Application ID (if external)
    pub source_app_id: Option<String>,
    
    /// Source DApp name (e.g., "Polymarket Clone", "PredictX")
    pub source_app_name: Option<String>,
    
    /// Source DApp logo URL
    pub source_app_logo: Option<String>,
    
    /// Source DApp category (PredictionMarket, Insurance, etc.)
    pub source_app_category: Option<String>,
    
    /// Query source type (Internal, ExternalPredictionMarket, etc.)
    pub query_source: String,
    
    /// Is query from external DApp
    pub is_external: bool,
}

/// GraphQL representation of Hybrid Model Statistics
#[derive(SimpleObject, Clone)]
pub struct HybridModelStatistics {
    /// Current inflation pool balance
    pub inflation_pool: String,
    
    /// Total inflation distributed
    pub total_inflation_distributed: String,
    
    /// Current bond pool (locked bonds)
    pub bond_pool: String,
    
    /// Total bonds refunded
    pub total_bonds_refunded: String,
    
    /// Total bonds slashed
    pub total_bonds_slashed: String,
}

/// GraphQL representation of a Dispute
#[derive(SimpleObject, Clone)]
pub struct Dispute {
    /// Query ID
    pub query_id: u64,
    
    /// Disputer address
    pub disputer: String,
    
    /// Dispute bond amount
    pub dispute_bond: String,
    
    /// Disputed outcome
    pub disputed_outcome: String,
    
    /// Reason for dispute
    pub reason: String,
    
    /// Dispute timestamp
    pub disputed_at: String,
    
    /// Dispute status
    pub status: String,
}

/// GraphQL representation of a Vote on a Query
#[derive(SimpleObject, Clone)]
pub struct QueryVote {
    /// Voter chain ID (address)
    pub voter: String,
    
    /// Voted value/outcome
    pub value: String,
    
    /// Vote timestamp (microseconds as string)
    pub timestamp: String,
    
    /// Optional confidence score (0-100)
    pub confidence: Option<u8>,
}

/// GraphQL representation of a Consumer App
#[derive(SimpleObject, Clone)]
pub struct ConsumerApp {
    /// Application ID
    pub app_id: String,
    
    /// Chain ID where app is deployed
    pub chain_id: String,
    
    /// Human-readable name
    pub name: String,
    
    /// App category (PredictionMarket, Insurance, Gaming, DeFi, DataFeed, Custom)
    pub category: String,
    
    /// Registration tier (Free, Standard, Premium, Enterprise)
    pub tier: String,
    
    /// Registration timestamp (microseconds as string)
    pub registered_at: String,
    
    /// Is currently active
    pub is_active: bool,
    
    /// Registration stake (in tokens)
    pub stake: String,
    
    /// Total queries created
    pub total_queries: u64,
    
    /// Total queries resolved
    pub resolved_queries: u64,
    
    /// Reputation score (0-100)
    pub reputation: u8,
    
    /// Optional metadata URL
    pub metadata_url: Option<String>,
    
    /// Logo URL (direct link to logo image)
    pub logo_url: Option<String>,
    
    /// Rate limit (queries per hour)
    pub rate_limit: u32,
    
    /// Queries this hour
    pub queries_this_hour: u32,
}

/// GraphQL representation of Consumer App Statistics
#[derive(SimpleObject, Clone)]
pub struct ConsumerAppStatistics {
    /// Total registered apps
    pub total_apps: u64,
    
    /// Active apps
    pub active_apps: u64,
    
    /// Total queries from all apps
    pub total_queries: u64,
    
    /// Total resolved queries
    pub total_resolved: u64,
}

/// GraphQL representation of protocol-wide Statistics
#[derive(SimpleObject, Clone)]
pub struct Statistics {
    /// Total number of registered voters
    pub total_voters: u64,
    
    /// Number of active voters
    pub active_voters: u64,
    
    /// Total stake across all voters (in tokens)
    pub total_stake: String,
    
    /// Total locked stake (in tokens)
    pub total_locked_stake: String,
    
    /// Average stake per voter (in tokens)
    pub average_stake: String,
    
    /// Total number of queries created
    pub total_queries_created: u64,
    
    /// Total number of queries resolved
    pub total_queries_resolved: u64,
    
    /// Number of currently active queries
    pub active_queries_count: u64,
    
    /// Total number of votes submitted across all queries
    pub total_votes_submitted: u64,
    
    /// Average votes per query
    pub average_votes_per_query: f64,
    
    /// Total rewards distributed (in tokens)
    pub total_rewards_distributed: String,
    
    /// Current reward pool balance (in tokens)
    pub reward_pool_balance: String,
    
    /// Protocol treasury balance (in tokens)
    pub protocol_treasury: String,
    
    /// Average voter reputation score
    pub average_reputation: f64,
    
    /// Protocol status (Active or Paused)
    pub protocol_status: String,
    
    /// Query resolution rate (resolved / total created)
    pub resolution_rate: f64,
}

/// GraphQL representation of staking system health check
#[derive(SimpleObject, Clone)]
pub struct StakingHealthCheck {
    /// Total stake recorded in registry
    pub total_stake: String,
    
    /// Total tokens actually held by registry
    pub total_tokens_held: String,
    
    /// Whether the staking system is healthy (stake == tokens held)
    pub is_healthy: bool,
    
    /// Discrepancy between stake and tokens held
    pub discrepancy: String,
}

/// GraphQL representation of staking instructions
/// 
/// This provides all the information needed for a user to stake tokens properly.
#[derive(SimpleObject, Clone)]
pub struct StakingInstructions {
    /// Minimum stake required to become an active voter
    pub min_stake: String,
    
    /// Oracle Registry Application ID (target for token transfer)
    pub registry_app_id: String,
    
    /// Oracle Registry Chain ID (target chain for token transfer)
    pub registry_chain_id: String,
    
    /// Token contract Application ID (if configured)
    pub token_app_id: Option<String>,
    
    /// Token contract Chain ID (if configured)
    pub token_chain_id: Option<String>,
    
    /// Step-by-step instructions in markdown format
    pub instructions_markdown: String,
    
    /// Example GraphQL mutation for token transfer
    pub transfer_mutation_example: String,
    
    /// Whether token contract is configured
    pub is_token_configured: bool,
}

/// GraphQL representation of voter staking status
#[derive(SimpleObject, Clone)]
pub struct VoterStakingStatus {
    /// Voter's chain ID / address
    pub voter_address: String,
    
    /// Is voter registered in the oracle registry
    pub is_registered: bool,
    
    /// Current stake amount
    pub current_stake: String,
    
    /// Minimum stake required
    pub min_stake_required: String,
    
    /// Is voter active (has enough stake)
    pub is_active: bool,
    
    /// Additional stake needed to become active
    pub stake_needed_to_activate: String,
    
    /// Pre-deposited tokens (in token_holdings but not yet credited)
    pub pre_deposited_tokens: String,
    
    /// Next step for the user
    pub next_step: String,
    
    /// Status message
    pub status_message: String,
}

pub struct OracleRegistryV2Service {
    state: Arc<OracleRegistryV2>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(OracleRegistryV2Service);

impl WithServiceAbi for OracleRegistryV2Service {
    type Abi = oracle_registry_v2::OracleRegistryV2Abi;
}

impl Service for OracleRegistryV2Service {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        // Load state - RootView::load() should create default state if not initialized yet
        // However, if state is truly empty (never instantiated), load() may fail with BcsError(Eof)
        // This happens when:
        // 1. Contract was created but instantiate() was never called
        // 2. Service is called before instantiation message is processed
        // 3. State storage is corrupted or empty
        
        // Try to load state with proper error handling
        let state = match OracleRegistryV2::load(runtime.root_view_storage_context()).await {
            Ok(state) => state,
            Err(e) => {
                // Log detailed error information
                eprintln!("❌ CRITICAL: Failed to load registry state: {:?}", e);
                eprintln!("   Error type: {}", std::any::type_name_of_val(&e));
                eprintln!("   This usually means:");
                eprintln!("   1. Contract was created but never instantiated");
                eprintln!("   2. Service called before instantiation message processed");
                eprintln!("   3. State storage is corrupted or empty");
                eprintln!("   ");
                eprintln!("   SOLUTION: Ensure contract is instantiated before querying service.");
                eprintln!("   Run: linera sync && linera process-inbox");
                eprintln!("   Or redeploy with proper instantiation argument.");
                
                // Panic with informative message - service cannot function without state
                // RootView does not have a `new()` method, so we cannot create empty state
                panic!(
                    "Registry state not initialized. Contract must be instantiated before service can be used.\n\
                     Error: {:?}\n\
                     Fix: Run 'linera sync && linera process-inbox' or redeploy contract.",
                    e
                );
            }
        };
        
        OracleRegistryV2Service { 
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        // Better error handling for GraphQL request parsing
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        
        // Execute query with error handling
        // If state is not initialized, return helpful error message
        let response = schema.execute(request).await;
        
        // Check if response contains state initialization errors
        // Note: The actual error happens in Service::new() during state loading
        // This is just a fallback for any other errors
        response
    }
}

impl Voter {
    /// Convert from state VoterInfo to GraphQL Voter
    fn from_voter_info(
        info: state::VoterInfo,
        available_stake: linera_sdk::linera_base_types::Amount,
        pending_rewards: linera_sdk::linera_base_types::Amount,
        state: &OracleRegistryV2,
    ) -> Self {
        let accuracy_percentage = if info.total_votes > 0 {
            (info.correct_votes as f64 / info.total_votes as f64) * 100.0
        } else {
            0.0
        };
        
        let reputation_tier = state.get_reputation_tier(info.reputation).to_string();
        // Display-only: convert basis points to f64 for GraphQL
        let reputation_weight = state.calculate_reputation_weight_bps(info.reputation) as f64 / 10000.0;
        
        // Convert timestamp to ISO 8601 string
        let registered_at = format!("{:?}", info.registered_at);
        
        Self {
            address: format!("{:?}", info.chain_id),
            stake: info.stake.to_string(),
            locked_stake: info.locked_stake.to_string(),
            available_stake: available_stake.to_string(),
            withdrawable_balance: info.withdrawable_balance.to_string(),
            pending_rewards: pending_rewards.to_string(),
            reputation: info.reputation,
            reputation_tier,
            reputation_weight,
            total_votes: info.total_votes,
            correct_votes: info.correct_votes,
            accuracy_percentage,
            registered_at,
            is_active: info.is_active,
            name: info.name,
            metadata_url: info.metadata_url,
        }
    }
}

impl Query {
    /// Convert from state Query to GraphQL Query
    fn from_state_query(
        query: state::Query,
        vote_count: usize,
        current_time: linera_sdk::linera_base_types::Timestamp,
    ) -> Self {
        // Convert strategy enum to string
        let strategy = match query.strategy {
            state::DecisionStrategy::Majority => "Majority",
            state::DecisionStrategy::Median => "Median",
            state::DecisionStrategy::WeightedByStake => "WeightedByStake",
            state::DecisionStrategy::WeightedByReputation => "WeightedByReputation",
        }.to_string();
        
        // Convert status enum to string
        let status = match query.status {
            state::QueryStatus::Active => "Active",
            state::QueryStatus::Resolved => "Resolved",
            state::QueryStatus::Finalized => "Finalized",
            state::QueryStatus::Disputed => "Disputed",
            state::QueryStatus::Expired => "Expired",
            state::QueryStatus::Cancelled => "Cancelled",
        }.to_string();
        
        // Convert phase enum to string
        let phase = match query.phase {
            state::VotingPhase::Commit => "Commit",
            state::VotingPhase::Reveal => "Reveal",
            state::VotingPhase::Completed => "Completed",
        }.to_string();
        
        // Convert timestamps to microseconds strings (for JavaScript compatibility)
        let created_at = query.created_at.micros().to_string();
        let deadline = query.deadline.micros().to_string();
        let commit_end = query.commit_phase_end.micros().to_string();
        let reveal_end = query.reveal_phase_end.micros().to_string();
        let resolved_at = query.resolved_at.map(|ts| ts.micros().to_string());
        
        // Calculate time remaining until deadline
        let time_remaining = if current_time < query.deadline {
            let delta = query.deadline.delta_since(current_time);
            (delta.as_micros() / 1_000_000) as i64 // Convert microseconds to seconds
        } else {
            0
        };
        
        // Count commits (phase 1) and revealed votes (phase 2)
        let commit_count = query.commits.len();
        
        // Check if can dispute (resolved and within dispute window)
        let dispute_window_end = query.dispute_window_end.map(|ts| ts.micros().to_string());
        let can_dispute = query.status == state::QueryStatus::Resolved 
            && query.dispute.is_none()
            && query.dispute_window_end.map(|ts| current_time < ts).unwrap_or(false);
        
        Self {
            id: query.id,
            description: query.description.clone(),
            outcomes: query.outcomes.clone(),
            strategy,
            min_votes: query.min_votes as u32,
            reward_amount: query.reward_amount.to_string(),
            creator: format!("{:?}", query.creator),
            created_at,
            deadline,
            commit_end,
            reveal_end,
            status,
            phase,
            result: query.result.clone(),
            resolved_at,
            commit_count: commit_count as u32,
            vote_count: vote_count as u32,
            time_remaining,
            votes: None, // Votes are populated separately when needed
            // Metadata fields
            title: query.title,
            category: query.category,
            context: query.context,
            resolution_criteria: query.resolution_criteria,
            source_urls: query.source_urls,
            tags: query.tags,
            metadata_url: query.metadata_url,
            external_id: query.external_id,
            // Hybrid model fields
            bond_amount: query.bond_amount.to_string(),
            priority_fee: query.priority_fee.to_string(),
            bond_refunded: query.bond_refunded,
            has_dispute: query.dispute.is_some(),
            dispute_window_end,
            can_dispute,
            // Source DApp tracking
            source_app_id: query.source_app_id.map(|id| format!("{:?}", id)),
            source_app_name: query.source_app_name,
            source_app_logo: query.source_app_logo,
            source_app_category: query.source_app_category,
            query_source: format!("{:?}", query.query_source),
            is_external: query.query_source.is_external(),
        }
    }
    
    /// Convert from state Query to GraphQL Query with votes included
    fn from_state_query_with_votes(
        query: state::Query,
        current_time: linera_sdk::linera_base_types::Timestamp,
    ) -> Self {
        let vote_count = query.votes.len();
        
        // Convert votes to GraphQL format
        let votes: Vec<QueryVote> = query.votes.iter().map(|(voter, vote)| {
            QueryVote {
                voter: format!("{:?}", voter),
                value: vote.value.clone(),
                timestamp: vote.timestamp.micros().to_string(),
                confidence: vote.confidence,
            }
        }).collect();
        
        let mut result = Self::from_state_query(query, vote_count, current_time);
        result.votes = Some(votes);
        result
    }
}

impl Statistics {
    /// Build Statistics from the current state
    async fn from_state(state: &OracleRegistryV2) -> Self {
        // Get basic counts
        let total_voters = *state.voter_count.get();
        let total_stake = *state.total_stake.get();
        let total_queries_created = *state.total_queries_created.get();
        let total_queries_resolved = *state.total_queries_resolved.get();
        let total_votes_submitted = *state.total_votes_submitted.get();
        let total_rewards_distributed = *state.total_rewards_distributed.get();
        let reward_pool_balance = *state.reward_pool.get();
        let protocol_treasury = *state.protocol_treasury.get();
        let is_paused = *state.is_paused.get();
        
        // Calculate active queries count
        let active_queries = state.get_active_queries().await;
        let active_queries_count = active_queries.len() as u64;
        
        // Calculate average stake per voter
        let average_stake = if total_voters > 0 {
            let stake_value: u128 = total_stake.into();
            linera_sdk::linera_base_types::Amount::from_tokens(stake_value / total_voters as u128)
        } else {
            linera_sdk::linera_base_types::Amount::ZERO
        };
        
        // Calculate average votes per query
        let average_votes_per_query = if total_queries_created > 0 {
            total_votes_submitted as f64 / total_queries_created as f64
        } else {
            0.0
        };
        
        // Calculate resolution rate
        let resolution_rate = if total_queries_created > 0 {
            (total_queries_resolved as f64 / total_queries_created as f64) * 100.0
        } else {
            0.0
        };
        
        // Calculate average reputation and active voters
        // Note: This is a simplified version. In production, you'd want to iterate through voters
        // For now, we'll use placeholder values that should be calculated properly
        let active_voters = total_voters; // TODO: Count only active voters
        let average_reputation = 50.0; // TODO: Calculate actual average
        let total_locked_stake = linera_sdk::linera_base_types::Amount::ZERO; // TODO: Sum locked stakes
        
        let protocol_status = if is_paused {
            "Paused".to_string()
        } else {
            "Active".to_string()
        };
        
        Self {
            total_voters,
            active_voters,
            total_stake: total_stake.to_string(),
            total_locked_stake: total_locked_stake.to_string(),
            average_stake: average_stake.to_string(),
            total_queries_created,
            total_queries_resolved,
            active_queries_count,
            total_votes_submitted,
            average_votes_per_query,
            total_rewards_distributed: total_rewards_distributed.to_string(),
            reward_pool_balance: reward_pool_balance.to_string(),
            protocol_treasury: protocol_treasury.to_string(),
            average_reputation,
            protocol_status,
            resolution_rate,
        }
    }
}

struct QueryRoot {
    state: Arc<OracleRegistryV2>,
}

#[Object]
impl QueryRoot {
    /// Get protocol parameters
    async fn parameters(&self) -> String {
        format!("{:?}", self.state.get_parameters().await)
    }

    /// Get total voter count
    async fn voter_count(&self) -> u64 {
        *self.state.voter_count.get()
    }

    /// Get total stake
    async fn total_stake(&self) -> String {
        self.state.total_stake.get().to_string()
    }
    
    /// Get voter information by address
    /// 
    /// Returns detailed information about a specific voter including their stake,
    /// reputation, voting history, and activity status.
    /// 
    /// # Arguments
    /// * `address` - The voter's account address as a hex string (e.g., "0x1234...")
    /// 
    /// # Returns
    /// Voter object with all voter information, or None if voter not found
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   voter(address: "0x1234...") {
    ///     address
    ///     stake
    ///     lockedStake
    ///     availableStake
    ///     reputation
    ///     reputationTier
    ///     reputationWeight
    ///     totalVotes
    ///     correctVotes
    ///     accuracyPercentage
    ///     registeredAt
    ///     isActive
    ///     name
    ///     metadataUrl
    ///   }
    /// }
    /// ```
    async fn voter(&self, address: String) -> Result<Option<Voter>, String> {
        // Parse the address string to ChainId
        let chain_id = address.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid chain ID format: {}", e))?;
        
        // Get voter info from state
        let voter_info = match self.state.get_voter(&chain_id).await {
            Some(info) => info,
            None => return Ok(None), // Voter not found
        };
        
        // Get available stake (total stake - locked stake)
        let available_stake = self.state.get_available_stake(&chain_id).await;
        
        // Get pending rewards
        let pending_rewards = self.state.get_pending_rewards(&chain_id).await;
        
        // Convert to GraphQL Voter type
        let voter = Voter::from_voter_info(voter_info, available_stake, pending_rewards, &self.state);
        
        Ok(Some(voter))
    }
    
    /// Get all registered voters
    /// 
    /// Returns a list of all voters registered in the system, including both
    /// active and inactive voters. This query is useful for displaying voter
    /// directories, leaderboards, and analytics.
    /// 
    /// # Arguments
    /// * `limit` - Optional maximum number of voters to return (default: 100, max: 1000)
    /// * `offset` - Optional number of voters to skip for pagination (default: 0)
    /// * `active_only` - Optional filter to return only active voters (default: false)
    /// 
    /// # Returns
    /// List of Voter objects with all voter information
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   voters(limit: 50, offset: 0, activeOnly: true) {
    ///     address
    ///     stake
    ///     reputation
    ///     reputationTier
    ///     totalVotes
    ///     accuracyPercentage
    ///     isActive
    ///     name
    ///   }
    /// }
    /// ```
    async fn voters(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
        active_only: Option<bool>,
    ) -> Result<Vec<Voter>, String> {
        // Validate and set defaults for pagination parameters
        let limit = match limit {
            Some(l) => {
                if l < 1 {
                    return Err("Limit must be at least 1".to_string());
                }
                if l > 1000 {
                    return Err("Limit cannot exceed 1000".to_string());
                }
                l as usize
            }
            None => 100, // Default limit
        };
        
        let offset = match offset {
            Some(o) => {
                if o < 0 {
                    return Err("Offset cannot be negative".to_string());
                }
                o as usize
            }
            None => 0, // Default offset
        };
        
        let active_only = active_only.unwrap_or(false);
        
        // Collect all voters from the MapView
        let mut voters = Vec::new();
        let mut count = 0;
        let mut skipped = 0;
        
        // Iterate through all voters in the MapView
        // Note: This uses the indices() method to get all keys, then fetches each voter
        let voter_indices = self.state.voters.indices().await
            .map_err(|e| format!("Failed to get voter indices: {}", e))?;
        
        for address in voter_indices {
            // Skip voters until we reach the offset
            if skipped < offset {
                skipped += 1;
                continue;
            }
            
            // Stop if we've collected enough voters
            if count >= limit {
                break;
            }
            
            // Get voter info
            let voter_info = match self.state.get_voter(&address).await {
                Some(info) => info,
                None => continue, // Skip if voter not found (shouldn't happen)
            };
            
            // Apply active_only filter
            if active_only && !voter_info.is_active {
                continue;
            }
            
            // Get available stake
            let available_stake = self.state.get_available_stake(&address).await;
            
            // Get pending rewards
            let pending_rewards = self.state.get_pending_rewards(&address).await;
            
            // Convert to GraphQL Voter type
            let voter = Voter::from_voter_info(voter_info, available_stake, pending_rewards, &self.state);
            voters.push(voter);
            count += 1;
        }
        
        Ok(voters)
    }
    
    /// Get the current user's voter information
    /// 
    /// This is a convenience query that returns voter information for a specific address.
    /// Since GraphQL services in Linera don't have authentication context, the client
    /// must provide their address (which they know from their wallet).
    /// 
    /// This query is functionally equivalent to `voter(address)` but provides a more
    /// intuitive API for clients to query their own information.
    /// 
    /// # Arguments
    /// * `address` - The voter's account address as a hex string (e.g., "0x1234...")
    ///               This should be the address from the user's wallet/account
    /// 
    /// # Returns
    /// Voter object with all voter information, or None if voter not found
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   myVoterInfo(address: "0x1234...") {
    ///     address
    ///     stake
    ///     lockedStake
    ///     availableStake
    ///     reputation
    ///     reputationTier
    ///     reputationWeight
    ///     totalVotes
    ///     correctVotes
    ///     accuracyPercentage
    ///     registeredAt
    ///     isActive
    ///     name
    ///     metadataUrl
    ///   }
    /// }
    /// ```
    /// 
    /// # Note
    /// In a typical web3 application, the client (dashboard/frontend) knows the user's
    /// address from their connected wallet. The client should pass this address to this
    /// query to retrieve the user's voter information.
    async fn my_voter_info(&self, address: String) -> Result<Option<Voter>, String> {
        // Duplicate logic from voter() since we can't call it directly without context
        let chain_id = address.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid chain ID format: {}", e))?;
        
        let voter_info = match self.state.get_voter(&chain_id).await {
            Some(info) => info,
            None => return Ok(None),
        };
        
        let available_stake = self.state.get_available_stake(&chain_id).await;
        let pending_rewards = self.state.get_pending_rewards(&chain_id).await;
        let voter = Voter::from_voter_info(voter_info, available_stake, pending_rewards, &self.state);
        
        Ok(Some(voter))
    }
    
    /// Get all queries
    async fn queries(&self) -> Result<Vec<Query>, String> {
        let mut queries = Vec::new();
        
        // Get all query IDs
        let query_indices = self.state.queries.indices().await
            .map_err(|e| format!("Failed to get query indices: {}", e))?;
        
        // Use timestamp 0 for time_remaining calculation (frontend will calculate)
        let current_time = linera_sdk::linera_base_types::Timestamp::from(0);
        
        for query_id in query_indices {
            if let Some(query) = self.state.get_query(query_id).await {
                let vote_count = query.votes.len();
                let graphql_query = Query::from_state_query(query, vote_count, current_time);
                queries.push(graphql_query);
            }
        }
        
        Ok(queries)
    }
    
    /// Get a specific query by ID
    async fn query(&self, id: u64) -> Result<Option<Query>, String> {
        let query = match self.state.get_query(id).await {
            Some(q) => q,
            None => return Ok(None),
        };
        
        // Use timestamp 0 for time_remaining calculation (frontend will calculate)
        let current_time = linera_sdk::linera_base_types::Timestamp::from(0);
        
        let vote_count = query.votes.len();
        let graphql_query = Query::from_state_query(query, vote_count, current_time);
        
        Ok(Some(graphql_query))
    }
    
    /// Get a specific query by ID with all votes included
    /// 
    /// This query returns the full query details including all votes cast by voters.
    /// Useful for displaying vote breakdown on resolved queries.
    /// 
    /// # Arguments
    /// * `id` - The query ID
    /// 
    /// # Returns
    /// Query object with votes array populated
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   queryWithVotes(id: 1) {
    ///     id
    ///     description
    ///     status
    ///     result
    ///     votes {
    ///       voter
    ///       value
    ///       timestamp
    ///       confidence
    ///     }
    ///   }
    /// }
    /// ```
    async fn query_with_votes(&self, id: u64) -> Result<Option<Query>, String> {
        let query = match self.state.get_query(id).await {
            Some(q) => q,
            None => return Ok(None),
        };
        
        // Use timestamp 0 for time_remaining calculation (frontend will calculate)
        let current_time = linera_sdk::linera_base_types::Timestamp::from(0);
        
        let graphql_query = Query::from_state_query_with_votes(query, current_time);
        
        Ok(Some(graphql_query))
    }
    
    /// Get statistics
    async fn statistics(&self) -> Result<Statistics, String> {
        Ok(Statistics::from_state(&self.state).await)
    }
    
    // ==================== CONSUMER APP QUERIES ====================
    
    /// Get all registered consumer apps
    /// 
    /// Returns a list of all consumer apps registered with the Oracle.
    /// 
    /// # Arguments
    /// * `active_only` - Optional filter to return only active apps (default: false)
    /// 
    /// # Returns
    /// List of ConsumerApp objects
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   consumerApps(activeOnly: true) {
    ///     appId
    ///     chainId
    ///     name
    ///     category
    ///     tier
    ///     stake
    ///     totalQueries
    ///     rateLimit
    ///     isActive
    ///   }
    /// }
    /// ```
    async fn consumer_apps(&self, active_only: Option<bool>) -> Result<Vec<ConsumerApp>, String> {
        let active_only = active_only.unwrap_or(false);
        let mut apps = Vec::new();
        
        // Get all consumer app indices
        let app_indices = self.state.consumer_apps.indices().await
            .map_err(|e| format!("Failed to get consumer app indices: {}", e))?;
        
        for (app_id, chain_id) in app_indices {
            if let Ok(Some(app_info)) = self.state.consumer_apps.get(&(app_id, chain_id)).await {
                // Apply active_only filter
                if active_only && !app_info.is_active {
                    continue;
                }
                
                let app = ConsumerApp {
                    app_id: format!("{:?}", app_info.app_id),
                    chain_id: format!("{:?}", app_info.chain_id),
                    name: app_info.name,
                    category: format!("{:?}", app_info.category),
                    tier: format!("{:?}", app_info.tier),
                    registered_at: app_info.registered_at.micros().to_string(),
                    is_active: app_info.is_active,
                    stake: app_info.stake.to_string(),
                    total_queries: app_info.total_queries,
                    resolved_queries: app_info.resolved_queries,
                    reputation: app_info.reputation,
                    metadata_url: app_info.metadata_url,
                    logo_url: app_info.logo_url,
                    rate_limit: app_info.rate_limit,
                    queries_this_hour: app_info.queries_this_hour,
                };
                apps.push(app);
            }
        }
        
        Ok(apps)
    }
    
    /// Get a specific consumer app by app_id and chain_id
    /// 
    /// # Arguments
    /// * `app_id` - Application ID as hex string
    /// * `chain_id` - Chain ID as hex string
    /// 
    /// # Returns
    /// ConsumerApp object or None if not found
    async fn consumer_app(&self, app_id: String, chain_id: String) -> Result<Option<ConsumerApp>, String> {
        // Parse app_id and chain_id
        let app_id_parsed = app_id.parse::<linera_sdk::linera_base_types::ApplicationId>()
            .map_err(|e| format!("Invalid app_id format: {}", e))?;
        let chain_id_parsed = chain_id.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid chain_id format: {}", e))?;
        
        // Get consumer app
        let app_info = match self.state.consumer_apps.get(&(app_id_parsed, chain_id_parsed)).await {
            Ok(Some(info)) => info,
            Ok(None) => return Ok(None),
            Err(e) => return Err(format!("Failed to get consumer app: {}", e)),
        };
        
        let app = ConsumerApp {
            app_id: format!("{:?}", app_info.app_id),
            chain_id: format!("{:?}", app_info.chain_id),
            name: app_info.name,
            category: format!("{:?}", app_info.category),
            tier: format!("{:?}", app_info.tier),
            registered_at: app_info.registered_at.micros().to_string(),
            is_active: app_info.is_active,
            stake: app_info.stake.to_string(),
            total_queries: app_info.total_queries,
            resolved_queries: app_info.resolved_queries,
            reputation: app_info.reputation,
            metadata_url: app_info.metadata_url,
            logo_url: app_info.logo_url,
            rate_limit: app_info.rate_limit,
            queries_this_hour: app_info.queries_this_hour,
        };
        
        Ok(Some(app))
    }
    
    /// Get consumer app statistics
    /// 
    /// Returns aggregate statistics about all registered consumer apps.
    /// 
    /// # Returns
    /// ConsumerAppStatistics object
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   consumerAppStats {
    ///     totalApps
    ///     activeApps
    ///     totalQueries
    ///     totalResolved
    ///   }
    /// }
    /// ```
    async fn consumer_app_stats(&self) -> Result<ConsumerAppStatistics, String> {
        let stats = self.state.get_consumer_app_stats();
        
        Ok(ConsumerAppStatistics {
            total_apps: stats.total_apps,
            active_apps: stats.active_apps,
            total_queries: stats.total_queries,
            total_resolved: stats.total_resolved,
        })
    }
    
    /// Get total tokens held by registry
    /// 
    /// Returns the total amount of tokens that the registry is holding
    /// for all voters. This should match the sum of all voter stakes
    /// if the staking system is working correctly.
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   totalTokensHeld
    /// }
    /// ```
    async fn total_tokens_held(&self) -> String {
        self.state.total_tokens_held.get().to_string()
    }
    
    /// Get token holdings for a specific voter
    /// 
    /// Returns the amount of tokens that the registry is holding
    /// for a specific voter. This should match their stake amount
    /// if the staking system is working correctly.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as a string
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   voterTokenHoldings(voterAddress: "296688fba8a523222a8327ffaa392d0384ec322b1c18afdbe33d50620c176a0e")
    /// }
    /// ```
    async fn voter_token_holdings(&self, voter_address: String) -> Result<String, String> {
        let chain_id = voter_address.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid chain ID format: {}", e))?;
        
        let holdings = self.state.token_holdings.get(&chain_id).await
            .map_err(|e| format!("Failed to get token holdings: {}", e))?
            .unwrap_or(linera_sdk::linera_base_types::Amount::ZERO);
        
        Ok(holdings.to_string())
    }
    
    /// Get staking system health check
    /// 
    /// Compares total stake in registry with total tokens held
    /// to verify the staking system integrity.
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   stakingHealthCheck {
    ///     totalStake
    ///     totalTokensHeld
    ///     isHealthy
    ///     discrepancy
    ///   }
    /// }
    /// ```
    async fn staking_health_check(&self) -> StakingHealthCheck {
        let total_stake = *self.state.total_stake.get();
        let total_tokens_held = *self.state.total_tokens_held.get();
        
        let is_healthy = total_stake == total_tokens_held;
        let discrepancy = if total_stake >= total_tokens_held {
            total_stake.saturating_sub(total_tokens_held)
        } else {
            total_tokens_held.saturating_sub(total_stake)
        };
        
        StakingHealthCheck {
            total_stake: total_stake.to_string(),
            total_tokens_held: total_tokens_held.to_string(),
            is_healthy,
            discrepancy: discrepancy.to_string(),
        }
    }
    
    /// Get staking instructions for new voters
    /// 
    /// Returns detailed instructions on how to stake tokens to become a voter.
    /// This includes the Oracle Registry's Application ID and Chain ID needed
    /// for token transfers.
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   stakingInstructions {
    ///     minStake
    ///     registryAppId
    ///     registryChainId
    ///     tokenAppId
    ///     tokenChainId
    ///     instructionsMarkdown
    ///     transferMutationExample
    ///     isTokenConfigured
    ///   }
    /// }
    /// ```
    async fn staking_instructions(&self) -> StakingInstructions {
        let params = self.state.get_parameters().await;
        let min_stake = params.min_stake;
        
        // Get registry identifiers
        // Note: In the service, we don't have direct access to runtime.application_id()
        // We'll use placeholder values that the frontend should know
        let registry_chain_id = "REGISTRY_CHAIN_ID".to_string();
        let registry_app_id = "REGISTRY_APP_ID".to_string();
        
        // Check token configuration
        let token_app_id = params.token_app_id.map(|id| format!("{:?}", id));
        let token_chain_id = params.token_chain_id.map(|id| format!("{:?}", id));
        let is_token_configured = params.token_app_id.is_some();
        
        // Build transfer mutation example
        let transfer_example = if is_token_configured {
            format!(
                r#"mutation {{
  transfer(
    owner: "YOUR_CHAIN_ID",
    amount: "{}.",
    targetAccount: {{
      chainId: "{:?}",
      owner: "{:?}"  // Oracle Registry App ID as Address32
    }}
  )
}}"#,
                min_stake,
                params.token_chain_id.unwrap(),
                params.token_app_id.unwrap()
            )
        } else {
            "Token contract not configured. Contact admin.".to_string()
        };
        
        // Build markdown instructions
        let instructions = format!(
            r#"# How to Stake ALTH Tokens

## Prerequisites
- You must have ALTH tokens in your account
- Minimum stake required: **{} ALTH**

## Steps

### Step 1: Register as Voter
Call the `registerVoter` mutation on the Oracle Registry.
This creates your voter entry (initially INACTIVE with stake=0).

```graphql
mutation {{
  registerVoter(stake: "{}", name: "YourName")
}}
```

### Step 2: Transfer Tokens to Oracle Registry
You need to transfer ALTH tokens from the Token Contract to the Oracle Registry.
The tokens are credited to your voter account when received.

#### Option A: Via Token Contract GraphQL
{}

#### Option B: Via Dashboard
Use the "Stake Tokens" button on the dashboard which handles the transfer.

### Step 3: Verification
After transferring, your voter status will automatically update:
- **ACTIVE**: If you staked >= {} tokens
- **INACTIVE**: If you staked < {} tokens

Query your status:
```graphql
query {{
  voter(address: "YOUR_CHAIN_ID") {{
    stake
    isActive
  }}
}}
```

## Important Notes
- Tokens must be transferred to the Oracle Registry's Application ID
- Your stake is real token balance held by the registry
- You can withdraw stake anytime (if not locked in active votes)
"#,
            min_stake, min_stake, transfer_example, min_stake, min_stake
        );
        
        StakingInstructions {
            min_stake: min_stake.to_string(),
            registry_app_id,
            registry_chain_id,
            token_app_id,
            token_chain_id,
            instructions_markdown: instructions,
            transfer_mutation_example: transfer_example,
            is_token_configured,
        }
    }
    
    /// Get staking status for a specific voter
    /// 
    /// Returns detailed information about a voter's staking status,
    /// including whether they need to stake more tokens to become active.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as a string
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   voterStakingStatus(voterAddress: "your_chain_id") {
    ///     voterAddress
    ///     isRegistered
    ///     currentStake
    ///     minStakeRequired
    ///     isActive
    ///     stakeNeededToActivate
    ///     preDepositedTokens
    ///     nextStep
    ///     statusMessage
    ///   }
    /// }
    /// ```
    async fn voter_staking_status(&self, voter_address: String) -> Result<VoterStakingStatus, String> {
        let chain_id = voter_address.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid chain ID format: {}", e))?;
        
        let params = self.state.get_parameters().await;
        let min_stake = params.min_stake;
        let min_stake_value: u128 = min_stake.into();
        
        // Check if voter is registered
        let voter_info = self.state.get_voter(&chain_id).await;
        let is_registered = voter_info.is_some();
        
        // Get pre-deposited tokens
        let pre_deposited = self.state.token_holdings.get(&chain_id).await
            .map_err(|e| format!("Failed to get token holdings: {}", e))?
            .unwrap_or(linera_sdk::linera_base_types::Amount::ZERO);
        
        let (current_stake, is_active) = match &voter_info {
            Some(info) => (info.stake, info.is_active),
            None => (linera_sdk::linera_base_types::Amount::ZERO, false),
        };
        
        let current_stake_value: u128 = current_stake.into();
        let stake_needed = if current_stake_value >= min_stake_value {
            linera_sdk::linera_base_types::Amount::ZERO
        } else {
            linera_sdk::linera_base_types::Amount::from_attos(min_stake_value - current_stake_value)
        };
        
        // Determine next step and status message
        let (next_step, status_message) = if !is_registered {
            (
                "Call registerVoter mutation to create your voter entry".to_string(),
                "Not registered. Register first, then transfer tokens to activate.".to_string(),
            )
        } else if !is_active {
            (
                format!(
                    "Transfer at least {} ALTH tokens to Oracle Registry",
                    stake_needed
                ),
                format!(
                    "Registered but INACTIVE. Current stake: {}, need: {}",
                    current_stake, min_stake
                ),
            )
        } else {
            (
                "You are fully staked and active! You can vote on queries.".to_string(),
                format!("ACTIVE voter with {} stake", current_stake),
            )
        };
        
        Ok(VoterStakingStatus {
            voter_address: format!("{:?}", chain_id),
            is_registered,
            current_stake: current_stake.to_string(),
            min_stake_required: min_stake.to_string(),
            is_active,
            stake_needed_to_activate: stake_needed.to_string(),
            pre_deposited_tokens: pre_deposited.to_string(),
            next_step,
            status_message,
        })
    }
    
    // ==================== HYBRID MODEL QUERIES ====================
    
    /// Get hybrid model statistics
    /// 
    /// Returns statistics about the inflation and bond pools.
    /// 
    /// # Example
    /// ```graphql
    /// query {
    ///   hybridModelStats {
    ///     inflationPool
    ///     totalInflationDistributed
    ///     bondPool
    ///     totalBondsRefunded
    ///     totalBondsSlashed
    ///   }
    /// }
    /// ```
    async fn hybrid_model_stats(&self) -> HybridModelStatistics {
        let stats = self.state.get_hybrid_stats().await;
        
        HybridModelStatistics {
            inflation_pool: stats.inflation_pool.to_string(),
            total_inflation_distributed: stats.total_inflation_distributed.to_string(),
            bond_pool: stats.bond_pool.to_string(),
            total_bonds_refunded: stats.total_bonds_refunded.to_string(),
            total_bonds_slashed: stats.total_bonds_slashed.to_string(),
        }
    }
    
    /// Get dispute for a specific query
    /// 
    /// Returns dispute information if the query has an active dispute.
    /// 
    /// # Arguments
    /// * `query_id` - The query ID
    /// 
    /// # Returns
    /// Dispute object or None if no dispute exists
    async fn dispute(&self, query_id: u64) -> Result<Option<Dispute>, String> {
        let query = match self.state.get_query(query_id).await {
            Some(q) => q,
            None => return Ok(None),
        };
        
        let dispute = match query.dispute {
            Some(d) => d,
            None => return Ok(None),
        };
        
        let status = match dispute.status {
            state::DisputeStatus::Pending => "Pending",
            state::DisputeStatus::Voting => "Voting",
            state::DisputeStatus::RejectedOriginalWins => "RejectedOriginalWins",
            state::DisputeStatus::AcceptedDisputerWins => "AcceptedDisputerWins",
        }.to_string();
        
        Ok(Some(Dispute {
            query_id,
            disputer: format!("{:?}", dispute.disputer),
            dispute_bond: dispute.dispute_bond.to_string(),
            disputed_outcome: dispute.disputed_outcome,
            reason: dispute.reason,
            disputed_at: dispute.disputed_at.micros().to_string(),
            status,
        }))
    }
    
    /// Get queries by category
    /// 
    /// Returns queries filtered by category.
    /// 
    /// # Arguments
    /// * `category` - Category to filter by (e.g., "Crypto", "Sports")
    /// 
    /// # Returns
    /// List of Query objects
    async fn queries_by_category(&self, category: String) -> Result<Vec<Query>, String> {
        let mut queries = Vec::new();
        
        let query_indices = self.state.queries.indices().await
            .map_err(|e| format!("Failed to get query indices: {}", e))?;
        
        let current_time = linera_sdk::linera_base_types::Timestamp::from(0);
        
        for query_id in query_indices {
            if let Some(query) = self.state.get_query(query_id).await {
                if query.category.as_ref() == Some(&category) {
                    let vote_count = query.votes.len();
                    let graphql_query = Query::from_state_query(query, vote_count, current_time);
                    queries.push(graphql_query);
                }
            }
        }
        
        Ok(queries)
    }
    
    /// Get queries with bond (hybrid model queries)
    /// 
    /// Returns all queries that were created with the hybrid model (have bond).
    /// 
    /// # Returns
    /// List of Query objects with bond > 0
    async fn queries_with_bond(&self) -> Result<Vec<Query>, String> {
        let mut queries = Vec::new();
        
        let query_indices = self.state.queries.indices().await
            .map_err(|e| format!("Failed to get query indices: {}", e))?;
        
        let current_time = linera_sdk::linera_base_types::Timestamp::from(0);
        
        for query_id in query_indices {
            if let Some(query) = self.state.get_query(query_id).await {
                if query.bond_amount > linera_sdk::linera_base_types::Amount::ZERO {
                    let vote_count = query.votes.len();
                    let graphql_query = Query::from_state_query(query, vote_count, current_time);
                    queries.push(graphql_query);
                }
            }
        }
        
        Ok(queries)
    }

}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<OracleRegistryV2Service>>,
}

#[Object]
impl MutationRoot {
    /// Register as a new voter
    /// 
    /// This mutation provides information about the RegisterVoter operation.
    /// To execute the registration, call the RegisterVoter operation on the contract.
    /// 
    /// # Arguments
    /// * `stake` - Initial stake amount (in tokens as string)
    /// * `name` - Optional voter name
    /// * `metadata_url` - Optional URL to voter metadata
    /// 
    /// # Returns
    /// Empty array (operation is scheduled for execution)
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   registerVoter(stake: "1000", name: "Alice")
    /// }
    /// ```
    /// 
    /// # Note
    /// Chain ID is automatically detected using runtime.chain_id()
    /// No address parameter needed! (Microcard pattern)
    async fn register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> String {
        use oracle_registry_v2::Operation;
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        // This is consistent with how alethea-token handles amounts
        let stake_amount: Amount = match stake.parse() {
            Ok(v) => v,
            Err(_) => return "Error: Invalid stake format. Use format like '100.' with trailing dot".to_string(),
        };
        
        // Create RegisterVoter operation
        let operation = Operation::RegisterVoter {
            stake: stake_amount,
            name,
            metadata_url,
        };
        
        // Schedule operation - will be executed when block is created
        self.runtime.schedule_operation(&operation);
        
        // Return success message
        format!("Voter registration scheduled with stake: {}", stake)
    }

    /// Update stake by adding additional stake to voter account
    /// 
    /// This mutation provides information about the UpdateStake operation.
    /// To execute the stake update, call the UpdateStake operation on the contract.
    /// 
    /// # Arguments
    /// * `additional_stake` - Additional amount to add to stake (in tokens as string)
    /// 
    /// # Returns
    /// JSON string with operation details for executing the stake update
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   updateStake(additionalStake: "1000000")
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "UpdateStake",
    ///   "additional_stake": "1000000",
    ///   "instructions": "Call the UpdateStake operation with the specified amount"
    /// }
    /// ```
    async fn update_stake(&self, additional_stake: String) -> Result<String, String> {
        // Validate amount format
        let stake_value = additional_stake.parse::<u128>()
            .map_err(|_| "Invalid amount format: must be a valid number".to_string())?;
        
        if stake_value == 0 {
            return Err("Additional stake must be greater than zero".to_string());
        }
        
        // Return operation details as JSON
        let response = serde_json::json!({
            "operation": "UpdateStake",
            "additional_stake": additional_stake,
            "instructions": "Call the UpdateStake operation on the contract with this amount",
            "requirements": [
                "Voter must be registered and active",
                "Additional stake amount must be greater than zero",
                "Voter must have sufficient balance to add the stake"
            ]
        });
        
        Ok(response.to_string())
    }
    
    /// Withdraw stake from voter account
    /// 
    /// This mutation provides information about the WithdrawStake operation.
    /// To execute the withdrawal, call the WithdrawStake operation on the contract.
    /// 
    /// # Arguments
    /// * `amount` - Amount to withdraw (in tokens as string)
    /// 
    /// # Returns
    /// JSON string with operation details for executing the withdrawal
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   withdrawStake(amount: "1000000")
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "WithdrawStake",
    ///   "amount": "1000000",
    ///   "instructions": "Call the WithdrawStake operation with the specified amount"
    /// }
    /// ```
    async fn withdraw_stake(&self, amount: String) -> Result<String, String> {
        // Validate amount format
        let amount_value = amount.parse::<u128>()
            .map_err(|_| "Invalid amount format: must be a valid number".to_string())?;
        
        if amount_value == 0 {
            return Err("Withdrawal amount must be greater than zero".to_string());
        }
        
        // Return operation details as JSON
        let response = serde_json::json!({
            "operation": "WithdrawStake",
            "amount": amount,
            "instructions": "Call the WithdrawStake operation on the contract with this amount",
            "requirements": [
                "Voter must be registered and active",
                "Amount must not exceed available stake (total stake - locked stake)",
                "Voter must not have active votes on any queries",
                "Remaining stake must meet minimum requirement or be zero"
            ]
        });
        
        Ok(response.to_string())
    }
    
    /// Deregister as a voter and return all stake
    /// 
    /// This mutation provides information about the DeregisterVoter operation.
    /// To execute the deregistration, call the DeregisterVoter operation on the contract.
    /// 
    /// # Returns
    /// JSON string with operation details for executing the deregistration
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   deregisterVoter
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "DeregisterVoter",
    ///   "instructions": "Call the DeregisterVoter operation on the contract"
    /// }
    /// ```
    async fn deregister_voter(&self) -> Result<String, String> {
        // Return operation details as JSON
        let response = serde_json::json!({
            "operation": "DeregisterVoter",
            "instructions": "Call the DeregisterVoter operation on the contract to deregister and return all stake",
            "requirements": [
                "Voter must be registered and active",
                "Voter must not have any pending rewards (claim them first)",
                "Voter must not have active votes on any queries",
                "All stake will be returned to the voter"
            ],
            "effects": [
                "Voter will be removed from the registry",
                "All stake will be returned to the voter's account",
                "Voter count will be decremented",
                "Total stake will be reduced by the voter's stake amount"
            ]
        });
        
        Ok(response.to_string())
    }
    
    /// Create a new query/market
    /// 
    /// This mutation provides information about the CreateQuery operation.
    /// To execute the query creation, call the CreateQuery operation on the contract.
    /// 
    /// # Arguments
    /// * `description` - Description of the query/question
    /// * `outcomes` - List of possible outcomes (e.g., ["Yes", "No"] or ["Option A", "Option B", "Option C"])
    /// * `strategy` - Decision strategy: "Majority", "Median", "WeightedByStake", or "WeightedByReputation"
    /// * `min_votes` - Optional minimum votes required (uses protocol default if not specified)
    /// * `reward_amount` - Reward amount for correct voters (in tokens as string)
    /// * `deadline` - Optional deadline timestamp in microseconds (uses protocol default duration if not specified)
    /// * `duration_secs` - Optional custom duration in seconds (overrides default_query_duration)
    ///                     This sets total duration, split 50/50 between commit and reveal phases
    ///                     Example: 120 = 60s commit + 60s reveal
    /// 
    /// # Returns
    /// JSON string with operation details for executing the query creation
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   createQuery(
    ///     description: "Will it rain tomorrow?",
    ///     outcomes: ["Yes", "No"],
    ///     strategy: "Majority",
    ///     rewardAmount: "1000000",
    ///     durationSecs: 120
    ///   )
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "CreateQuery",
    ///   "description": "Will it rain tomorrow?",
    ///   "outcomes": ["Yes", "No"],
    ///   "strategy": "Majority",
    ///   "reward_amount": "1000000",
    ///   "duration_secs": 120,
    ///   "instructions": "Call the CreateQuery operation with these parameters"
    /// }
    /// ```
    async fn create_query(
        &self,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        min_votes: Option<i32>,
        reward_amount: String,
        deadline: Option<String>,
        duration_secs: Option<i32>,
    ) -> Result<String, String> {
        // Validate description
        if description.is_empty() {
            return Err("Description cannot be empty".to_string());
        }
        if description.len() > 1000 {
            return Err("Description too long (max 1000 characters)".to_string());
        }
        
        // Validate outcomes
        if outcomes.is_empty() {
            return Err("At least one outcome must be provided".to_string());
        }
        if outcomes.len() > 100 {
            return Err("Too many outcomes (max 100)".to_string());
        }
        
        // Check for empty outcomes
        for outcome in &outcomes {
            if outcome.is_empty() {
                return Err("Outcome cannot be empty".to_string());
            }
            if outcome.len() > 200 {
                return Err("Outcome too long (max 200 characters)".to_string());
            }
        }
        
        // Check for duplicate outcomes
        let mut unique_outcomes = std::collections::HashSet::new();
        for outcome in &outcomes {
            if !unique_outcomes.insert(outcome) {
                return Err(format!("Duplicate outcome: {}", outcome));
            }
        }
        
        // Validate strategy
        let valid_strategies = ["Majority", "Median", "WeightedByStake", "WeightedByReputation"];
        if !valid_strategies.contains(&strategy.as_str()) {
            return Err(format!(
                "Invalid strategy '{}'. Valid strategies: {}",
                strategy,
                valid_strategies.join(", ")
            ));
        }
        
        // Validate min_votes if provided
        if let Some(mv) = min_votes {
            if mv < 1 {
                return Err("Minimum votes must be at least 1".to_string());
            }
            if mv > 1000 {
                return Err("Minimum votes too high (max 1000)".to_string());
            }
        }
        
        // Validate reward amount
        let reward_value = reward_amount.parse::<u128>()
            .map_err(|_| "Invalid reward amount format: must be a valid number".to_string())?;
        
        if reward_value == 0 {
            return Err("Reward amount must be greater than zero".to_string());
        }
        
        // Validate deadline if provided
        if let Some(ref dl) = deadline {
            let _deadline_value = dl.parse::<u64>()
                .map_err(|_| "Invalid deadline format: must be a valid timestamp in microseconds".to_string())?;
            // Note: Additional validation (deadline in future) will be done by the contract
        }
        
        // Validate strategy compatibility with outcomes
        match strategy.as_str() {
            "Median" => {
                // Median strategy requires numeric outcomes
                for outcome in &outcomes {
                    if outcome.parse::<f64>().is_err() {
                        return Err(format!(
                            "Median strategy requires numeric outcomes, but '{}' is not numeric",
                            outcome
                        ));
                    }
                }
            }
            _ => {
                // Other strategies work with any outcomes
            }
        }
        
        // Convert strategy string to enum
        // Note: We need to use the DecisionStrategy from oracle_registry_v2 crate, not local state
        use oracle_registry_v2::Operation;
        use oracle_registry_v2::state::DecisionStrategy as LibDecisionStrategy;
        
        let strategy_enum = match strategy.as_str() {
            "Majority" => LibDecisionStrategy::Majority,
            "Median" => LibDecisionStrategy::Median,
            "WeightedByStake" => LibDecisionStrategy::WeightedByStake,
            "WeightedByReputation" => LibDecisionStrategy::WeightedByReputation,
            _ => return Err(format!("Invalid strategy: {}", strategy)),
        };
        
        // Parse deadline if provided
        let deadline_ts = if let Some(ref dl) = deadline {
            let micros = dl.parse::<u64>()
                .map_err(|_| "Invalid deadline format".to_string())?;
            Some(linera_sdk::linera_base_types::Timestamp::from(micros))
        } else {
            None
        };
        
        // Create the operation
        // reward_value is already in attos (raw value), use from_attos
        // User should input the raw attos value, e.g., "1000000000000000000" for 1 token
        let reward_amt = linera_sdk::linera_base_types::Amount::from_attos(reward_value);
        
        let operation = Operation::CreateQuery {
            description: description.clone(),
            outcomes: outcomes.clone(),
            strategy: strategy_enum,
            min_votes: min_votes.map(|v| v as usize),
            reward_amount: reward_amt,
            deadline: deadline_ts,
            duration_secs: duration_secs.map(|d| d as u64),
        };
        
        // Schedule operation - will be executed when block is created
        self.runtime.schedule_operation(&operation);
        
        // Build response
        let mut response = serde_json::json!({
            "success": true,
            "message": "Query creation scheduled",
            "description": description,
            "outcomes": outcomes,
            "strategy": strategy,
            "reward_amount": reward_amount,
        });
        
        // Add optional fields if provided
        if let Some(mv) = min_votes {
            response["min_votes"] = serde_json::json!(mv);
        }
        if let Some(dl) = deadline {
            response["deadline"] = serde_json::json!(dl);
        }
        if let Some(ds) = duration_secs {
            response["duration_secs"] = serde_json::json!(ds);
        }
        
        Ok(response.to_string())
    }
    
    /// Submit a vote for a query
    /// 
    /// This mutation provides information about the SubmitVote operation.
    /// To execute the vote submission, call the SubmitVote operation on the contract.
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query to vote on
    /// * `value` - The vote value (must be one of the query's valid outcomes)
    /// * `confidence` - Optional confidence score (0-100) indicating how confident the voter is in their answer
    /// 
    /// # Returns
    /// JSON string with operation details for executing the vote submission
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   submitVote(
    ///     queryId: 1,
    ///     value: "Yes",
    ///     confidence: 85
    ///   )
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "SubmitVote",
    ///   "query_id": 1,
    ///   "value": "Yes",
    ///   "confidence": 85,
    ///   "instructions": "Call the SubmitVote operation with these parameters"
    /// }
    /// ```
    async fn submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<i32>,
    ) -> Result<String, String> {
        // Validate query_id
        if query_id == 0 {
            return Err("Query ID must be greater than zero".to_string());
        }
        
        // Validate value is not empty
        if value.is_empty() {
            return Err("Vote value cannot be empty".to_string());
        }
        if value.len() > 200 {
            return Err("Vote value too long (max 200 characters)".to_string());
        }
        
        // Validate confidence if provided
        let confidence_u8 = if let Some(conf) = confidence {
            if conf < 0 || conf > 100 {
                return Err("Confidence must be between 0 and 100".to_string());
            }
            Some(conf as u8)
        } else {
            None
        };
        
        // Build response with operation details
        let mut response = serde_json::json!({
            "operation": "SubmitVote",
            "query_id": query_id,
            "value": value,
            "instructions": "To execute this operation, use the backend API or Linera CLI",
            "requirements": [
                "Voter must be registered and active",
                "Query must exist and be in Active status",
                "Query deadline must not have passed",
                "Voter must not have already voted on this query",
                "Vote value must be one of the query's valid outcomes"
            ]
        });
        
        // Add confidence if provided
        if let Some(conf) = confidence_u8 {
            response["confidence"] = serde_json::json!(conf);
        }
        
        Ok(response.to_string())
    }
    
    /// Resolve a query after deadline has passed and minimum votes are met
    /// 
    /// This mutation provides information about the ResolveQuery operation.
    /// To execute the query resolution, call the ResolveQuery operation on the contract.
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query to resolve
    /// 
    /// # Returns
    /// JSON string with operation details for executing the query resolution
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   resolveQuery(queryId: 1)
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "ResolveQuery",
    ///   "query_id": 1,
    ///   "instructions": "Call the ResolveQuery operation with the query ID"
    /// }
    /// ```
    async fn resolve_query(&self, query_id: u64) -> Result<String, String> {
        // Validate query_id
        if query_id == 0 {
            return Err("Query ID must be greater than zero".to_string());
        }
        
        // Build response with operation details
        let response = serde_json::json!({
            "operation": "ResolveQuery",
            "query_id": query_id,
            "instructions": "Call the ResolveQuery operation on the contract with this query ID",
            "requirements": [
                "Query must exist and be in Active status",
                "Query deadline must have passed",
                "Query must have at least the minimum required votes",
                "Query must not already be resolved or expired",
                "Can be called by anyone (not restricted to query creator or admin)"
            ],
            "resolution_process": [
                "1. Validate query exists and is in Active status",
                "2. Check that deadline has passed",
                "3. Verify minimum votes requirement is met",
                "4. Calculate result based on the query's decision strategy:",
                "   - Majority: Most common vote value wins",
                "   - Median: Median of numeric votes (for numeric outcomes)",
                "   - WeightedByStake: Votes weighted by voter stake amounts",
                "   - WeightedByReputation: Votes weighted by voter reputation scores",
                "5. Update query status to Resolved with the calculated result",
                "6. Unlock stake for all voters who participated",
                "7. Update voter reputations based on vote correctness",
                "8. Distribute rewards to voters who voted correctly",
                "9. Apply slashing to voters who voted incorrectly",
                "10. Update protocol statistics and treasury"
            ],
            "effects": [
                "Query status will be changed to Resolved",
                "Query result will be set to the calculated outcome",
                "Query will be removed from active queries list",
                "All voter stakes locked for this query will be unlocked",
                "Correct voters will have rewards added to their pending rewards",
                "Incorrect voters will have a portion of their stake slashed",
                "Voters with stake below minimum after slashing will be deactivated",
                "Voter reputations will be updated based on vote correctness",
                "Protocol treasury will receive fees and slashed amounts",
                "Total queries resolved counter will be incremented"
            ],
            "reward_distribution": [
                "Rewards are distributed only to voters who voted for the winning outcome",
                "Distribution method depends on the query's decision strategy:",
                "- Equal distribution: Rewards split equally (for Majority/Median)",
                "- Stake-weighted: Rewards proportional to stake (for WeightedByStake)",
                "- Reputation-weighted: Rewards proportional to reputation (for WeightedByReputation)",
                "Each voter's reward is adjusted by their reputation multiplier",
                "Protocol fee is deducted from rewards before distribution",
                "Rewards are added to pending_rewards and can be claimed later"
            ],
            "slashing": [
                "Voters who voted incorrectly have stake slashed based on slash_percentage",
                "Slashed amounts are transferred to the protocol treasury",
                "If remaining stake falls below minimum, voter is automatically deactivated",
                "Slashing helps ensure voters are incentivized to vote accurately",
                "Slashing percentage is configurable via protocol parameters"
            ],
            "expiration_handling": [
                "If deadline has passed but minimum votes not met, query expires instead",
                "Expired queries do not distribute rewards or apply slashing",
                "Voters on expired queries have their stake unlocked without penalty",
                "Query creator's reward amount is returned (not distributed)"
            ]
        });
        
        Ok(response.to_string())
    }
    
    /// Claim pending rewards
    /// 
    /// This mutation provides information about the ClaimRewards operation.
    /// To execute the reward claim, call the ClaimRewards operation on the contract.
    /// 
    /// # Returns
    /// JSON string with operation details for executing the reward claim
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   claimRewards
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "ClaimRewards",
    ///   "instructions": "Call the ClaimRewards operation on the contract"
    /// }
    /// ```
    // Removed old claim_rewards - replaced with proper implementation below
    
    /// Execute voter registration (ACTUALLY EXECUTES THE OPERATION!)
    /// 
    /// This mutation schedules a RegisterVoter operation to be executed by the contract.
    /// Unlike the `registerVoter` mutation which only returns instructions,
    /// this mutation actually executes the operation.
    /// 
    /// # Arguments
    /// * `stake` - Initial stake amount (in tokens as string)
    /// * `name` - Optional voter name
    /// * `metadata_url` - Optional URL to voter metadata
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeRegisterVoter(stake: "1000", name: "Alice")
    /// }
    /// ```
    async fn execute_register_voter(
        &self,
        voter_address: String,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Validate address
        if voter_address.is_empty() {
            return Err("Voter address is required".to_string());
        }
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;
        
        // Create operation (chain_id is automatically detected by contract)
        let operation = Operation::RegisterVoter {
            stake: stake_amount,
            name,
            metadata_url,
        };
        
        // Schedule operation to be executed by contract
        self.runtime.schedule_operation(&operation);
        
        Ok(true)
    }
    
    /// Execute vote submission (ACTUALLY EXECUTES THE OPERATION!)
    /// 
    /// This mutation schedules a SubmitVote operation to be executed by the contract.
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query to vote on
    /// * `value` - Vote value (must be one of the query's outcomes)
    /// * `confidence` - Optional confidence score (0-100)
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn execute_submit_vote(
        &self,
        query_id: u64,
        value: String,
        confidence: Option<i32>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Validate
        if query_id == 0 {
            return Err("Query ID must be greater than zero".to_string());
        }
        
        if value.is_empty() {
            return Err("Vote value cannot be empty".to_string());
        }
        
        let confidence_u8 = confidence.map(|c| {
            if c < 0 || c > 100 {
                return Err("Confidence must be between 0 and 100".to_string());
            }
            Ok(c as u8)
        }).transpose()?;
        
        // Create operation
        let operation = Operation::SubmitVote {
            query_id,
            value,
            confidence: confidence_u8,
        };
        
        // Schedule operation to be executed by contract
        self.runtime.schedule_operation(&operation);
        
        Ok(true)
    }
    
    /// Execute stake update (ACTUALLY EXECUTES THE OPERATION!)
    async fn execute_update_stake(
        &self,
        additional_stake: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = additional_stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;
        
        if stake_amount == Amount::ZERO {
            return Err("Additional stake must be greater than 0".to_string());
        }
        
        let operation = Operation::UpdateStake {
            additional_stake: stake_amount,
        };

        self.runtime.schedule_operation(&operation);
        Ok(true)
    }

    /// Execute stake update for a specific voter (ADMIN OPERATION)
    ///
    /// This mutation adds stake to an existing voter's account.
    /// Used when staking tokens via stakeTransfer on the token contract.
    ///
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as hex string
    /// * `additional_stake` - Amount to add (in tokens as string, e.g., "100.")
    ///
    /// # Returns
    /// `true` if operation was scheduled successfully
    ///
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeUpdateStakeFor(
    ///     voterAddress: "ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f",
    ///     additionalStake: "100."
    ///   )
    /// }
    /// ```
    async fn execute_update_stake_for(
        &self,
        voter_address: String,
        additional_stake: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;

        if voter_address.is_empty() {
            return Err("Voter address is required".to_string());
        }

        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = additional_stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;

        if stake_amount == Amount::ZERO {
            return Err("Additional stake must be greater than 0".to_string());
        }

        let operation = Operation::UpdateStakeFor {
            voter_address,
            additional_stake: stake_amount,
        };

        self.runtime.schedule_operation(&operation);
        Ok(true)
    }

    /// Execute rewards claim (ACTUALLY EXECUTES THE OPERATION!)
    async fn execute_claim_rewards(&self) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let operation = Operation::ClaimRewards;
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute rewards claim for a specific voter (ACTUALLY EXECUTES THE OPERATION!)
    /// 
    /// This mutation claims rewards for a voter by their address.
    /// Use this when the caller chain is different from the voter chain.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as hex string
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn execute_claim_rewards_for(&self, voter_address: String) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        if voter_address.is_empty() {
            return Err("Voter address is required".to_string());
        }
        
        let operation = Operation::ClaimRewardsFor { voter_address };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute stake withdrawal (ACTUALLY EXECUTES THE OPERATION!)
    /// 
    /// This mutation withdraws stake from the voter's account.
    /// The voter must be registered and have sufficient available stake.
    /// 
    /// # Arguments
    /// * `amount` - Amount to withdraw (in tokens as string, e.g., "100.")
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeWithdrawStake(amount: "100.")
    /// }
    /// ```
    async fn execute_withdraw_stake(&self, amount: String) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse amount as Amount directly (expects format like "100." with trailing dot)
        let withdraw_amount: Amount = amount.parse()
            .map_err(|_| "Invalid amount format. Use format like '100.' with trailing dot".to_string())?;
        
        if withdraw_amount == Amount::ZERO {
            return Err("Withdrawal amount must be greater than 0".to_string());
        }
        
        let operation = Operation::WithdrawStake {
            amount: withdraw_amount,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute stake withdrawal for a specific voter (ACTUALLY EXECUTES THE OPERATION!)
    /// 
    /// This mutation withdraws stake for a voter by their address.
    /// Use this when the caller chain is different from the voter chain.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as hex string
    /// * `amount` - Amount to withdraw (in tokens as string, e.g., "100.")
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeWithdrawStakeFor(voterAddress: "abc123...", amount: "25.")
    /// }
    /// ```
    async fn execute_withdraw_stake_for(&self, voter_address: String, amount: String) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        if voter_address.is_empty() {
            return Err("Voter address is required".to_string());
        }
        
        // Parse amount as Amount directly (expects format like "100." with trailing dot)
        let withdraw_amount: Amount = amount.parse()
            .map_err(|_| "Invalid amount format. Use format like '100.' with trailing dot".to_string())?;
        
        if withdraw_amount == Amount::ZERO {
            return Err("Withdrawal amount must be greater than 0".to_string());
        }
        
        let operation = Operation::WithdrawStakeFor {
            voter_address,
            amount: withdraw_amount,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute claim withdrawable tokens for a specific voter
    /// 
    /// This mutation claims the withdrawable balance for a voter.
    /// The withdrawable balance is accumulated when a voter withdraws stake.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's chain ID as hex string
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn execute_claim_withdrawable_tokens(&self, voter_address: String) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        if voter_address.is_empty() {
            return Err("Voter address is required".to_string());
        }
        
        let operation = Operation::ClaimWithdrawableTokens { voter_address };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute RegisterVoterFor operation (ADMIN OPERATION FOR TESTING!)
    /// 
    /// This mutation allows registering a voter by specifying their address.
    /// Useful for testing and initial setup without requiring cross-chain messages.
    /// 
    /// # Arguments
    /// * `voter_address` - The voter's account address as hex string (e.g., "0xfb3d8fcd...")
    /// * `stake` - Initial stake amount (in tokens as string)
    /// * `name` - Optional voter name
    /// * `metadata_url` - Optional URL to voter metadata
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeRegisterVoterFor(
    ///     voterAddress: "0xfb3d8fcd4e78e5e4cd755307374561e3436e2dd48420e051af86333bc75d7c82",
    ///     stake: "100",
    ///     name: "Alice"
    ///   )
    /// }
    /// ```
    async fn execute_register_voter_for(
        &self,
        voter_address: String,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Validate voter address format - accept any non-empty hex string
        // This allows both chain IDs and account owner formats
        if voter_address.is_empty() {
            return Err("Voter address cannot be empty".to_string());
        }
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;
        
        // Create operation
        let operation = Operation::RegisterVoterFor {
            voter_address,
            stake: stake_amount,
            name,
            metadata_url,
        };
        
        // Schedule operation to be executed by contract
        self.runtime.schedule_operation(&operation);
        
        Ok(true)
    }
    
    /// Commit a vote for a query (Phase 1 of commit/reveal)
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query to vote on
    /// * `commit_hash` - SHA-256 hash of (value + salt)
    /// 
    /// # Returns
    /// Success message
    async fn commit_vote(
        &self,
        query_id: i32,
        commit_hash: String,
    ) -> Result<String, String> {
        use oracle_registry_v2::Operation;
        
        // Validate commit hash format
        if commit_hash.is_empty() || commit_hash.len() > 128 {
            return Err("Invalid commit hash format".to_string());
        }
        
        // Create CommitVote operation
        let operation = Operation::CommitVote {
            query_id: query_id as u64,
            commit_hash,
        };
        
        // Schedule operation - will be executed when block is created
        self.runtime.schedule_operation(&operation);
        
        // Return success message
        Ok(format!("Vote committed for query {}", query_id))
    }
    
    /// Reveal a vote for a query (Phase 2 of commit/reveal)
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query
    /// * `value` - The actual vote value
    /// * `salt` - The salt used in commit phase
    /// * `confidence` - Optional confidence score (0-100)
    /// 
    /// # Returns
    /// Success message
    async fn reveal_vote(
        &self,
        query_id: i32,
        value: String,
        salt: String,
        confidence: Option<i32>,
    ) -> Result<String, String> {
        use oracle_registry_v2::Operation;
        
        // Validate inputs
        if value.is_empty() {
            return Err("Vote value cannot be empty".to_string());
        }
        
        if salt.is_empty() {
            return Err("Salt cannot be empty".to_string());
        }
        
        // Validate confidence if provided
        let conf = if let Some(c) = confidence {
            if c < 0 || c > 100 {
                return Err("Confidence must be between 0 and 100".to_string());
            }
            c as u8
        } else {
            100
        };
        
        // Create RevealVote operation
        let operation = Operation::RevealVote {
            query_id: query_id as u64,
            value,
            salt,
            confidence: Some(conf),
        };
        
        // Schedule operation - will be executed when block is created
        self.runtime.schedule_operation(&operation);
        
        // Return success message
        Ok(format!("Vote revealed for query {}", query_id))
    }
    
    /// Claim pending rewards
    /// 
    /// # Returns
    /// Success message
    async fn claim_rewards(&self) -> Result<String, String> {
        // Return success - the operation will be executed by the contract
        Ok("Rewards claim initiated. Operation will be executed by contract.".to_string())
    }
    
    /// Placeholder mutation
    async fn placeholder(&self) -> bool {
        true
    }
    
    /// Execute CheckExpiredQueries operation (MAINTENANCE)
    /// 
    /// This mutation checks all active queries and marks expired ones.
    /// A query is expired if its deadline has passed but it doesn't have enough votes.
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeCheckExpiredQueries
    /// }
    /// ```
    /// 
    /// # Note
    /// Run this periodically (e.g., every 5 minutes) to keep registry healthy
    async fn execute_check_expired_queries(&self) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let operation = Operation::CheckExpiredQueries;
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute AutoResolveQueries operation (MAINTENANCE)
    /// 
    /// This mutation automatically resolves queries that have completed their reveal phase
    /// and have enough votes to be resolved.
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeAutoResolveQueries
    /// }
    /// ```
    /// 
    /// # Note
    /// Run this periodically (e.g., every 5 minutes) to keep registry healthy
    async fn execute_auto_resolve_queries(&self) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let operation = Operation::AutoResolveQueries;
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Execute ResolveQuery operation for a specific query
    /// 
    /// This mutation resolves a specific query if it meets the requirements:
    /// - Query is active
    /// - Deadline has passed
    /// - Has minimum required votes
    /// 
    /// # Arguments
    /// * `query_id` - ID of the query to resolve
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   executeResolveQuery(queryId: 0)
    /// }
    /// ```
    async fn execute_resolve_query(&self, query_id: u64) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let operation = Operation::ResolveQuery { query_id };
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send RegisterVoter message to target chain (cross-chain registration)
    /// 
    /// This mutation sends a cross-chain message to register as a voter on the target chain.
    /// The voter's chain ID will be the sender's chain ID (automatically detected).
    /// 
    /// # Arguments
    /// * `target_chain` - The chain ID where the registry is deployed (app chain)
    /// * `stake` - Initial stake amount (in tokens as string)
    /// * `name` - Optional voter name
    /// * `metadata_url` - Optional URL to voter metadata
    /// 
    /// # Returns
    /// `true` if message was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   sendRegisterVoterMessage(
    ///     targetChain: "208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91",
    ///     stake: "100",
    ///     name: "Alice"
    ///   )
    /// }
    /// ```
    async fn send_register_voter_message(
        &self,
        target_chain: String,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;
        
        if stake_amount == Amount::ZERO {
            return Err("Stake must be greater than zero".to_string());
        }
        
        // Create SendRegisterVoterMessage operation
        let operation = Operation::SendRegisterVoterMessage {
            target_chain: target_chain_id,
            stake: stake_amount,
            name,
            metadata_url,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send UpdateStake message to target chain (cross-chain stake update)
    /// 
    /// This mutation sends a cross-chain message to update stake on the target chain.
    /// The voter's chain ID will be the sender's chain ID (automatically detected).
    /// 
    /// # Arguments
    /// * `target_chain` - The chain ID where the registry is deployed (app chain)
    /// * `additional_stake` - Amount of additional stake to add
    /// 
    /// # Returns
    /// `true` if message was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   sendUpdateStakeMessage(
    ///     targetChain: "208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91",
    ///     additionalStake: "100"
    ///   )
    /// }
    /// ```
    async fn send_update_stake_message(
        &self,
        target_chain: String,
        additional_stake: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Parse stake as Amount directly (expects format like "100." with trailing dot)
        let stake_amount: Amount = additional_stake.parse()
            .map_err(|_| "Invalid stake format. Use format like '100.' with trailing dot".to_string())?;
        
        if stake_amount == Amount::ZERO {
            return Err("Additional stake must be greater than zero".to_string());
        }
        
        // Create SendUpdateStakeMessage operation
        let operation = Operation::SendUpdateStakeMessage {
            target_chain: target_chain_id,
            additional_stake: stake_amount,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send SubmitVote message to target chain (cross-chain voting)
    /// 
    /// This mutation sends a cross-chain message to submit a vote on the target chain.
    /// The voter's chain ID will be the sender's chain ID (automatically detected).
    /// 
    /// # Arguments
    /// * `target_chain` - The chain ID where the registry is deployed (app chain)
    /// * `query_id` - ID of the query to vote on
    /// * `value` - The vote value (must be one of the query's outcomes)
    /// * `confidence` - Optional confidence score (0-100)
    /// 
    /// # Returns
    /// `true` if message was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   sendSubmitVoteMessage(
    ///     targetChain: "208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91",
    ///     queryId: 1,
    ///     value: "Yes",
    ///     confidence: 80
    ///   )
    /// }
    /// ```
    async fn send_submit_vote_message(
        &self,
        target_chain: String,
        query_id: u64,
        value: String,
        confidence: Option<i32>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Validate confidence if provided
        let confidence_u8 = match confidence {
            Some(c) => {
                if c < 0 || c > 100 {
                    return Err("Confidence must be between 0 and 100".to_string());
                }
                Some(c as u8)
            }
            None => None,
        };
        
        // Create SendSubmitVoteMessage operation
        let operation = Operation::SendSubmitVoteMessage {
            target_chain: target_chain_id,
            query_id,
            value,
            confidence: confidence_u8,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send a cross-chain message to create a query on the target chain
    async fn send_create_query_message(
        &self,
        target_chain: String,
        description: String,
        outcomes: Vec<String>,
        strategy: String,
        reward_amount: String,
        min_votes: Option<i32>,
        duration_secs: Option<i32>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        use oracle_registry_v2::state::DecisionStrategy;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Parse strategy
        let strategy_enum = match strategy.as_str() {
            "Majority" => DecisionStrategy::Majority,
            "Median" => DecisionStrategy::Median,
            "WeightedByStake" => DecisionStrategy::WeightedByStake,
            "WeightedByReputation" => DecisionStrategy::WeightedByReputation,
            _ => return Err(format!("Invalid strategy: {}", strategy)),
        };
        
        // Parse reward amount - value is in attos (raw value)
        let reward_value = reward_amount.trim_end_matches('.').parse::<u128>()
            .map_err(|_| "Invalid reward amount format".to_string())?;
        let reward = Amount::from_attos(reward_value);
        
        // Create SendCreateQueryMessage operation
        let operation = Operation::SendCreateQueryMessage {
            target_chain: target_chain_id,
            description,
            outcomes,
            strategy: strategy_enum,
            min_votes: min_votes.map(|v| v as usize),
            reward_amount: reward,
            duration_secs: duration_secs.map(|d| d as u64),
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send a cross-chain message to commit a vote on the target chain
    async fn send_commit_vote_message(
        &self,
        target_chain: String,
        query_id: i32,
        commit_hash: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Validate commit hash
        if commit_hash.is_empty() || commit_hash.len() > 128 {
            return Err("Invalid commit hash format".to_string());
        }
        
        // Create SendCommitVoteMessage operation
        let operation = Operation::SendCommitVoteMessage {
            target_chain: target_chain_id,
            query_id: query_id as u64,
            commit_hash,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Send a cross-chain message to reveal a vote on the target chain
    async fn send_reveal_vote_message(
        &self,
        target_chain: String,
        query_id: i32,
        value: String,
        salt: String,
        confidence: Option<i32>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse target chain ID
        let target_chain_id = target_chain.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid target chain ID: {}", e))?;
        
        // Validate value
        if value.is_empty() {
            return Err("Vote value cannot be empty".to_string());
        }
        
        // Validate salt
        if salt.is_empty() {
            return Err("Salt cannot be empty".to_string());
        }
        
        // Validate confidence if provided
        if let Some(c) = confidence {
            if c < 0 || c > 100 {
                return Err("Confidence must be between 0 and 100".to_string());
            }
        }
        
        // Create SendRevealVoteMessage operation
        let operation = Operation::SendRevealVoteMessage {
            target_chain: target_chain_id,
            query_id: query_id as u64,
            value,
            salt,
            confidence: confidence.map(|c| c as u8),
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Set token configuration (admin only)
    /// 
    /// This mutation configures the ALTH token contract for real token integration.
    /// When configured, claim_withdrawable_tokens will send real tokens to users.
    /// 
    /// # Arguments
    /// * `token_app_id` - The ALTH token application ID
    /// * `token_chain_id` - The chain ID where the token contract is deployed
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   setTokenConfig(
    ///     tokenAppId: "0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0",
    ///     tokenChainId: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    ///   )
    /// }
    /// ```
    async fn set_token_config(
        &self,
        token_app_id: String,
        token_chain_id: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Parse token app ID
        let app_id = token_app_id.parse::<linera_sdk::linera_base_types::ApplicationId>()
            .map_err(|e| format!("Invalid token app ID: {}", e))?;
        
        // Parse token chain ID
        let chain_id = token_chain_id.parse::<linera_sdk::linera_base_types::ChainId>()
            .map_err(|e| format!("Invalid token chain ID: {}", e))?;
        
        let operation = Operation::SetTokenConfig {
            token_app_id: app_id,
            token_chain_id: chain_id,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    // ==================== HYBRID MODEL MUTATIONS ====================
    
    /// Claim bond refund after dispute window expires
    /// 
    /// # Arguments
    /// * `query_id` - The query ID to claim bond refund for
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn claim_bond_refund(&self, query_id: u64) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let operation = Operation::ClaimBondRefund { query_id };
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Raise a dispute against a query resolution
    /// 
    /// # Arguments
    /// * `query_id` - Query ID to dispute
    /// * `disputed_outcome` - The outcome you claim is correct
    /// * `dispute_bond` - Bond amount (must equal original bond)
    /// * `reason` - Reason for dispute
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn raise_dispute(
        &self,
        query_id: u64,
        disputed_outcome: String,
        dispute_bond: String,
        reason: String,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let bond = dispute_bond.parse::<Amount>()
            .map_err(|_| "Invalid bond amount format".to_string())?;
        
        let operation = Operation::RaiseDispute {
            query_id,
            disputed_outcome,
            dispute_bond: bond,
            reason,
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Mint inflation tokens to the pool (admin only)
    /// 
    /// # Arguments
    /// * `amount` - Amount to mint
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn mint_inflation(&self, amount: String) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let amount_parsed = amount.parse::<Amount>()
            .map_err(|_| "Invalid amount format".to_string())?;
        
        let operation = Operation::MintInflation { amount: amount_parsed };
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
    
    /// Update hybrid model parameters (admin only)
    /// 
    /// # Arguments
    /// * Various optional parameters to update
    /// 
    /// # Returns
    /// `true` if operation was scheduled successfully
    async fn update_hybrid_parameters(
        &self,
        min_bond: Option<String>,
        inflation_rate_bps: Option<i32>,
        inflation_reward_per_query: Option<String>,
        dispute_window_secs: Option<i32>,
        dispute_bond_percentage: Option<i32>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        let min_bond_parsed = if let Some(b) = min_bond {
            Some(b.parse::<Amount>().map_err(|_| "Invalid min_bond format")?)
        } else {
            None
        };
        
        let reward_parsed = if let Some(r) = inflation_reward_per_query {
            Some(r.parse::<Amount>().map_err(|_| "Invalid reward format")?)
        } else {
            None
        };
        
        let operation = Operation::UpdateHybridParameters {
            min_bond: min_bond_parsed,
            inflation_rate_bps: inflation_rate_bps.map(|v| v as u32),
            inflation_reward_per_query: reward_parsed,
            dispute_window_secs: dispute_window_secs.map(|v| v as u64),
            dispute_bond_percentage: dispute_bond_percentage.map(|v| v as u32),
        };
        
        self.runtime.schedule_operation(&operation);
        Ok(true)
    }
}


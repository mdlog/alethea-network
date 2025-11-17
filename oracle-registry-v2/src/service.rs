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
    
    /// Query status (Active, Resolved, Expired, Cancelled)
    pub status: String,
    
    /// Resolved result (if resolved)
    pub result: Option<String>,
    
    /// Resolution timestamp (ISO 8601 format, if resolved)
    pub resolved_at: Option<String>,
    
    /// Number of votes submitted
    pub vote_count: u32,
    
    /// Time remaining until deadline (in seconds, 0 if expired)
    pub time_remaining: i64,
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
        let state = OracleRegistryV2::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        OracleRegistryV2Service { 
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

impl Voter {
    /// Convert from state VoterInfo to GraphQL Voter
    fn from_voter_info(
        info: state::VoterInfo,
        available_stake: linera_sdk::linera_base_types::Amount,
        state: &OracleRegistryV2,
    ) -> Self {
        let accuracy_percentage = if info.total_votes > 0 {
            (info.correct_votes as f64 / info.total_votes as f64) * 100.0
        } else {
            0.0
        };
        
        let reputation_tier = state.get_reputation_tier(info.reputation).to_string();
        let reputation_weight = state.calculate_reputation_weight(info.reputation);
        
        // Convert timestamp to ISO 8601 string
        let registered_at = format!("{:?}", info.registered_at);
        
        Self {
            address: format!("{:?}", info.address),
            stake: info.stake.to_string(),
            locked_stake: info.locked_stake.to_string(),
            available_stake: available_stake.to_string(),
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
            state::QueryStatus::Expired => "Expired",
            state::QueryStatus::Cancelled => "Cancelled",
        }.to_string();
        
        // Convert timestamps to ISO 8601 strings
        let created_at = format!("{:?}", query.created_at);
        let deadline = format!("{:?}", query.deadline);
        let resolved_at = query.resolved_at.map(|ts| format!("{:?}", ts));
        
        // Calculate time remaining until deadline
        let time_remaining = if current_time < query.deadline {
            let delta = query.deadline.delta_since(current_time);
            (delta.as_micros() / 1_000_000) as i64 // Convert microseconds to seconds
        } else {
            0
        };
        
        Self {
            id: query.id,
            description: query.description,
            outcomes: query.outcomes,
            strategy,
            min_votes: query.min_votes as u32,
            reward_amount: query.reward_amount.to_string(),
            creator: format!("{:?}", query.creator),
            created_at,
            deadline,
            status,
            result: query.result,
            resolved_at,
            vote_count: vote_count as u32,
            time_remaining,
        }
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
        // Parse the address string to AccountOwner
        // The address format should be parseable by the AccountOwner type
        let account_owner = address.parse::<linera_sdk::linera_base_types::AccountOwner>()
            .map_err(|e| format!("Invalid address format: {}", e))?;
        
        // Get voter info from state
        let voter_info = match self.state.get_voter(&account_owner).await {
            Some(info) => info,
            None => return Ok(None), // Voter not found
        };
        
        // Get available stake (total stake - locked stake)
        let available_stake = self.state.get_available_stake(&account_owner).await;
        
        // Convert to GraphQL Voter type
        let voter = Voter::from_voter_info(voter_info, available_stake, &self.state);
        
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
            
            // Convert to GraphQL Voter type
            let voter = Voter::from_voter_info(voter_info, available_stake, &self.state);
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
        let account_owner = address.parse::<linera_sdk::linera_base_types::AccountOwner>()
            .map_err(|e| format!("Invalid address format: {}", e))?;
        
        let voter_info = match self.state.get_voter(&account_owner).await {
            Some(info) => info,
            None => return Ok(None),
        };
        
        let available_stake = self.state.get_available_stake(&account_owner).await;
        let voter = Voter::from_voter_info(voter_info, available_stake, &self.state);
        
        Ok(Some(voter))
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
    /// JSON string with operation details for executing the registration
    /// 
    /// # Example
    /// ```graphql
    /// mutation {
    ///   registerVoter(stake: "1000", name: "Alice")
    /// }
    /// ```
    /// 
    /// Returns:
    /// ```json
    /// {
    ///   "operation": "RegisterVoter",
    ///   "stake": "1000",
    ///   "name": "Alice",
    ///   "instructions": "Call the RegisterVoter operation on the contract"
    /// }
    /// ```
    async fn register_voter(
        &self,
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<String, String> {
        // Validate stake format
        let stake_value = stake.parse::<u128>()
            .map_err(|_| "Invalid stake format: must be a valid number".to_string())?;
        
        if stake_value < 100 {
            return Err("Minimum stake is 100 tokens".to_string());
        }
        
        // ⚠️ IMPORTANT: In Linera account-based model, GraphQL mutations cannot directly
        // execute operations. Operations must be executed through:
        // 1. Contract operations (via linera CLI or SDK)
        // 2. Cross-chain messages
        // 3. Backend API with proper wallet integration
        //
        // This mutation returns operation details that can be used to execute the operation.
        // For automatic execution, use the backend API or implement proper SDK integration.
        
        // Build response with operation details
        let mut response = serde_json::json!({
            "operation": "RegisterVoter",
            "stake": stake,
            "instructions": "To execute this operation, use one of the following methods:\n\
                1. Backend API: POST /api/execute/register-voter with this data\n\
                2. Linera CLI: linera project test (for testing)\n\
                3. SDK Integration: Call contract operation directly",
            "requirements": [
                "Voter must not be already registered",
                "Stake must be at least 100 tokens",
                "Voter must have sufficient balance to stake"
            ],
            "execution_methods": {
                "backend_api": {
                    "url": "http://localhost:3001/api/execute/register-voter",
                    "method": "POST",
                    "body": {
                        "stake": stake,
                        "name": name.clone(),
                        "metadata_url": metadata_url.clone()
                    }
                },
                "cli": "cd oracle-registry-v2 && linera project test",
                "note": "GraphQL mutations in account-based Linera return instructions, not execute operations"
            }
        });
        
        // Add optional fields if provided
        if let Some(n) = name {
            response["name"] = serde_json::json!(n);
        }
        if let Some(url) = metadata_url {
            response["metadata_url"] = serde_json::json!(url);
        }
        
        Ok(response.to_string())
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
    ///     rewardAmount: "1000000"
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
        
        // Build response with operation details
        let mut response = serde_json::json!({
            "operation": "CreateQuery",
            "description": description,
            "outcomes": outcomes,
            "strategy": strategy,
            "reward_amount": reward_amount,
            "instructions": "Call the CreateQuery operation on the contract with these parameters",
            "requirements": [
                "Caller must have sufficient balance to fund the reward amount",
                "Description must be 1-1000 characters",
                "At least one outcome must be provided (max 100)",
                "Each outcome must be 1-200 characters and unique",
                "Strategy must be one of: Majority, Median, WeightedByStake, WeightedByReputation",
                "Reward amount must be greater than zero",
                "If deadline is provided, it must be in the future"
            ],
            "effects": [
                "A new query will be created with a unique ID",
                "The query will be added to the active queries list",
                "The reward amount will be transferred from the creator to the contract",
                "Voters can start submitting votes immediately"
            ]
        });
        
        // Add optional fields if provided
        if let Some(mv) = min_votes {
            response["min_votes"] = serde_json::json!(mv);
        }
        if let Some(dl) = deadline {
            response["deadline"] = serde_json::json!(dl);
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
    async fn claim_rewards(&self) -> Result<String, String> {
        // Build response with operation details
        let response = serde_json::json!({
            "operation": "ClaimRewards",
            "instructions": "Call the ClaimRewards operation on the contract to claim all pending rewards",
            "requirements": [
                "Voter must be registered and active",
                "Voter must have pending rewards greater than zero",
                "Pending rewards accumulate when queries are resolved and voter voted correctly"
            ],
            "effects": [
                "All pending rewards will be transferred to the voter's account",
                "Pending rewards balance will be reset to zero",
                "Total rewards distributed counter will be incremented by the claimed amount",
                "Voter will receive tokens equal to their pending rewards"
            ],
            "reward_sources": [
                "Rewards are earned by voting correctly on resolved queries",
                "Reward amount depends on:",
                "  - Query's reward pool",
                "  - Number of correct voters (rewards are shared)",
                "  - Voter's reputation (higher reputation = higher reward multiplier)",
                "  - Voter's stake (for stake-weighted strategies)",
                "  - Protocol fee (deducted from rewards)"
            ],
            "best_practices": [
                "Check pending rewards before claiming to avoid unnecessary transactions",
                "Claim rewards regularly to free up the reward pool",
                "Rewards can accumulate from multiple resolved queries",
                "No time limit on claiming rewards - they remain pending until claimed"
            ],
            "notes": [
                "This operation can only be called by the voter themselves",
                "Rewards must be claimed before deregistering as a voter",
                "If voter has no pending rewards, the operation will fail with an error"
            ]
        });
        
        Ok(response.to_string())
    }
    
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
        stake: String,
        name: Option<String>,
        metadata_url: Option<String>,
    ) -> Result<bool, String> {
        use oracle_registry_v2::Operation;
        
        // Validate stake
        let stake_value = stake.parse::<u128>()
            .map_err(|_| "Invalid stake format: must be a valid number".to_string())?;
        
        if stake_value < 100 {
            return Err("Minimum stake is 100 tokens".to_string());
        }
        
        let stake_amount = Amount::from_tokens(stake_value);
        
        // Create operation
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
        
        let stake_value = additional_stake.parse::<u128>()
            .map_err(|_| "Invalid stake format".to_string())?;
        
        if stake_value == 0 {
            return Err("Additional stake must be greater than 0".to_string());
        }
        
        let stake_amount = Amount::from_tokens(stake_value);
        
        let operation = Operation::UpdateStake {
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
        
        // Validate voter address format
        if !voter_address.starts_with("0x") || voter_address.len() != 66 {
            return Err("Invalid voter address format. Must be 0x followed by 64 hex characters".to_string());
        }
        
        // Validate stake
        let stake_value = stake.parse::<u128>()
            .map_err(|_| "Invalid stake format: must be a valid number".to_string())?;
        
        if stake_value < 100 {
            return Err("Minimum stake is 100 tokens".to_string());
        }
        
        let stake_amount = Amount::from_tokens(stake_value);
        
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
    
    /// Placeholder mutation
    async fn placeholder(&self) -> bool {
        true
    }
}


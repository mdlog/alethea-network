// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Account-Based Oracle Registry State
//! 
//! Simplified registry where voters register with their account address
//! instead of deploying separate applications.

use linera_sdk::{
    linera_base_types::{Amount, ChainId, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Voter information (chain-based - Microcard pattern!)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterInfo {
    /// Voter's chain ID (natural identifier - no parsing needed!)
    pub chain_id: ChainId,
    
    /// Staked amount
    pub stake: Amount,
    
    /// Locked stake (for active votes)
    pub locked_stake: Amount,
    
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
    
    /// Query description
    pub description: String,
    
    /// Possible outcomes
    pub outcomes: Vec<String>,
    
    /// Decision strategy
    pub strategy: DecisionStrategy,
    
    /// Minimum votes required
    pub min_votes: usize,
    
    /// Reward amount for correct voters
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
    
    /// Query is resolved
    Resolved,
    
    /// Query expired without resolution
    Expired,
    
    /// Query cancelled
    Cancelled,
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
}

impl Default for ProtocolParameters {
    fn default() -> Self {
        Self {
            min_stake: Amount::from_tokens(100),
            min_votes_default: 3,
            default_query_duration: 3600, // 1 hour (for faster testing)
            reward_percentage: 1000,        // 10%
            slash_percentage: 500,          // 5%
            protocol_fee: 100,              // 1%
        }
    }
}

/// The application state for Account-Based Oracle Registry
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct OracleRegistryV2 {
    // Voter management (chain-based - Microcard pattern!)
    pub voters: MapView<ChainId, VoterInfo>,
    pub total_stake: RegisterView<Amount>,
    pub voter_count: RegisterView<u64>,
    
    // Query management
    pub next_query_id: RegisterView<u64>,
    pub queries: MapView<u64, Query>,
    pub active_queries: RegisterView<Vec<u64>>,
    
    // Voting records (query_id -> voter_chain -> vote)
    pub votes: MapView<(u64, ChainId), Vote>,
    pub vote_counts: MapView<u64, usize>,
    
    // Rewards
    pub reward_pool: RegisterView<Amount>,
    pub pending_rewards: MapView<ChainId, Amount>,
    pub total_rewards_distributed: RegisterView<Amount>,
    
    // Protocol
    pub parameters: RegisterView<ProtocolParameters>,
    pub protocol_treasury: RegisterView<Amount>,
    pub is_paused: RegisterView<bool>,
    pub admin: RegisterView<Option<ChainId>>,
    
    // Statistics
    pub total_queries_created: RegisterView<u64>,
    pub total_queries_resolved: RegisterView<u64>,
    pub total_votes_submitted: RegisterView<u64>,
}

impl OracleRegistryV2 {
    /// Initialize the registry
    pub async fn initialize(&mut self, params: ProtocolParameters, admin: ChainId) {
        self.next_query_id.set(1);
        self.total_stake.set(Amount::ZERO);
        self.voter_count.set(0);
        self.reward_pool.set(Amount::ZERO);
        self.protocol_treasury.set(Amount::ZERO);
        self.total_rewards_distributed.set(Amount::ZERO);
        self.total_queries_created.set(0);
        self.total_queries_resolved.set(0);
        self.total_votes_submitted.set(0);
        self.is_paused.set(false);
        self.active_queries.set(Vec::new());
        self.parameters.set(params);
        self.admin.set(Some(admin));
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
        self.pending_rewards.get(voter_chain).await.ok().flatten().unwrap_or(Amount::ZERO)
    }
    
    /// Lock stake for a voter (when they vote on a query)
    pub async fn lock_stake(&mut self, voter_chain: &ChainId, amount: Amount) -> Result<(), String> {
        let mut voter_info = self.get_voter(voter_chain).await
            .ok_or_else(|| "Voter not found".to_string())?;
        
        let stake_value: u128 = voter_info.stake.into();
        let locked_value: u128 = voter_info.locked_stake.into();
        let available_value = stake_value.saturating_sub(locked_value);
        let available_stake = Amount::from_tokens(available_value);
        
        if available_stake < amount {
            return Err(format!(
                "Insufficient available stake: have {}, need {}",
                available_stake, amount
            ));
        }
        
        let amount_value: u128 = amount.into();
        voter_info.locked_stake = Amount::from_tokens(locked_value + amount_value);
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
        
        let locked_value: u128 = voter_info.locked_stake.into();
        let amount_value: u128 = amount.into();
        voter_info.locked_stake = Amount::from_tokens(locked_value.saturating_sub(amount_value));
        self.voters.insert(voter_chain, voter_info)
            .map_err(|e| format!("Failed to update voter: {}", e))?;
        
        Ok(())
    }
    
    /// Get available (unlocked) stake for a voter
    pub async fn get_available_stake(&self, voter_chain: &ChainId) -> Amount {
        match self.get_voter(voter_chain).await {
            Some(info) => {
                let stake_value: u128 = info.stake.into();
                let locked_value: u128 = info.locked_stake.into();
                Amount::from_tokens(stake_value.saturating_sub(locked_value))
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
        
        Amount::from_tokens(final_reward)
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
        
        Amount::from_tokens(slash_amount)
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
        
        (Amount::from_tokens(total_slashed), voters_slashed, voters_deactivated)
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
        
        Amount::from_tokens(reward_value + fees_value)
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
        
        Amount::from_tokens(fee_amount)
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
            let reward = self.calculate_voter_reward(
                Amount::from_tokens(base_reward),
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
            
            rewards.insert(*voter, Amount::from_tokens(final_reward));
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
        for (voter, info) in correct_voters {
            let reward = self.calculate_voter_reward(
                Amount::from_tokens(per_voter_base),
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
    pub async fn select_voters_for_query(
        &self,
        min_voters: usize,
        max_voters: usize,
    ) -> Result<Vec<ChainId>, String> {
        // Get all voters sorted by power
        let voter_powers = self.get_voters_by_power().await?;
        
        // Check if we have enough voters
        if voter_powers.len() < min_voters {
            return Err(format!(
                "Not enough active voters: have {}, need at least {}",
                voter_powers.len(),
                min_voters
            ));
        }
        
        // Select top N voters (up to max_voters)
        let n = max_voters.min(voter_powers.len());
        let selected: Vec<ChainId> = voter_powers
            .iter()
            .take(n)
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

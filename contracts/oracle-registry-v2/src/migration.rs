// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Migration module for importing data from old registry to new account-based registry
//! 
//! This module provides functionality to:
//! - Parse export data from old registry
//! - Validate migration data
//! - Import queries with proper validation
//! - Map old voter IDs to new account addresses

use linera_sdk::linera_base_types::{AccountOwner, Amount, Timestamp, ChainId};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::str::FromStr;

use crate::state::{Query, QueryStatus, DecisionStrategy, Vote, VotingPhase};

// ==================== EXPORT DATA STRUCTURES ====================

/// Complete export from old registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryExport {
    pub metadata: ExportMetadata,
    pub voters: Vec<OldVoterData>,
    pub active_markets: Vec<OldMarketData>,
    pub statistics: ExportStatistics,
    pub parameters: ExportParameters,
}

/// Export metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportMetadata {
    pub exported_at: u64,
    pub registry_chain_id: String,
    pub registry_app_id: String,
    pub version: String,
    pub total_voters: u64,
    pub total_active_markets: u64,
    pub notes: String,
}

/// Old voter data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OldVoterData {
    #[serde(rename = "appId")]
    pub app_id: String,
    #[serde(rename = "chainId")]
    pub chain_id: String,
    pub owner: String,
    pub stake: String,
    #[serde(rename = "lockedStake")]
    pub locked_stake: String,
    #[serde(rename = "registeredAt")]
    pub registered_at: u64,
    #[serde(rename = "lastActive")]
    pub last_active: u64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    pub reputation: OldReputationData,
    #[serde(rename = "pendingRewards")]
    pub pending_rewards: String,
}

/// Old reputation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OldReputationData {
    pub score: u64,
    #[serde(rename = "totalVotes")]
    pub total_votes: u32,
    #[serde(rename = "correctVotes")]
    pub correct_votes: u32,
    #[serde(rename = "incorrectVotes")]
    pub incorrect_votes: u32,
    #[serde(rename = "correctStreak")]
    pub correct_streak: u32,
    #[serde(rename = "lastUpdated")]
    pub last_updated: u64,
}

/// Old market/query data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OldMarketData {
    pub id: u64,
    #[serde(rename = "requesterApp")]
    pub requester_app: Option<String>,
    #[serde(rename = "requesterChain")]
    pub requester_chain: Option<String>,
    pub question: Option<String>,
    pub description: Option<String>,
    pub outcomes: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    pub deadline: u64,
    #[serde(rename = "feePaid")]
    pub fee_paid: Option<String>,
    #[serde(rename = "reward_amount")]
    pub reward_amount: Option<String>,
    pub status: String,
    pub votes: Option<Vec<OldVoteData>>,
    #[serde(rename = "selectedVoters")]
    pub selected_voters: Option<Vec<String>>,
}

/// Old vote data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OldVoteData {
    #[serde(rename = "voterApp")]
    pub voter_app: String,
    #[serde(rename = "voterOwner")]
    pub voter_owner: String,
    #[serde(rename = "outcomeIndex")]
    pub outcome_index: Option<usize>,
    pub value: Option<String>,
    pub confidence: Option<u8>,
    pub timestamp: u64,
    #[serde(rename = "stakeLocked")]
    pub stake_locked: Option<String>,
}

/// Export statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportStatistics {
    #[serde(rename = "totalMarketsCreated")]
    pub total_markets_created: Option<u64>,
    #[serde(rename = "totalMarketsResolved")]
    pub total_markets_resolved: Option<u64>,
    #[serde(rename = "totalFeesCollected")]
    pub total_fees_collected: Option<String>,
    #[serde(rename = "totalStake")]
    pub total_stake: Option<String>,
    #[serde(rename = "totalLockedStake")]
    pub total_locked_stake: Option<String>,
    #[serde(rename = "totalRewardsDistributed")]
    pub total_rewards_distributed: Option<String>,
}

/// Export parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportParameters {
    #[serde(rename = "minStake")]
    pub min_stake: Option<String>,
    #[serde(rename = "minVotersPerMarket")]
    pub min_voters_per_market: Option<u32>,
    #[serde(rename = "maxVotersPerMarket")]
    pub max_voters_per_market: Option<u32>,
}

// ==================== MIGRATION STRUCTURES ====================

/// Query migration result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMigrationResult {
    pub old_id: u64,
    pub new_id: Option<u64>,
    pub status: MigrationStatus,
    pub error: Option<String>,
}

/// Migration status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MigrationStatus {
    Success,
    Skipped,
    Failed,
}

/// Migration options
#[derive(Debug, Clone)]
pub struct MigrationOptions {
    /// Only import active queries with future deadlines
    pub safe_mode: bool,
    /// Skip queries that already exist
    pub skip_existing: bool,
    /// Validate all data before import
    pub validate_data: bool,
    /// Current timestamp for deadline validation
    pub current_time: Timestamp,
}

impl Default for MigrationOptions {
    fn default() -> Self {
        Self {
            safe_mode: true,
            skip_existing: true,
            validate_data: true,
            current_time: Timestamp::from(0),
        }
    }
}

/// Voter ID mapping (old app_id -> new account address)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterMapping {
    pub mappings: BTreeMap<String, String>,
}

impl VoterMapping {
    /// Create new empty mapping
    pub fn new() -> Self {
        Self {
            mappings: BTreeMap::new(),
        }
    }
    
    /// Add a mapping
    pub fn add(&mut self, old_app_id: String, new_address: String) {
        self.mappings.insert(old_app_id, new_address);
    }
    
    /// Get new address for old app ID
    pub fn get(&self, old_app_id: &str) -> Option<&String> {
        self.mappings.get(old_app_id)
    }
    
    /// Load from JSON
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse voter mapping: {}", e))
    }
    
    /// Save to JSON
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize voter mapping: {}", e))
    }
}

impl Default for VoterMapping {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== MIGRATION FUNCTIONS ====================

impl RegistryExport {
    /// Load export from JSON string
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse export data: {}", e))
    }
    
    /// Validate export data
    pub fn validate(&self) -> Result<(), String> {
        // Validate metadata
        if self.metadata.version.is_empty() {
            return Err("Export version is empty".to_string());
        }
        
        // Validate voters
        for voter in &self.voters {
            if voter.owner.is_empty() {
                return Err("Voter owner is empty".to_string());
            }
        }
        
        // Validate markets
        for market in &self.active_markets {
            if market.outcomes.is_empty() {
                return Err(format!("Market {} has no outcomes", market.id));
            }
            
            let question = market.question.as_ref()
                .or(market.description.as_ref())
                .ok_or_else(|| format!("Market {} has no question/description", market.id))?;
            
            if question.is_empty() {
                return Err(format!("Market {} has empty question", market.id));
            }
        }
        
        Ok(())
    }
    
    /// Get active queries that should be migrated
    pub fn get_migratable_queries(&self, options: &MigrationOptions) -> Vec<&OldMarketData> {
        self.active_markets
            .iter()
            .filter(|market| {
                // Check status
                let is_active = market.status == "ACTIVE" || market.status == "Active";
                if !is_active {
                    return false;
                }
                
                // In safe mode, check deadline
                if options.safe_mode {
                    let deadline = Timestamp::from(market.deadline);
                    if deadline <= options.current_time {
                        return false;
                    }
                }
                
                true
            })
            .collect()
    }
}

impl OldMarketData {
    /// Convert to new Query structure
    pub fn to_query(&self, new_id: u64, creator: AccountOwner) -> Result<Query, String> {
        // Get question/description
        let description = self.question.as_ref()
            .or(self.description.as_ref())
            .ok_or_else(|| format!("Market {} has no question/description", self.id))?
            .clone();
        
        // Parse reward amount
        let reward_str = self.fee_paid.as_ref()
            .or(self.reward_amount.as_ref())
            .ok_or_else(|| format!("Market {} has no reward amount", self.id))?;
        
        let reward_amount = parse_amount(reward_str)?;
        
        // Convert timestamps
        let created_at = Timestamp::from(self.created_at);
        let deadline = Timestamp::from(self.deadline);
        
        // Default strategy (can be enhanced based on old market data)
        let strategy = DecisionStrategy::Majority;
        
        // Default min votes
        let min_votes = 3;
        
        // Calculate commit/reveal phases (50/50 split of remaining time)
        let time_remaining = deadline.delta_since(created_at);
        let half_duration = time_remaining.as_micros() / 2;
        let commit_phase_end = created_at.saturating_add(linera_sdk::linera_base_types::TimeDelta::from_micros(half_duration));
        let reveal_phase_end = commit_phase_end.saturating_add(linera_sdk::linera_base_types::TimeDelta::from_micros(half_duration));
        
        // Migration: creator is AccountOwner but Query needs ChainId
        // For migration, we'll use a placeholder ChainId since we can't convert AccountOwner to ChainId
        // In production, this should be properly mapped
        let creator_chain = ChainId::from_str(
            "0000000000000000000000000000000000000000000000000000000000000000"
        ).expect("Invalid placeholder ChainId");
        
        // Create query
        Ok(Query {
            id: new_id,
            description,
            outcomes: self.outcomes.clone(),
            strategy,
            min_votes,
            reward_amount,
            creator: creator_chain,
            created_at,
            deadline,
            commit_phase_end,
            reveal_phase_end,
            phase: VotingPhase::Completed, // Migration: old queries are completed
            status: QueryStatus::Active,
            result: None,
            resolved_at: None,
            commits: BTreeMap::new(), // Migration: no commits for old queries
            votes: BTreeMap::new(),
            selected_voters: Vec::new(), // Migration: no selected voters for old queries
            max_voters: min_votes * 2,   // Migration: default max voters
            callback_chain: None,        // Migration: old queries don't have callbacks
            callback_data: None,         // Migration: old queries don't have callbacks
        })
    }
    
    /// Convert old votes to new Vote structures
    pub fn convert_votes(&self, voter_mapping: &VoterMapping) -> Result<Vec<(ChainId, Vote)>, String> {
        let votes = match &self.votes {
            Some(v) => v,
            None => return Ok(Vec::new()),
        };
        
        let mut converted_votes = Vec::new();
        
        for old_vote in votes {
            // Map old voter app ID to new account address
            let voter_address_str = voter_mapping
                .get(&old_vote.voter_app)
                .or_else(|| {
                    // Fallback to voter_owner if mapping not found
                    if !old_vote.voter_owner.is_empty() {
                        Some(&old_vote.voter_owner)
                    } else {
                        None
                    }
                })
                .ok_or_else(|| format!("No mapping found for voter {}", old_vote.voter_app))?;
            
            // Parse chain ID from voter address
            let voter_chain = parse_chain_id(voter_address_str)?;
            
            // Get vote value
            let value = if let Some(idx) = old_vote.outcome_index {
                // Use outcome index to get value from outcomes
                self.outcomes.get(idx)
                    .ok_or_else(|| format!("Invalid outcome index: {}", idx))?
                    .clone()
            } else if let Some(ref v) = old_vote.value {
                v.clone()
            } else {
                return Err("Vote has no value or outcome index".to_string());
            };
            
            // Create new vote
            let vote = Vote {
                voter: voter_chain,
                value,
                timestamp: Timestamp::from(old_vote.timestamp),
                salt: None, // Migration: old votes don't have salt
                confidence: old_vote.confidence,
            };
            
            converted_votes.push((voter_chain, vote));
        }
        
        Ok(converted_votes)
    }
}

// ==================== BALANCE TRANSFER ====================

/// Balance transfer result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceTransferResult {
    pub voter_address: String,
    pub amount: String,
    pub status: MigrationStatus,
    pub error: Option<String>,
}

/// Balance transfer options
#[derive(Debug, Clone)]
pub struct BalanceTransferOptions {
    /// Only transfer non-zero balances
    pub skip_zero_balances: bool,
    /// Only transfer for active voters
    pub active_voters_only: bool,
    /// Validate voter exists in new registry before transfer
    pub validate_voter_exists: bool,
}

impl Default for BalanceTransferOptions {
    fn default() -> Self {
        Self {
            skip_zero_balances: true,
            active_voters_only: true,
            validate_voter_exists: true,
        }
    }
}

/// Balance transfer summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceTransferSummary {
    pub total_voters: usize,
    pub voters_with_balances: usize,
    pub transfers_attempted: usize,
    pub transfers_successful: usize,
    pub transfers_failed: usize,
    pub total_amount_transferred: String,
    pub results: Vec<BalanceTransferResult>,
}

impl RegistryExport {
    /// Get voters with pending rewards that should be transferred
    pub fn get_transferable_balances(&self, options: &BalanceTransferOptions) -> Vec<&OldVoterData> {
        self.voters
            .iter()
            .filter(|voter| {
                // Skip zero balances if configured
                if options.skip_zero_balances {
                    let rewards = voter.pending_rewards.parse::<u128>().unwrap_or(0);
                    if rewards == 0 {
                        return false;
                    }
                }
                
                // Skip inactive voters if configured
                if options.active_voters_only && !voter.is_active {
                    return false;
                }
                
                true
            })
            .collect()
    }
    
    /// Calculate total pending rewards to be transferred
    pub fn calculate_total_pending_rewards(&self) -> Result<Amount, String> {
        let total: u128 = self.voters
            .iter()
            .map(|voter| {
                voter.pending_rewards.parse::<u128>().unwrap_or(0)
            })
            .sum();
        
        Ok(Amount::from_tokens(total))
    }
    
    /// Get balance transfer statistics
    pub fn get_balance_statistics(&self) -> BalanceStatistics {
        let voters_with_rewards = self.voters
            .iter()
            .filter(|v| v.pending_rewards.parse::<u128>().unwrap_or(0) > 0)
            .count();
        
        let active_voters_with_rewards = self.voters
            .iter()
            .filter(|v| v.is_active && v.pending_rewards.parse::<u128>().unwrap_or(0) > 0)
            .count();
        
        let total_pending: u128 = self.voters
            .iter()
            .map(|v| v.pending_rewards.parse::<u128>().unwrap_or(0))
            .sum();
        
        let max_balance = self.voters
            .iter()
            .map(|v| v.pending_rewards.parse::<u128>().unwrap_or(0))
            .max()
            .unwrap_or(0);
        
        let min_balance = self.voters
            .iter()
            .filter(|v| v.pending_rewards.parse::<u128>().unwrap_or(0) > 0)
            .map(|v| v.pending_rewards.parse::<u128>().unwrap_or(0))
            .min()
            .unwrap_or(0);
        
        BalanceStatistics {
            total_voters: self.voters.len(),
            voters_with_rewards,
            active_voters_with_rewards,
            total_pending_rewards: total_pending.to_string(),
            max_balance: max_balance.to_string(),
            min_balance: min_balance.to_string(),
        }
    }
}

/// Balance statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceStatistics {
    pub total_voters: usize,
    pub voters_with_rewards: usize,
    pub active_voters_with_rewards: usize,
    pub total_pending_rewards: String,
    pub max_balance: String,
    pub min_balance: String,
}

impl OldVoterData {
    /// Get pending rewards as Amount
    pub fn get_pending_rewards(&self) -> Result<Amount, String> {
        parse_amount(&self.pending_rewards)
    }
    
    /// Check if voter has non-zero pending rewards
    pub fn has_pending_rewards(&self) -> bool {
        self.pending_rewards.parse::<u128>().unwrap_or(0) > 0
    }
}

// ==================== HELPER FUNCTIONS ====================

/// Parse amount from string
fn parse_amount(amount_str: &str) -> Result<Amount, String> {
    // Try to parse as u128
    let value: u128 = amount_str
        .parse()
        .map_err(|e| format!("Failed to parse amount '{}': {}", amount_str, e))?;
    
    Ok(Amount::from_tokens(value))
}

/// Parse account owner from string
fn parse_account_owner(address_str: &str) -> Result<AccountOwner, String> {
    // This is a simplified parser - in production, use proper parsing
    // For now, we'll create a placeholder
    // TODO: Implement proper AccountOwner parsing from string
    
    // AccountOwner doesn't have a simple from_string method
    // We need to parse it properly based on the format
    // For now, return an error indicating manual mapping is needed
    Err(format!(
        "Account owner parsing not implemented. Manual mapping required for: {}",
        address_str
    ))
}

/// Parse ChainId from string
fn parse_chain_id(chain_str: &str) -> Result<linera_sdk::linera_base_types::ChainId, String> {
    // Parse ChainId from hex string
    chain_str.parse()
        .map_err(|e| format!("Failed to parse ChainId '{}': {:?}", chain_str, e))
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_amount() {
        assert_eq!(parse_amount("1000").unwrap(), Amount::from_tokens(1000));
        assert_eq!(parse_amount("0").unwrap(), Amount::ZERO);
        assert!(parse_amount("invalid").is_err());
    }
    
    #[test]
    fn test_voter_mapping() {
        let mut mapping = VoterMapping::new();
        mapping.add("app1".to_string(), "addr1".to_string());
        mapping.add("app2".to_string(), "addr2".to_string());
        
        assert_eq!(mapping.get("app1"), Some(&"addr1".to_string()));
        assert_eq!(mapping.get("app2"), Some(&"addr2".to_string()));
        assert_eq!(mapping.get("app3"), None);
    }
    
    #[test]
    fn test_migration_options_default() {
        let options = MigrationOptions::default();
        assert!(options.safe_mode);
        assert!(options.skip_existing);
        assert!(options.validate_data);
    }
    
    #[test]
    fn test_export_validation() {
        let export = RegistryExport {
            metadata: ExportMetadata {
                exported_at: 0,
                registry_chain_id: "chain1".to_string(),
                registry_app_id: "app1".to_string(),
                version: "1.0.0".to_string(),
                total_voters: 0,
                total_active_markets: 0,
                notes: "test".to_string(),
            },
            voters: vec![],
            active_markets: vec![],
            statistics: ExportStatistics {
                total_markets_created: Some(0),
                total_markets_resolved: Some(0),
                total_fees_collected: Some("0".to_string()),
                total_stake: Some("0".to_string()),
                total_locked_stake: Some("0".to_string()),
                total_rewards_distributed: Some("0".to_string()),
            },
            parameters: ExportParameters {
                min_stake: Some("100".to_string()),
                min_voters_per_market: Some(3),
                max_voters_per_market: Some(50),
            },
        };
        
        assert!(export.validate().is_ok());
    }
}

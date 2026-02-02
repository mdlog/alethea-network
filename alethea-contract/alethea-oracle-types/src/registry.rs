// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Oracle Registry types for protocol transformation
//! 
//! This module contains types for the new Oracle Registry architecture
//! where a single canonical registry serves all dApps.

use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, ApplicationId, ChainId, Timestamp},
    graphql::GraphQLMutationRoot,
};
use serde::{Deserialize, Serialize};

use crate::MarketStatus;

// ==================== REGISTRY OPERATIONS ====================

/// Operations for Oracle Registry
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum RegistryOperation {
    // Market operations
    RegisterMarket {
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    },
    RegisterExternalMarket {
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_chain_id: ChainId,
        callback_application_id: ApplicationId,
        callback_method: String,
        fee: Amount,
    },
    GetMarket {
        market_id: u64,
    },
    GetMarketStatus {
        market_id: u64,
    },
    RequestResolution {
        market_id: u64,
    },
    
    // Voter operations
    RegisterVoter {
        voter_app: ApplicationId,  // Caller's ApplicationId (required for call_application())
        stake: Amount,
    },
    UnregisterVoter,
    UpdateStake {
        additional_stake: Amount,
    },
    
    // Admin operations
    // Note: UpdateParameters removed from GraphQL mutations as ProtocolParameters doesn't implement InputType
    // Use direct operation execution for parameter updates
    EmergencyPause,
    EmergencyUnpause,
    
    // Query operations
    GetProtocolStats,
    GetVoterInfo {
        voter_app: ApplicationId,
    },
    GetVoterReputation {
        voter_app: ApplicationId,
    },
}

/// Responses from Oracle Registry
#[derive(Debug, Serialize, Deserialize)]
pub enum RegistryResponse {
    MarketRegistered {
        market_id: u64,
        selected_voters: Vec<ApplicationId>,
    },
    Market(MarketRequest),
    MarketStatus(MarketStatusInfo),
    VoterRegistered {
        voter_id: u64,
        initial_reputation: u64,
    },
    VoterInfo(VoterMetadata),
    VoterReputation(ReputationData),
    ProtocolStats(ProtocolStats),
    Success,
    Error {
        code: u32,
        message: String,
    },
}

// ==================== REGISTRY MESSAGES ====================

/// Messages for Oracle Registry protocol
#[derive(Debug, Serialize, Deserialize)]
pub enum RegistryMessage {
    // From dApps
    RegisterMarket {
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    },
    
    /// Market Chain -> Registry: Create query from expired market (AUTOMATIC)
    /// This is sent automatically when a market expires and needs resolution
    CreateQueryFromMarket {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_chain: ChainId,
        callback_data: Vec<u8>,
    },
    
    // From Voters
    VoterRegistration {
        voter_app: ApplicationId,
        stake: Amount,
    },
    VoteCommitment {
        market_id: u64,
        voter_app: ApplicationId,
        commitment_hash: [u8; 32],
        stake_locked: Amount,
    },
    VoteReveal {
        market_id: u64,
        voter_app: ApplicationId,
        outcome_index: usize,
        salt: [u8; 32],
        confidence: u8,
    },
    // Direct vote (simplified, no commit-reveal)
    DirectVote {
        voter_app: ApplicationId,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        voting_power: u64,
    },
    
    // To dApps
    MarketResolved {
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        callback_data: Vec<u8>,
    },
    
    // To Voters
    VoteRequest {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        commit_deadline: Timestamp,
        reveal_deadline: Timestamp,
    },
    RewardDistribution {
        market_id: u64,
        amount: Amount,
    },
    StakeSlashed {
        market_id: u64,
        amount: Amount,
        reason: String,
    },
}

// ==================== DATA STRUCTURES ====================

/// Market source tracking
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum MarketSource {
    /// Market from Market Chain (legacy/internal)
    Internal,
    /// Market from external dApp
    External,
}

/// Callback status for external markets
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum CallbackStatus {
    /// Callback pending (not sent yet)
    Pending,
    /// Callback successfully sent
    Sent,
    /// Callback failed after retries
    Failed,
    /// No callback required (internal markets)
    NotRequired,
}

/// Market request in the registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketRequest {
    pub id: u64,
    pub requester_app: ApplicationId,
    pub requester_chain: ChainId,
    pub question: String,
    pub outcomes: Vec<String>,
    pub created_at: Timestamp,
    pub deadline: Timestamp,
    pub fee_paid: Amount,
    pub callback_data: Vec<u8>,
    pub status: MarketStatus,
    
    // External market integration fields
    pub source: MarketSource,
    pub callback_chain_id: Option<ChainId>,
    pub callback_application_id: Option<ApplicationId>,
    pub callback_method: Option<String>,
    pub callback_status: CallbackStatus,
}

/// Voter metadata in the registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterMetadata {
    pub app_id: ApplicationId,
    pub chain_id: ChainId,
    pub owner: AccountOwner,
    pub stake: Amount,
    pub locked_stake: Amount,
    pub registered_at: Timestamp,
    pub last_active: Timestamp,
    pub is_active: bool,
}

/// Reputation data for voters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationData {
    pub score: u64,
    pub total_votes: u32,
    pub correct_votes: u32,
    pub incorrect_votes: u32,
    pub correct_streak: u32,
    pub last_updated: Timestamp,
}

impl ReputationData {
    /// Calculate reputation tier
    pub fn tier(&self) -> ReputationTier {
        match self.score {
            0..=50 => ReputationTier::Novice,
            51..=100 => ReputationTier::Apprentice,
            101..=200 => ReputationTier::Journeyman,
            201..=500 => ReputationTier::Expert,
            _ => ReputationTier::Master,
        }
    }
    
    /// Calculate accuracy rate
    pub fn accuracy_rate(&self) -> f64 {
        if self.total_votes == 0 {
            return 0.0;
        }
        (self.correct_votes as f64 / self.total_votes as f64) * 100.0
    }
}

/// Reputation tiers
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ReputationTier {
    Novice,      // 0-50: New voters
    Apprentice,  // 51-100: Learning
    Journeyman,  // 101-200: Competent
    Expert,      // 201-500: Highly accurate
    Master,      // 501+: Top performers
}

impl ReputationTier {
    /// Get selection weight multiplier for this tier
    pub fn selection_weight(&self) -> f64 {
        match self {
            Self::Novice => 1.0,
            Self::Apprentice => 1.5,
            Self::Journeyman => 2.0,
            Self::Expert => 3.0,
            Self::Master => 5.0,
        }
    }
}

/// Protocol parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolParameters {
    pub min_stake: Amount,
    pub min_voters_per_market: u32,
    pub max_voters_per_market: u32,
    pub commit_phase_duration: u64,  // seconds
    pub reveal_phase_duration: u64,  // seconds
    pub base_market_fee: Amount,
    pub protocol_fee_percentage: u8,  // 0-100
    pub slash_percentage: u8,  // 0-100
    pub min_reputation: u64,
}

impl Default for ProtocolParameters {
    fn default() -> Self {
        Self {
            min_stake: Amount::from_tokens(1000),
            min_voters_per_market: 3,  // Minimum 3 voters for testing
            max_voters_per_market: 50,
            commit_phase_duration: 3600,  // 1 hour
            reveal_phase_duration: 3600,  // 1 hour
            base_market_fee: Amount::from_tokens(10),
            protocol_fee_percentage: 10,
            slash_percentage: 10,
            min_reputation: 20,
        }
    }
}

/// Market status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketStatusInfo {
    pub market_id: u64,
    pub status: MarketStatus,
    pub total_commitments: u32,
    pub total_reveals: u32,
    pub selected_voters: Vec<ApplicationId>,
    pub winning_outcome: Option<usize>,
    pub confidence: Option<u8>,
}

/// Protocol statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolStats {
    pub total_markets: u64,
    pub active_markets: u64,
    pub resolved_markets: u64,
    pub total_voters: u64,
    pub active_voters: u64,
    pub total_value_locked: Amount,
    pub total_fees_collected: Amount,
    pub average_resolution_time: u64,  // seconds
    pub average_confidence: u8,
}

/// Vote data for aggregation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteData {
    pub voter_app: ApplicationId,
    pub outcome_index: usize,
    pub confidence: u8,
    pub voting_power: u64,
    pub stake: Amount,
}

// ==================== ERROR TYPES ====================

/// Registry errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RegistryError {
    // Market errors
    MarketNotFound(u64),
    InvalidOutcomes,
    InsufficientFee {
        required: Amount,
        provided: Amount,
    },
    DeadlinePassed,
    MarketAlreadyResolved,
    
    // Voter errors
    VoterNotRegistered,
    InsufficientStake,
    VoterAlreadyRegistered,
    VoterSuspended,
    NotSelectedForMarket,
    
    // Vote errors
    CommitmentNotFound,
    InvalidReveal,
    VoteAlreadySubmitted,
    VotingPhaseClosed,
    
    // Protocol errors
    ProtocolPaused,
    UnauthorizedOperation,
    InvalidParameters,
    
    // System errors
    StateCorruption,
    MessageSendFailed,
    
    // External market errors
    InvalidCallbackInfo,
    CallbackFailed {
        market_id: u64,
        retry_count: u32,
    },
    MaxRetriesExceeded {
        market_id: u64,
    },
    NoMarketsFound,
    FeeMismatch,
    RateLimitExceeded,
    InvalidChainId,
    InvalidApplicationId,
}

impl RegistryError {
    /// Get error code
    pub fn error_code(&self) -> u32 {
        match self {
            Self::MarketNotFound(_) => 1001,
            Self::InvalidOutcomes => 1002,
            Self::InsufficientFee { .. } => 5001,
            Self::DeadlinePassed => 1004,
            Self::MarketAlreadyResolved => 1005,
            Self::VoterNotRegistered => 2001,
            Self::InsufficientStake => 2002,
            Self::VoterAlreadyRegistered => 2003,
            Self::VoterSuspended => 2004,
            Self::NotSelectedForMarket => 2005,
            Self::CommitmentNotFound => 3001,
            Self::InvalidReveal => 3002,
            Self::VoteAlreadySubmitted => 3003,
            Self::VotingPhaseClosed => 3004,
            Self::ProtocolPaused => 4001,
            Self::UnauthorizedOperation => 4002,
            Self::InvalidParameters => 4003,
            Self::StateCorruption => 4004,
            Self::MessageSendFailed => 4005,
            Self::InvalidCallbackInfo => 5002,
            Self::CallbackFailed { .. } => 5003,
            Self::MaxRetriesExceeded { .. } => 5004,
            Self::NoMarketsFound => 5005,
            Self::FeeMismatch => 5006,
            Self::RateLimitExceeded => 5007,
            Self::InvalidChainId => 5008,
            Self::InvalidApplicationId => 5009,
        }
    }
    
    /// Get user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            Self::MarketNotFound(id) => format!("Market {} not found", id),
            Self::InvalidOutcomes => "Invalid outcomes: must have 2-10 options".to_string(),
            Self::InsufficientFee { required, provided } => {
                format!(
                    "Insufficient registration fee. Required: {}, Provided: {}",
                    required, provided
                )
            }
            Self::DeadlinePassed => "Market deadline has already passed".to_string(),
            Self::MarketAlreadyResolved => "Market has already been resolved".to_string(),
            Self::VoterNotRegistered => "Voter is not registered in the pool".to_string(),
            Self::InsufficientStake => "Stake amount below minimum requirement".to_string(),
            Self::VoterAlreadyRegistered => "Voter is already registered".to_string(),
            Self::VoterSuspended => "Voter is suspended due to low reputation".to_string(),
            Self::NotSelectedForMarket => "Voter was not selected for this market".to_string(),
            Self::CommitmentNotFound => "No commitment found for this voter and market".to_string(),
            Self::InvalidReveal => "Reveal does not match commitment".to_string(),
            Self::VoteAlreadySubmitted => "Vote has already been submitted".to_string(),
            Self::VotingPhaseClosed => "Voting phase is closed for this market".to_string(),
            Self::ProtocolPaused => "Protocol is currently paused".to_string(),
            Self::UnauthorizedOperation => "Unauthorized to perform this operation".to_string(),
            Self::InvalidParameters => "Invalid protocol parameters".to_string(),
            Self::StateCorruption => "State corruption detected".to_string(),
            Self::MessageSendFailed => "Failed to send cross-chain message".to_string(),
            Self::InvalidCallbackInfo => "Invalid callback information provided".to_string(),
            Self::CallbackFailed { market_id, retry_count } => {
                format!(
                    "Failed to send callback for market {} after {} attempts",
                    market_id, retry_count
                )
            }
            Self::MaxRetriesExceeded { market_id } => {
                format!(
                    "Maximum callback retries exceeded for market {}",
                    market_id
                )
            }
            Self::NoMarketsFound => "No markets found matching criteria".to_string(),
            Self::FeeMismatch => "Fee amount does not match calculated requirement".to_string(),
            Self::RateLimitExceeded => "Rate limit exceeded for market registration".to_string(),
            Self::InvalidChainId => "Invalid chain ID provided".to_string(),
            Self::InvalidApplicationId => "Invalid application ID provided".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reputation_tier() {
        let mut rep = ReputationData {
            score: 25,
            total_votes: 10,
            correct_votes: 8,
            incorrect_votes: 2,
            correct_streak: 3,
            last_updated: Timestamp::from(0),
        };
        
        assert_eq!(rep.tier(), ReputationTier::Novice);
        assert_eq!(rep.accuracy_rate(), 80.0);
        
        rep.score = 150;
        assert_eq!(rep.tier(), ReputationTier::Journeyman);
        
        rep.score = 600;
        assert_eq!(rep.tier(), ReputationTier::Master);
    }
    
    #[test]
    fn test_reputation_tier_weights() {
        assert_eq!(ReputationTier::Novice.selection_weight(), 1.0);
        assert_eq!(ReputationTier::Master.selection_weight(), 5.0);
    }
    
    #[test]
    fn test_error_codes() {
        assert_eq!(RegistryError::MarketNotFound(1).error_code(), 1001);
        assert_eq!(RegistryError::VoterNotRegistered.error_code(), 2001);
        assert_eq!(RegistryError::InvalidReveal.error_code(), 3002);
    }
    
    #[test]
    fn test_default_parameters() {
        let params = ProtocolParameters::default();
        assert_eq!(params.min_voters_per_market, 20);
        assert_eq!(params.max_voters_per_market, 50);
        assert_eq!(params.protocol_fee_percentage, 10);
    }
}

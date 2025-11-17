// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Voter template types for protocol transformation
//! 
//! This module contains types for independent voter applications
//! that can register with the Oracle Registry.

use linera_sdk::linera_base_types::{AccountOwner, Amount, ApplicationId, Timestamp};
use serde::{Deserialize, Serialize};

// ==================== VOTER OPERATIONS ====================

/// Operations for Voter applications
/// Note: Cannot use GraphQLMutationRoot directly because DecisionStrategy doesn't implement InputType
/// Use custom mutation root in voter-template/src/mutation.rs instead
#[derive(Debug, Serialize, Deserialize)]
pub enum VoterOperation {
    // Setup
    Initialize {
        registry_id: ApplicationId,
        initial_stake: Amount,
    },
    UpdateStake {
        additional_stake: Amount,
    },
    
    // Voting
    SubmitVote {
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
    },
    GetActiveVotes,
    GetVoteHistory,
    
    // Configuration
    SetDecisionStrategy {
        strategy: DecisionStrategy,
    },
    EnableAutoVote,
    DisableAutoVote,
    
    // Queries
    GetStatus,
    GetReputation,
}

/// GraphQL mutations for Voter (subset of VoterOperation)
/// This enum can be used with GraphQLMutationRoot for operations that don't require DecisionStrategy
/// Note: ApplicationId and Amount are converted from String in the custom mutation root
/// 
/// IMPORTANT: This enum uses ApplicationId and Amount directly, which don't implement InputType
/// for String conversion. The custom mutation root in voter-template handles String conversion
/// and converts to VoterOperation for execution.
#[derive(Debug, Serialize, Deserialize, linera_sdk::graphql::GraphQLMutationRoot)]
pub enum VoterMutation {
    SubmitVote {
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
    },
    Initialize {
        registry_id: ApplicationId,
        initial_stake: Amount,
    },
    UpdateStake {
        additional_stake: Amount,
    },
}

/// Responses from Voter applications
#[derive(Debug, Serialize, Deserialize)]
pub enum VoterResponse {
    Initialized {
        registry_id: ApplicationId,
        stake: Amount,
    },
    StakeUpdated {
        new_total: Amount,
    },
    VoteSubmitted {
        market_id: u64,
        outcome_index: usize,
    },
    ActiveVotes(Vec<VoterVoteData>),
    VoteHistory(Vec<VoteResult>),
    StrategyUpdated {
        strategy: DecisionStrategy,
    },
    Status(VoterStatus),
    Reputation(VoterReputationInfo),
    Success,
    Error {
        code: u32,
        message: String,
    },
}

// ==================== DATA STRUCTURES ====================

/// Vote request data for active votes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterVoteData {
    pub market_id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub deadline: Timestamp,
    pub commit_deadline: Timestamp,
    pub reveal_deadline: Timestamp,
    pub my_commitment: Option<[u8; 32]>,
    pub my_outcome: Option<usize>,
    pub my_salt: Option<[u8; 32]>,
    pub status: VoteStatus,
}

/// Vote status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum VoteStatus {
    Requested,         // Received vote request
    Committed,         // Submitted commitment
    Revealed,          // Revealed vote
    Rewarded,          // Received reward
    Slashed,           // Stake slashed for incorrect vote
}

/// Vote result (history)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteResult {
    pub market_id: u64,
    pub question: String,
    pub my_outcome: usize,
    pub winning_outcome: Option<usize>,
    pub was_correct: Option<bool>,
    pub reward: Option<Amount>,
    pub timestamp: Timestamp,
}

/// Decision strategy for voters
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum DecisionStrategy {
    #[default]
    Manual,  // Owner decides
    Random,  // Random selection (for testing)
    Oracle,  // External oracle/API
    ML,      // Machine learning model
}

/// Voter status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterStatus {
    pub registry_id: ApplicationId,
    pub owner: AccountOwner,
    pub stake: Amount,
    pub locked_stake: Amount,
    pub active_votes: u32,
    pub total_votes: u32,
    pub is_active: bool,
    pub auto_vote_enabled: bool,
    pub decision_strategy: DecisionStrategy,
}

/// Voter reputation info (cached from registry)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterReputationInfo {
    pub score: u64,
    pub total_votes: u32,
    pub correct_votes: u32,
    pub accuracy_rate: f64,
    pub correct_streak: u32,
    pub last_updated: Timestamp,
}

// ==================== ERROR TYPES ====================

/// Voter errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoterError {
    NotInitialized,
    AlreadyInitialized,
    InsufficientStake,
    VoteNotFound,
    VoteAlreadySubmitted,
    InvalidOutcomeIndex,
    InvalidConfidence,
    RegistryNotSet,
    UnauthorizedOperation,
}

impl VoterError {
    pub fn error_code(&self) -> u32 {
        match self {
            Self::NotInitialized => 6001,
            Self::AlreadyInitialized => 6002,
            Self::InsufficientStake => 6003,
            Self::VoteNotFound => 6004,
            Self::VoteAlreadySubmitted => 6005,
            Self::InvalidOutcomeIndex => 6006,
            Self::InvalidConfidence => 6007,
            Self::RegistryNotSet => 6008,
            Self::UnauthorizedOperation => 6009,
        }
    }
    
    pub fn user_message(&self) -> String {
        match self {
            Self::NotInitialized => "Voter not initialized".to_string(),
            Self::AlreadyInitialized => "Voter already initialized".to_string(),
            Self::InsufficientStake => "Insufficient stake amount".to_string(),
            Self::VoteNotFound => "Vote not found".to_string(),
            Self::VoteAlreadySubmitted => "Vote already submitted for this market".to_string(),
            Self::InvalidOutcomeIndex => "Invalid outcome index".to_string(),
            Self::InvalidConfidence => "Confidence must be between 0-100".to_string(),
            Self::RegistryNotSet => "Registry ID not set".to_string(),
            Self::UnauthorizedOperation => "Unauthorized operation".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vote_status() {
        let status = VoteStatus::Requested;
        assert_eq!(status, VoteStatus::Requested);
        assert_ne!(status, VoteStatus::Committed);
    }
    
    #[test]
    fn test_decision_strategy() {
        let strategy = DecisionStrategy::Manual;
        assert_eq!(strategy, DecisionStrategy::Manual);
        
        let strategy2 = DecisionStrategy::Random;
        assert_ne!(strategy, strategy2);
    }
    
    #[test]
    fn test_voter_error_codes() {
        assert_eq!(VoterError::NotInitialized.error_code(), 6001);
        assert_eq!(VoterError::VoteNotFound.error_code(), 6004);
    }
}

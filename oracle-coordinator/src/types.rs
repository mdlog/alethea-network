// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

use linera_sdk::linera_base_types::{AccountOwner, ChainId, Amount, Timestamp};
use serde::{Deserialize, Serialize};

/// Market information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Market {
    pub id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub creator: Option<AccountOwner>,
    
    // Timing
    pub created_at: Timestamp,
    pub trading_deadline: Timestamp,
    pub voting_deadline: Timestamp,
    
    // Requirements
    pub min_voters: u32,
    
    // Metadata
    pub category: String,
    
    // Status
    pub status: MarketStatus,
    pub winning_outcome: Option<usize>,
    pub confidence_score: Option<u8>,
    
    // Statistics
    pub total_commitments: u32,
    pub total_reveals: u32,
}

/// Market status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum MarketStatus {
    Active,           // Trading period
    VotingStarted,    // Voting announced
    CommitPhase,      // Commitments being collected
    RevealPhase,      // Reveals being collected
    Aggregating,      // Computing result
    Resolved,         // Final outcome determined
    Disputed,         // Under dispute
}

/// Voter information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterInfo {
    pub chain_id: ChainId,
    
    // Reputation
    pub reputation_score: u64,
    pub total_votes: u32,
    pub total_correct: u32,
    pub total_incorrect: u32,
    pub correct_streak: u32,
    
    // Stake
    pub total_stake: Amount,
    pub locked_stake: Amount,
    
    // Timestamps
    pub registered_at: Timestamp,
    pub last_active: Timestamp,
}

/// Vote commitment (hidden vote)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteCommitment {
    pub voter_chain: ChainId,
    pub market_id: u64,
    pub commitment_hash: [u8; 32],
    pub voting_power: u64,
    pub stake_amount: Amount,
    pub committed_at: Timestamp,
}

/// Vote reveal (revealed vote)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteReveal {
    pub voter_chain: ChainId,
    pub market_id: u64,
    pub outcome_index: usize,
    pub salt: [u8; 32],
    pub confidence: u8,
    pub voting_power: u64,
    pub revealed_at: Timestamp,
}

impl Market {
    /// Check if market is in voting phase
    pub fn is_voting_phase(&self) -> bool {
        matches!(
            self.status,
            MarketStatus::VotingStarted | MarketStatus::CommitPhase | MarketStatus::RevealPhase
        )
    }
    
    /// Check if market is resolved
    pub fn is_resolved(&self) -> bool {
        self.status == MarketStatus::Resolved
    }
    
    /// Check if commit phase is active
    pub fn is_commit_phase(&self) -> bool {
        matches!(
            self.status,
            MarketStatus::VotingStarted | MarketStatus::CommitPhase
        )
    }
    
    /// Check if reveal phase is active
    pub fn is_reveal_phase(&self) -> bool {
        self.status == MarketStatus::RevealPhase
    }
}

impl VoterInfo {
    /// Calculate accuracy rate
    pub fn accuracy_rate(&self) -> f64 {
        if self.total_votes == 0 {
            return 0.0;
        }
        (self.total_correct as f64 / self.total_votes as f64) * 100.0
    }

    /// Calculate voting power (reputation-based)
    pub fn voting_power(&self) -> u64 {
        let base_power = self.reputation_score;
        
        // Bonus untuk high accuracy
        let accuracy_multiplier = if self.accuracy_rate() > 90.0 {
            1.5
        } else if self.accuracy_rate() > 80.0 {
            1.2
        } else {
            1.0
        };
        
        (base_power as f64 * accuracy_multiplier) as u64
    }
    
    /// Check if voter is active
    pub fn is_active(&self, current_time: Timestamp) -> bool {
        let thirty_days = 30 * 24 * 60 * 60 * 1_000_000; // microseconds
        current_time.micros().saturating_sub(self.last_active.micros()) < thirty_days
    }
}


// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Shared types for Alethea Oracle Platform
//! 
//! This crate provides common data structures, operations, and types
//! used across the Alethea Oracle ecosystem, including:
//! - Oracle Coordinator
//! - Voter Chain
//! - Market Chain
//! 
//! By centralizing these types, we ensure consistency and reduce duplication.

use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, ChainId, Timestamp},
    abi::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// ABI untuk Oracle Coordinator
pub struct OracleCoordinatorAbi;

impl ContractAbi for OracleCoordinatorAbi {
    type Operation = CoordinatorOperation;
    type Response = CoordinatorResponse;
}

impl ServiceAbi for OracleCoordinatorAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// ABI untuk Voter Chain
pub struct VoterChainAbi;

impl ContractAbi for VoterChainAbi {
    type Operation = VoterOperation;
    type Response = VoterResponse;
}

impl ServiceAbi for VoterChainAbi {
    type Query = VoterQuery;
    type QueryResponse = VoterResponse;
}

// ==================== COORDINATOR OPERATIONS ====================

#[derive(Debug, Serialize, Deserialize, linera_sdk::graphql::GraphQLMutationRoot)]
pub enum CoordinatorOperation {
    /// Create new prediction market
    CreateMarket {
        question: String,
        outcomes: Vec<String>,
        trading_deadline: Timestamp,
        voting_deadline: Timestamp,
        min_voters: u32,
        category: String,
    },
    
    /// Register voter chain
    RegisterVoter {
        voter_chain: ChainId,
        initial_stake: Amount,
    },
    
    /// Start voting period untuk market
    StartVoting {
        market_id: u64,
    },
    
    /// Aggregate votes dan resolve market
    AggregateVotes {
        market_id: u64,
    },
    
    /// Get market information
    GetMarket {
        market_id: u64,
    },
    
    /// Get active markets
    GetActiveMarkets,
    
    /// Get voter information
    GetVoterInfo {
        voter_chain: ChainId,
    },
    
    /// Get market statistics
    GetMarketStats {
        market_id: u64,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub enum CoordinatorResponse {
    MarketCreated {
        market_id: u64,
        question_length: u32, // WASM safe - store length instead of String
    },
    
    VoterRegistered {
        voter_chain: ChainId,
        initial_reputation: u64,
    },
    
    VotingStarted {
        market_id: u64,
        total_voters_notified: u32,
    },
    
    MarketResolved {
        market_id: u64,
        winning_outcome: usize,
        confidence: u8,
        total_voters: u32,
    },
    
    Market(Market),
    ActiveMarkets(Vec<Market>),
    VoterInfo(VoterInfo),
    MarketStats(MarketStats),
    
    Error {
        error_code: u32, // WASM safe - 0=Unknown, 1=NotFound, 2=InvalidParam, etc.
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub enum CoordinatorQuery {
    GetMarket { market_id: u64 },
    GetActiveMarkets,
    GetVoterInfo { voter_chain: ChainId },
    GetMarketStats { market_id: u64 },
}

// ==================== VOTER OPERATIONS ====================

#[derive(Debug, Serialize, Deserialize)]
pub enum VoterOperation {
    /// Initialize voter dengan oracle coordinator
    Initialize {
        oracle_chain: ChainId,
        stake: Amount,
    },
    
    /// Commit vote (hidden)
    CommitVote {
        market_id: u64,
        outcome_index: usize,
    },
    
    /// Reveal vote
    RevealVote {
        market_id: u64,
    },
    
    /// Submit direct vote (non-commit-reveal, untuk testing)
    SubmitVote {
        market_id: u64,
        outcome_index: usize,
    },
    
    /// Add more stake
    AddStake {
        amount: Amount,
    },
    
    /// Get voter info
    GetVoterInfo,
    
    /// Get vote history
    GetVoteHistory,
    
    /// Get pending commitments
    GetPendingCommitments,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum VoterResponse {
    Initialized,
    
    CommitmentSubmitted {
        market_id: u64,
        commitment_hash: [u8; 32],
    },
    
    VoteRevealed {
        market_id: u64,
        outcome_index: usize,
        verified: bool,
    },
    
    VoteSubmitted {
        market_id: u64,
        outcome_index: usize,
    },
    
    StakeAdded {
        new_total: Amount,
    },
    
    VoterInfo(VoterInfo),
    VoteHistory(Vec<VoteRecord>),
    PendingCommitments(Vec<CommitmentInfo>),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum VoterQuery {
    GetVoterInfo,
    GetVoteHistory,
    GetPendingCommitments,
}

// ==================== CROSS-CHAIN MESSAGES ====================

#[derive(Debug, Serialize, Deserialize)]
pub enum Message {
    /// Coordinator -> Voter: Request untuk vote
    VotingRequest {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
    },
    
    /// Voter -> Coordinator: Submit commitment
    VoteCommitment {
        voter_chain: ChainId,
        market_id: u64,
        commitment_hash: [u8; 32],
        voting_power: u64,
        stake_amount: Amount,
    },
    
    /// Voter -> Coordinator: Reveal vote
    VoteReveal {
        voter_chain: ChainId,
        market_id: u64,
        outcome_index: usize,
        salt: [u8; 32],
        confidence: u8,
    },
    
    /// Voter -> Coordinator: Direct vote (for testnet, no commit-reveal)
    DirectVote {
        voter_chain: ChainId,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        voting_power: u64,
    },
    
    /// Coordinator -> Voter: Update reputation
    ReputationUpdate {
        increase: bool,
        amount: u64,
    },
    
    /// Coordinator -> Voter: Reward payment
    RewardPayment {
        amount: Amount,
        market_id: u64,
    },
    
    /// Coordinator -> Prediction Market: Market resolved
    MarketResolved {
        market_id: u64,
        outcome: usize,
        confidence: u8,
        timestamp: Timestamp,
    },
    
    /// Prediction Market -> Coordinator: Request resolution
    MarketResolutionRequest {
        market_id: u64,
        requester: ChainId,
    },
    
    /// Market -> Coordinator: Resolution request with market details
    ResolutionRequest {
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
    },
}

// ==================== DATA STRUCTURES ====================

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

/// Vote record (history)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRecord {
    pub market_id: u64,
    pub question: String,
    pub outcome_index: usize,
    pub confidence: u8,
    pub timestamp: Timestamp,
    pub was_correct: Option<bool>,
}

/// Commitment info (for display)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitmentInfo {
    pub market_id: u64,
    pub commitment_hash: [u8; 32],
    pub committed_at: Timestamp,
    pub can_reveal: bool,
}

/// Market statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketStats {
    pub market_id: u64,
    pub total_commitments: u32,
    pub total_reveals: u32,
    pub participation_rate: u8,
    pub confidence_score: u8,
    pub status: MarketStatus,
}

/// Revealed vote (berbeda dengan VoteReveal - ini untuk internal voter storage)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevealedVote {
    pub market_id: u64,
    pub outcome_index: usize,
    pub salt: [u8; 32],
    pub confidence: u8,
    pub revealed_at: Timestamp,
}

// ==================== PARAMETERS ====================

/// Parameters untuk Oracle Coordinator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameters {
    /// Minimum stake untuk voter registration
    pub min_stake: Amount,
    
    /// Percentage stake yang di-slash untuk incorrect vote (0-100)
    pub slash_percentage: u8,
    
    /// Minimum consensus percentage untuk resolusi (0-100)
    pub min_consensus: u8,
    
    /// Reward pool percentage dari fees (0-100)
    pub reward_pool_percentage: u8,
}

impl Default for Parameters {
    fn default() -> Self {
        Parameters {
            min_stake: Amount::from_tokens(100),
            slash_percentage: 10, // 10% slash
            min_consensus: 66,    // 66% majority
            reward_pool_percentage: 80, // 80% to voters
        }
    }
}

/// Initial state untuk Voter Chain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialState {
    pub oracle_chain: Option<ChainId>,
    pub initial_stake: Amount,
}

// ==================== AGGREGATION ====================

/// Aggregation method
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AggregationMethod {
    /// Simple majority (most votes wins)
    SimpleMajority,
    
    /// Weighted by reputation and stake
    WeightedMajority {
        weight_by_reputation: bool,
        weight_by_stake: bool,
        min_consensus: u8,
    },
    
    /// Confidence-weighted (average of confidence scores)
    ConfidenceWeighted,
    
    /// Quadratic voting
    QuadraticVoting,
}

impl Default for AggregationMethod {
    fn default() -> Self {
        AggregationMethod::WeightedMajority {
            weight_by_reputation: true,
            weight_by_stake: true,
            min_consensus: 66,
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

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
    /// Check if voter is active (voted in last 30 days)
    pub fn is_active(&self, current_time: Timestamp) -> bool {
        let thirty_days = 30 * 24 * 60 * 60 * 1_000_000; // microseconds
        current_time.micros().saturating_sub(self.last_active.micros()) < thirty_days
    }
}

impl VoteCommitment {
    /// Verify if reveal matches this commitment
    pub fn verify_reveal(&self, reveal: &VoteReveal) -> bool {
        if reveal.market_id != self.market_id {
            return false;
        }
        
        if reveal.voter_chain != self.voter_chain {
            return false;
        }
        
        // Compute hash dari reveal - WASM SAFE (fixed array)
        let mut data = [0u8; 40]; // 8 bytes outcome + 32 bytes salt
        data[..8].copy_from_slice(&reveal.outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&reveal.salt);
        
        let computed_hash = simple_hash(&data);
        computed_hash == self.commitment_hash
    }
}

/// Simple hash function (sama dengan contract implementation) - WASM SAFE
pub fn simple_hash(data: &[u8]) -> [u8; 32] {
    if data.is_empty() {
        return [0u8; 32];
    }

    let mut result = [0u8; 32];
    
    // Store length in first 4 bytes
    let len = data.len() as u64;
    result[0] = (len & 0xFF) as u8;
    result[1] = ((len >> 8) & 0xFF) as u8;
    result[2] = ((len >> 16) & 0xFF) as u8;
    result[3] = ((len >> 24) & 0xFF) as u8;
    
    // Safety limit to prevent infinite loops
    const MAX_HASH_INPUT: usize = 10_000;
    let max_len = data.len().min(MAX_HASH_INPUT);
    
    // XOR all data into result
    for i in 0..max_len {
        let pos = i % 32;
        result[pos] ^= data[i];
    }
    
    // Simple diffusion
    for i in 0..32 {
        let a = result[i];
        let b = result[(i + 7) % 32];
        result[i] = a.wrapping_add(b);
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_hash_deterministic() {
        let data = b"test data";
        let hash1 = simple_hash(data);
        let hash2 = simple_hash(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_commitment_verify() {
        let voter_chain = ChainId::root(0);
        let market_id = 1;
        let outcome = 0;
        let salt = [42u8; 32];

        let mut data = [0u8; 40];
        data[..8].copy_from_slice(&outcome.to_le_bytes());
        data[8..40].copy_from_slice(&salt);
        let hash = simple_hash(&data);

        let commitment = VoteCommitment {
            voter_chain,
            market_id,
            commitment_hash: hash,
            voting_power: 100,
            stake_amount: Amount::ZERO,
            committed_at: Timestamp::from(0),
        };

        let reveal = VoteReveal {
            voter_chain,
            market_id,
            outcome_index: outcome,
            salt,
            confidence: 95,
            voting_power: 100,
            revealed_at: Timestamp::from(1000),
        };

        assert!(commitment.verify_reveal(&reveal));
    }

    #[test]
    fn test_voter_accuracy_rate() {
        let voter = VoterInfo {
            chain_id: ChainId::root(0),
            reputation_score: 100,
            total_stake: Amount::ZERO,
            locked_stake: Amount::ZERO,
            total_votes: 10,
            total_correct: 8,
            total_incorrect: 2,
            correct_streak: 3,
            registered_at: Timestamp::from(0),
            last_active: Timestamp::from(0),
        };

        assert_eq!(voter.accuracy_rate(), 80.0);
        assert_eq!(voter.voting_power(), 120); // 100 * 1.2
    }
    
    #[test]
    fn test_market_status_checks() {
        let mut market = Market {
            id: 1,
            question: "Test?".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            creator: AccountOwner::from(ChainId::root(0)),
            created_at: Timestamp::from(0),
            trading_deadline: Timestamp::from(1000),
            voting_deadline: Timestamp::from(2000),
            min_voters: 3,
            category: "test".to_string(),
            status: MarketStatus::CommitPhase,
            winning_outcome: None,
            confidence_score: None,
            total_commitments: 0,
            total_reveals: 0,
        };
        
        assert!(market.is_voting_phase());
        assert!(market.is_commit_phase());
        assert!(!market.is_reveal_phase());
        assert!(!market.is_resolved());
        
        market.status = MarketStatus::Resolved;
        assert!(market.is_resolved());
        assert!(!market.is_voting_phase());
    }
}


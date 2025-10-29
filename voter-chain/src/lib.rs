// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

/*!
 * Voter Chain - Individual Voter Contract
 * 
 * Each voter runs their own chain for voting on market resolutions
 */

use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi, AccountOwner, Timestamp, Amount, ChainId},
};
use serde::{Deserialize, Serialize};

pub struct VoterChainAbi;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameters {
    /// Minimum stake required to vote
    pub min_stake: Amount,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InitialState {
    /// Oracle chain ID for coordination
    pub oracle_chain: Option<ChainId>,
    /// Initial stake amount
    pub initial_stake: Amount,
}

#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum VoterOperation {
    /// Initialize voter with oracle chain and stake
    Initialize {
        oracle_chain: ChainId,
        stake: Amount,
    },
    
    /// PHASE 1: Commit vote (hash only, keeps vote secret)
    CommitVote {
        market_id: u64,
        outcome_index: usize,
    },
    
    /// PHASE 2: Reveal vote (outcome + salt for verification)
    RevealVote {
        market_id: u64,
    },
    
    /// Legacy: Submit vote for a market (simple version, no commit-reveal)
    SubmitVote {
        market_id: u64,
        outcome_index: usize,
    },
    
    /// Add more stake
    AddStake {
        amount: Amount,
    },
    
    /// Query voter info
    GetVoterInfo,
    
    /// Query vote history
    GetVoteHistory,
    
    /// Query pending commitments
    GetPendingCommitments,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum VoterResponse {
    /// Initialized successfully
    Initialized,
    
    /// Vote commitment submitted (Phase 1)
    CommitmentSubmitted {
        market_id: u64,
        commitment_hash: [u8; 32],
    },
    
    /// Vote revealed (Phase 2)
    VoteRevealed {
        market_id: u64,
        outcome_index: usize,
        verified: bool,
    },
    
    /// Vote submitted (legacy)
    VoteSubmitted { market_id: u64, outcome_index: usize },
    
    /// Stake added
    StakeAdded { new_total: Amount },
    
    /// Voter info
    VoterInfo(VoterInfo),
    
    /// Vote history
    VoteHistory(Vec<VoteRecord>),
    
    /// Pending commitments
    PendingCommitments(Vec<CommitmentInfo>),
    
    /// Generic OK
    Ok,
}

/// Information about a pending commitment
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct CommitmentInfo {
    pub market_id: u64,
    pub commitment_hash: [u8; 32],
    pub committed_at: Timestamp,
    pub can_reveal: bool,
}

/// Advanced reputation tracking with streak bonuses
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct Reputation {
    pub score: u64,
    pub total_votes: u64,
    pub correct_votes: u64,
    pub streak: u64,  // Consecutive correct votes
    pub average_confidence: u8,
}

impl Default for Reputation {
    fn default() -> Self {
        Self::new()
    }
}

impl Reputation {
    pub fn new() -> Self {
        Self {
            score: 100,  // Start with 100
            total_votes: 0,
            correct_votes: 0,
            streak: 0,
            average_confidence: 0,
        }
    }
    
    pub fn accuracy(&self) -> f64 {
        if self.total_votes == 0 {
            return 0.0;
        }
        (self.correct_votes as f64 / self.total_votes as f64) * 100.0
    }
    
    pub fn update_for_correct(&mut self, confidence: u8) {
        self.correct_votes += 1;
        self.total_votes += 1;
        self.streak += 1;
        
        // Base + streak bonus
        self.score += 10 + (self.streak * 2);
        
        // Update average confidence
        let total_confidence = (self.average_confidence as u64 * (self.total_votes - 1))
            + confidence as u64;
        self.average_confidence = (total_confidence / self.total_votes) as u8;
    }
    
    pub fn update_for_incorrect(&mut self, confidence: u8) {
        self.total_votes += 1;
        self.streak = 0;  // Reset streak
        
        // Penalty
        if self.score > 5 {
            self.score -= 5;
        }
        
        // Update average confidence
        let total_confidence = (self.average_confidence as u64 * (self.total_votes - 1))
            + confidence as u64;
        self.average_confidence = (total_confidence / self.total_votes) as u8;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct VoterInfo {
    pub owner: AccountOwner,
    pub oracle_chain: Option<ChainId>,
    pub total_stake: Amount,
    pub reputation: Reputation,
}

/// Commitment data (Phase 1)
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject, Default)]
pub struct VoteCommitment {
    pub market_id: u64,
    pub commitment_hash: [u8; 32],
    pub outcome_index: usize,  // Stored locally, not revealed
    pub salt: [u8; 32],  // Stored locally, not revealed
    pub committed_at: Timestamp,
}

/// Revealed vote data (Phase 2)
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct RevealedVote {
    pub market_id: u64,
    pub outcome_index: usize,
    pub salt: [u8; 32],
    pub confidence: u8,  // 0-100
    pub revealed_at: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct VoteRecord {
    pub market_id: u64,
    // Removed question field to avoid String allocation (WASM panic)
    pub outcome_index: usize,
    pub confidence: u8,
    pub timestamp: Timestamp,
    pub was_correct: Option<bool>,
}

    #[derive(Debug, Serialize, Deserialize)]
    pub enum Message {
    /// Voting request from oracle/market
    VotingRequest {
            market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
    },
    
    /// Reputation update from oracle
    ReputationUpdate {
        increase: bool,
        amount: u64,
    },
    
    /// Reward payment from oracle
    RewardPayment {
        amount: Amount,
            market_id: u64,
    },
    
    /// Commit vote to Oracle Coordinator
    VoteCommitmentToOracle {
        commitment_hash: [u8; 32],
        voting_power: u64,
        stake_amount: Amount,
    },
    
    /// Reveal vote to Oracle Coordinator
    VoteRevealToOracle {
        outcome_index: usize,
        salt: [u8; 32],
        confidence: u8,
    },
    
    /// Direct vote to Oracle Coordinator (for testnet, bypass commit-reveal)
    DirectVote {
        voter_chain: ChainId,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        voting_power: u64,
    },
}

impl ContractAbi for VoterChainAbi {
    type Operation = VoterOperation;
    type Response = VoterResponse;
}

impl ServiceAbi for VoterChainAbi {
    type Query = Request;
    type QueryResponse = Response;
}

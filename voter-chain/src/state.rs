// Copyright (c) Market Resolution Oracle Project
// SPDX-License-Identifier: MIT

use linera_sdk::{
    linera_base_types::{AccountOwner, Timestamp, Amount, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};

/// The application state for Voter Chain
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct VoterState {
    /// Owner of this voter chain
    pub owner: RegisterView<Option<AccountOwner>>,
    
    /// Oracle chain for coordination
    pub oracle_chain: RegisterView<Option<ChainId>>,
    
    /// Total stake locked
    pub total_stake: RegisterView<Amount>,
    
    /// Advanced reputation with streak tracking
    pub reputation: RegisterView<alethea_voter_chain::Reputation>,
    
    /// Pending voting requests
    pub pending_requests: MapView<u64, VotingRequest>,
    
    /// Pending commitments (market_id -> commitment data)
    pub pending_commitments: MapView<u64, alethea_voter_chain::VoteCommitment>,
    
    /// Vote history
    pub vote_history: MapView<u64, VoteRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct VotingRequest {
    pub market_id: u64,
    pub question: String,
    pub outcomes: Vec<String>,
    pub deadline: Timestamp,
    pub received_at: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct VoteRecord {
    pub market_id: u64,
    // Removed question field to avoid String allocation (WASM panic)
    pub outcome_index: usize,
    pub confidence: u8,
    pub timestamp: Timestamp,
    pub was_correct: Option<bool>,
    pub reward_received: Amount,
}

impl VoterState {
    /// Initialize voter state
    pub async fn initialize(
        &mut self,
        owner: AccountOwner,
        oracle_chain: Option<ChainId>,
        stake: Amount,
    ) {
        self.owner.set(Some(owner));
        self.oracle_chain.set(oracle_chain);
        self.total_stake.set(stake);
        self.reputation.set(alethea_voter_chain::Reputation::new());
    }
    
    /// Get voter info - WASM safe (no expect)
    pub fn get_voter_info_sync(&self) -> Option<alethea_voter_chain::VoterInfo> {
        if let Some(owner) = self.owner.get().clone() {
            Some(alethea_voter_chain::VoterInfo {
                owner,
                oracle_chain: self.oracle_chain.get().clone(),
                total_stake: *self.total_stake.get(),
                reputation: self.reputation.get().clone(),
            })
        } else {
            None
        }
    }
    
    /// Add voting request - WASM safe (no panic)
    pub async fn add_voting_request(&mut self, market_id: u64, request: VotingRequest) {
        if let Err(_) = self.pending_requests.insert(&market_id, request) {
            return;
        }
    }
    
    /// Record vote
    pub async fn record_vote(&mut self, market_id: u64, record: VoteRecord) {
        // Insert vote record - skip if error (avoid panic)
        if let Err(_) = self.vote_history.insert(&market_id, record) {
            return;
        }
        
        // Remove from pending
        let _ = self.pending_requests.remove(&market_id);
        
        // Remove commitment if exists
        let _ = self.pending_commitments.remove(&market_id);
    }
    
    /// Update reputation for correct vote
    pub async fn update_reputation_correct(&mut self, confidence: u8) {
        let mut rep = self.reputation.get().clone();
        rep.update_for_correct(confidence);
        self.reputation.set(rep);
    }
    
    /// Update reputation for incorrect vote
    pub async fn update_reputation_incorrect(&mut self, confidence: u8) {
        let mut rep = self.reputation.get().clone();
        rep.update_for_incorrect(confidence);
        self.reputation.set(rep);
    }
    
    /// Add stake
    pub async fn add_stake(&mut self, amount: Amount) {
        let current = *self.total_stake.get();
        self.total_stake.set(current.saturating_add(amount));
    }
    
    /// Record correct vote - WASM safe (no expect)
    pub async fn mark_vote_correct(&mut self, market_id: u64, confidence: u8) {
        if let Ok(Some(mut record)) = self.vote_history.get(&market_id).await {
            record.was_correct = Some(true);
            let _ = self.vote_history.insert(&market_id, record);
            
            // Update reputation with streak bonus
            self.update_reputation_correct(confidence).await;
        }
    }
    
    /// Record incorrect vote - WASM safe (no expect)
    pub async fn mark_vote_incorrect(&mut self, market_id: u64, confidence: u8) {
        if let Ok(Some(mut record)) = self.vote_history.get(&market_id).await {
            record.was_correct = Some(false);
            let _ = self.vote_history.insert(&market_id, record);
            
            // Update reputation and reset streak
            self.update_reputation_incorrect(confidence).await;
        }
    }
}


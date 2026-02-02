// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Voter Template State Management

use linera_sdk::{
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ApplicationId, ChainId, Timestamp};
use serde::{Deserialize, Serialize};
use alethea_oracle_types::{VoterVoteData, VoteStatus, VoteResult, DecisionStrategy};

/// Voter application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct VoterState {
    // Identity
    pub registry_id: RegisterView<Option<ApplicationId>>,
    pub registry_chain_id: RegisterView<Option<ChainId>>,
    pub owner: RegisterView<Option<AccountOwner>>,
    pub stake: RegisterView<Amount>,
    
    // Voting state
    pub active_votes: MapView<u64, ActiveVote>,
    pub vote_history: MapView<u64, VoteResult>,
    
    // Local reputation cache
    pub reputation_score: RegisterView<u64>,
    pub total_votes: RegisterView<u32>,
    pub correct_votes: RegisterView<u32>,
    
    // Configuration
    pub auto_vote_enabled: RegisterView<bool>,
    pub decision_strategy: RegisterView<DecisionStrategy>,
}

/// Active vote data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveVote {
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

impl VoterState {
    /// Initialize voter state
    pub async fn initialize(&mut self) {
        self.registry_id.set(None);
        self.registry_chain_id.set(None);
        self.owner.set(None);
        self.stake.set(Amount::ZERO);
        self.reputation_score.set(100); // Initial reputation
        self.total_votes.set(0);
        self.correct_votes.set(0);
        self.auto_vote_enabled.set(false);
        self.decision_strategy.set(DecisionStrategy::Manual);
    }
    
    // ==================== IDENTITY ====================
    
    /// Set registry ID and chain ID
    pub async fn set_registry(&mut self, registry_id: ApplicationId, registry_chain_id: ChainId) {
        self.registry_id.set(Some(registry_id));
        self.registry_chain_id.set(Some(registry_chain_id));
    }
    
    pub async fn get_registry(&self) -> Option<ApplicationId> {
        self.registry_id.get().clone()
    }
    
    pub async fn get_registry_chain_id(&self) -> Option<ChainId> {
        self.registry_chain_id.get().clone()
    }
    
    /// Set owner
    pub async fn set_owner(&mut self, owner: AccountOwner) {
        self.owner.set(Some(owner));
    }
    
    /// Get owner
    pub async fn get_owner(&self) -> Option<AccountOwner> {
        self.owner.get().clone()
    }
    
    /// Set stake
    pub async fn set_stake(&mut self, stake: Amount) {
        self.stake.set(stake);
    }
    
    /// Get stake
    pub async fn get_stake(&self) -> Amount {
        *self.stake.get()
    }
    
    /// Add stake
    pub async fn add_stake(&mut self, additional: Amount) {
        let current = *self.stake.get();
        self.stake.set(current.saturating_add(additional));
    }
    
    // ==================== VOTING ====================
    
    /// Add active vote
    pub async fn add_active_vote(&mut self, vote: ActiveVote) -> Result<(), String> {
        let market_id = vote.market_id;
        self.active_votes.insert(&market_id, vote)
            .map_err(|e| format!("Failed to add vote: {:?}", e))?;
        Ok(())
    }
    
    /// Get active vote
    pub async fn get_active_vote(&self, market_id: u64) -> Option<ActiveVote> {
        self.active_votes.get(&market_id).await.ok().flatten()
    }
    
    /// Update active vote
    pub async fn update_active_vote(&mut self, vote: ActiveVote) -> Result<(), String> {
        let market_id = vote.market_id;
        self.active_votes.insert(&market_id, vote)
            .map_err(|e| format!("Failed to update vote: {:?}", e))?;
        Ok(())
    }
    
    /// Remove active vote
    pub async fn remove_active_vote(&mut self, market_id: u64) -> Result<(), String> {
        self.active_votes.remove(&market_id)
            .map_err(|e| format!("Failed to remove vote: {:?}", e))?;
        Ok(())
    }
    
    /// Get all active votes
    pub async fn get_all_active_votes(&self) -> Vec<ActiveVote> {
        let mut votes = Vec::new();
        if let Ok(market_ids) = self.active_votes.indices().await {
            for market_id in market_ids {
                if let Ok(Some(vote)) = self.active_votes.get(&market_id).await {
                    votes.push(vote);
                }
            }
        }
        votes
    }
    
    /// Add vote to history
    pub async fn add_vote_history(&mut self, result: VoteResult) -> Result<(), String> {
        let market_id = result.market_id;
        self.vote_history.insert(&market_id, result)
            .map_err(|e| format!("Failed to add history: {:?}", e))?;
        Ok(())
    }
    
    /// Get vote history
    pub async fn get_vote_history(&self) -> Vec<VoteResult> {
        let mut history = Vec::new();
        if let Ok(market_ids) = self.vote_history.indices().await {
            for market_id in market_ids {
                if let Ok(Some(result)) = self.vote_history.get(&market_id).await {
                    history.push(result);
                }
            }
        }
        history
    }
    
    // ==================== REPUTATION ====================
    
    /// Update reputation (from registry)
    pub async fn update_reputation(&mut self, new_score: u64) {
        self.reputation_score.set(new_score);
    }
    
    /// Get reputation
    pub async fn get_reputation(&self) -> u64 {
        *self.reputation_score.get()
    }
    
    /// Increment total votes
    pub async fn increment_total_votes(&mut self) {
        let current = *self.total_votes.get();
        self.total_votes.set(current + 1);
    }
    
    /// Increment correct votes
    pub async fn increment_correct_votes(&mut self) {
        let current = *self.correct_votes.get();
        self.correct_votes.set(current + 1);
    }
    
    /// Get accuracy rate
    pub async fn get_accuracy_rate(&self) -> f64 {
        let total = *self.total_votes.get();
        if total == 0 {
            return 0.0;
        }
        let correct = *self.correct_votes.get();
        (correct as f64 / total as f64) * 100.0
    }
    
    // ==================== CONFIGURATION ====================
    
    /// Enable auto-vote
    pub async fn enable_auto_vote(&mut self) {
        self.auto_vote_enabled.set(true);
    }
    
    /// Disable auto-vote
    pub async fn disable_auto_vote(&mut self) {
        self.auto_vote_enabled.set(false);
    }
    
    /// Check if auto-vote is enabled
    pub async fn is_auto_vote_enabled(&self) -> bool {
        *self.auto_vote_enabled.get()
    }
    
    /// Set decision strategy
    pub async fn set_decision_strategy(&mut self, strategy: DecisionStrategy) {
        self.decision_strategy.set(strategy);
    }
    
    /// Get decision strategy
    pub async fn get_decision_strategy(&self) -> DecisionStrategy {
        self.decision_strategy.get().clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_active_vote_structure() {
        let vote = ActiveVote {
            market_id: 1,
            question: "Test?".to_string(),
            outcomes: vec!["Yes".to_string(), "No".to_string()],
            deadline: Timestamp::from(1000),
            commit_deadline: Timestamp::from(500),
            reveal_deadline: Timestamp::from(750),
            my_commitment: None,
            my_outcome: None,
            my_salt: None,
            status: VoteStatus::Requested,
        };
        
        assert_eq!(vote.market_id, 1);
        assert_eq!(vote.status, VoteStatus::Requested);
    }
    
    #[test]
    fn test_accuracy_calculation() {
        // This would require ContractRuntime for full test
        // Just verify the formula
        let total = 10u32;
        let correct = 8u32;
        let accuracy = (correct as f64 / total as f64) * 100.0;
        assert_eq!(accuracy, 80.0);
    }
}

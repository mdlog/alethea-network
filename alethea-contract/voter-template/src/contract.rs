// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

use linera_sdk::{
    Contract, ContractRuntime,
    views::{RootView, View},
};
use linera_sdk::linera_base_types::{
    AccountOwner, Amount, ApplicationId, Timestamp, WithContractAbi,
};
use alethea_oracle_types::{
    voter::{VoterOperation, VoterResponse, VoterError},
    RegistryMessage, RegistryOperation, RegistryResponse, DecisionStrategy, VoteStatus, VoteResult,
    OracleRegistryAbi,
};

use voter_template::state::{VoterState, ActiveVote};

/// Voter Template Contract
pub struct VoterContract {
    state: VoterState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(VoterContract);

impl WithContractAbi for VoterContract {
    type Abi = alethea_oracle_types::VoterTemplateAbi;
}

impl Contract for VoterContract {
    type Message = RegistryMessage;
    type Parameters = ();
    type InstantiationArgument = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = VoterState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        VoterContract { state, runtime }
    }

    async fn instantiate(&mut self, _arg: ()) {
        self.state.initialize().await;
    }

    async fn execute_operation(&mut self, operation: VoterOperation) -> VoterResponse {
        match operation {
            VoterOperation::Initialize { registry_id, initial_stake } => {
                self.initialize_voter(registry_id, initial_stake).await
            }
            
            VoterOperation::UpdateStake { additional_stake } => {
                self.update_stake(additional_stake).await
            }
            
            VoterOperation::SubmitVote { market_id, outcome_index, confidence } => {
                self.submit_vote(market_id, outcome_index, confidence).await
            }
            
            VoterOperation::GetActiveVotes => {
                self.get_active_votes().await
            }
            
            VoterOperation::GetVoteHistory => {
                self.get_vote_history().await
            }
            
            VoterOperation::SetDecisionStrategy { strategy } => {
                self.set_decision_strategy(strategy).await
            }
            
            VoterOperation::EnableAutoVote => {
                self.enable_auto_vote().await
            }
            
            VoterOperation::DisableAutoVote => {
                self.disable_auto_vote().await
            }
            
            VoterOperation::GetStatus => {
                self.get_status().await
            }
            
            VoterOperation::GetReputation => {
                self.get_reputation().await
            }
        }
    }

    async fn execute_message(&mut self, message: RegistryMessage) {
        match message {
            RegistryMessage::VoteRequest {
                market_id,
                question,
                outcomes,
                deadline,
                commit_deadline,
                reveal_deadline,
            } => {
                self.handle_vote_request(
                    market_id,
                    question,
                    outcomes,
                    deadline,
                    commit_deadline,
                    reveal_deadline,
                ).await;
            }
            
            RegistryMessage::RewardDistribution { market_id, amount } => {
                self.handle_reward(market_id, amount).await;
            }
            
            RegistryMessage::StakeSlashed { market_id, amount, reason } => {
                self.handle_slash(market_id, amount, reason).await;
            }
            
            _ => {
                // Ignore other messages
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl VoterContract {
    // ==================== INITIALIZATION ====================
    
    /// Initialize voter with registry
    async fn initialize_voter(
        &mut self,
        registry_id: ApplicationId,
        initial_stake: Amount,
    ) -> VoterResponse {
        // Check if already initialized
        if self.state.get_registry().await.is_some() {
            return VoterResponse::Error {
                code: VoterError::AlreadyInitialized.error_code(),
                message: VoterError::AlreadyInitialized.user_message(),
            };
        }
        
        // Set registry and stake
        let current_chain_id = self.runtime.chain_id();
        let voter_app_id = self.runtime.application_id().forget_abi();
        
        // Try to determine Registry's chain ID
        // For same-chain: use current chain_id
        // For cross-chain: would need to be passed as parameter (future enhancement)
        let registry_chain_id = current_chain_id; // Default to same chain
        self.state.set_registry(registry_id, registry_chain_id).await;
        self.state.set_stake(initial_stake).await;
        
        // Set owner
        if let Some(owner) = self.runtime.authenticated_signer() {
            self.state.set_owner(owner).await;
        }
        
        // Register with registry using appropriate mechanism
        // For same-chain: use call_application() (synchronous, immediate)
        // For cross-chain: use send_message() (asynchronous, requires inbox processing)
        let is_same_chain = registry_chain_id == current_chain_id;
        
        if is_same_chain {
            // Same-chain: Use call_application() for immediate execution
            // call_application() returns RegistryResponse directly (not Result)
            let response = self.runtime.call_application::<OracleRegistryAbi>(
                true, // authenticated
                registry_id.with_abi(),
                &RegistryOperation::RegisterVoter {
                    voter_app: voter_app_id,  // Pass voter's own ApplicationId
                    stake: initial_stake,
                },
            );
            
            match response {
                RegistryResponse::VoterRegistered { voter_id: _, initial_reputation: _ } => {
                    // Successfully registered via call_application
                    return VoterResponse::Initialized {
                        registry_id,
                        stake: initial_stake,
                    };
                }
                RegistryResponse::Error { code: _, message: _ } => {
                    // Registration failed, but we got a response
                    // Log error but continue to fallback to send_message
                    // This allows graceful degradation
                }
                _ => {
                    // Unexpected response, fallback to message
                }
            }
        }
        
        // Fallback: Use send_message() for cross-chain or if call_application failed
        // This works for both same-chain (with inbox processing) and cross-chain
        self.runtime.send_message(
            registry_chain_id,
            RegistryMessage::VoterRegistration {
                voter_app: voter_app_id,
                stake: initial_stake,
            },
        );
        
        VoterResponse::Initialized {
            registry_id,
            stake: initial_stake,
        }
    }
    
    /// Update stake
    async fn update_stake(&mut self, additional_stake: Amount) -> VoterResponse {
        self.state.add_stake(additional_stake).await;
        let new_total = self.state.get_stake().await;
        
        VoterResponse::StakeUpdated {
            new_total,
        }
    }
    
    // ==================== VOTING ====================
    
    /// Handle vote request from registry
    async fn handle_vote_request(
        &mut self,
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        commit_deadline: Timestamp,
        reveal_deadline: Timestamp,
    ) {
        // Create active vote
        let vote = ActiveVote {
            market_id,
            question: question.clone(),
            outcomes: outcomes.clone(),
            deadline,
            commit_deadline,
            reveal_deadline,
            my_commitment: None,
            my_outcome: None,
            my_salt: None,
            status: VoteStatus::Requested,
        };
        
        let _ = self.state.add_active_vote(vote).await;
        
        // If auto-vote is enabled, decide and commit automatically
        if self.state.is_auto_vote_enabled().await {
            self.auto_vote(market_id).await;
        }
    }
    
    /// Submit vote (manual)
    async fn submit_vote(
        &mut self,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
    ) -> VoterResponse {
        // Get active vote
        let mut vote = match self.state.get_active_vote(market_id).await {
            Some(v) => v,
            None => return VoterResponse::Error {
                code: VoterError::VoteNotFound.error_code(),
                message: VoterError::VoteNotFound.user_message(),
            },
        };
        
        // Validate outcome index
        if outcome_index >= vote.outcomes.len() {
            return VoterResponse::Error {
                code: VoterError::InvalidOutcomeIndex.error_code(),
                message: VoterError::InvalidOutcomeIndex.user_message(),
            };
        }
        
        // Validate confidence
        if confidence > 100 {
            return VoterResponse::Error {
                code: VoterError::InvalidConfidence.error_code(),
                message: VoterError::InvalidConfidence.user_message(),
            };
        }
        
        // Generate salt
        let salt = {
            let mut salt = [0u8; 32];
            let time = self.runtime.system_time().micros();
            for i in 0..32 {
                salt[i] = ((market_id + time + i as u64) % 256) as u8;
            }
            salt
        };
        
        // Create commitment
        let commitment_hash = self.create_commitment(outcome_index, salt);
        
        // Update vote
        vote.my_commitment = Some(commitment_hash);
        vote.my_outcome = Some(outcome_index);
        vote.my_salt = Some(salt);
        vote.status = VoteStatus::Committed;
        
        let _ = self.state.update_active_vote(vote).await;
        
        // Send commitment to registry
        if let Some(chain_id) = self.state.get_registry_chain_id().await {
            let voter_app_id = self.runtime.application_id().forget_abi();
            let stake = self.state.get_stake().await;
            self.runtime.send_message(
                chain_id,
                RegistryMessage::VoteCommitment {
                    market_id,
                    voter_app: voter_app_id,
                    commitment_hash,
                    stake_locked: stake,
                },
            );
        }
        
        // Schedule reveal (in real implementation, would use timer)
        // For now, reveal immediately after commit deadline
        self.schedule_reveal(market_id).await;
        
        VoterResponse::VoteSubmitted {
            market_id,
            outcome_index,
        }
    }
    
    /// Auto-vote based on decision strategy
    async fn auto_vote(&mut self, market_id: u64) {
        let vote = match self.state.get_active_vote(market_id).await {
            Some(v) => v,
            None => return,
        };
        
        let strategy = self.state.get_decision_strategy().await;
        
        let outcome_index = match strategy {
            DecisionStrategy::Manual => return, // Don't auto-vote in manual mode
            DecisionStrategy::Random => self.decide_random(&vote),
            DecisionStrategy::Oracle => self.decide_oracle(&vote).await,
            DecisionStrategy::ML => self.decide_ml(&vote).await,
        };
        
        // Submit the vote
        let _ = self.submit_vote(market_id, outcome_index, 80).await;
    }
    
    /// Decide outcome randomly
    fn decide_random(&self, vote: &ActiveVote) -> usize {
        // Simple pseudo-random based on market_id
        (vote.market_id % vote.outcomes.len() as u64) as usize
    }
    
    /// Decide outcome using external oracle
    async fn decide_oracle(&self, _vote: &ActiveVote) -> usize {
        // TODO: Implement external oracle integration
        0
    }
    
    /// Decide outcome using ML model
    async fn decide_ml(&self, _vote: &ActiveVote) -> usize {
        // TODO: Implement ML model integration
        0
    }
    
    /// Schedule reveal (simplified - in real implementation would use timer)
    async fn schedule_reveal(&mut self, market_id: u64) {
        // Get vote
        let vote = match self.state.get_active_vote(market_id).await {
            Some(v) => v,
            None => return,
        };
        
        // Check if we have commitment
        let (outcome, salt) = match (vote.my_outcome, vote.my_salt) {
            (Some(o), Some(s)) => (o, s),
            _ => return,
        };
        
        // Send reveal to registry
        if let Some(chain_id) = self.state.get_registry_chain_id().await {
            let voter_app_id = self.runtime.application_id().forget_abi();
            self.runtime.send_message(
                chain_id,
                RegistryMessage::VoteReveal {
                    market_id,
                    voter_app: voter_app_id,
                    outcome_index: outcome,
                    salt,
                    confidence: 80,
                },
            );
        }
        
        // Update status
        let mut updated_vote = vote;
        updated_vote.status = VoteStatus::Revealed;
        let _ = self.state.update_active_vote(updated_vote).await;
    }
    
    // ==================== REWARDS & SLASHING ====================
    
    /// Handle reward from registry
    async fn handle_reward(&mut self, market_id: u64, amount: Amount) {
        // Move vote to history
        if let Some(vote) = self.state.get_active_vote(market_id).await {
            let result = VoteResult {
                market_id,
                question: vote.question,
                my_outcome: vote.my_outcome.unwrap_or(0),
                winning_outcome: Some(vote.my_outcome.unwrap_or(0)),
                was_correct: Some(true),
                reward: Some(amount),
                timestamp: self.runtime.system_time(),
            };
            
            let _ = self.state.add_vote_history(result).await;
            let _ = self.state.remove_active_vote(market_id).await;
            
            // Update local stats
            self.state.increment_total_votes().await;
            self.state.increment_correct_votes().await;
        }
    }
    
    /// Handle stake slash from registry
    async fn handle_slash(&mut self, market_id: u64, amount: Amount, _reason: String) {
        // Reduce stake
        let current_stake = self.state.get_stake().await;
        let new_stake = current_stake.saturating_sub(amount);
        self.state.set_stake(new_stake).await;
        
        // Move vote to history
        if let Some(vote) = self.state.get_active_vote(market_id).await {
            let result = VoteResult {
                market_id,
                question: vote.question,
                my_outcome: vote.my_outcome.unwrap_or(0),
                winning_outcome: None,
                was_correct: Some(false),
                reward: None,
                timestamp: self.runtime.system_time(),
            };
            
            let _ = self.state.add_vote_history(result).await;
            let _ = self.state.remove_active_vote(market_id).await;
            
            // Update local stats
            self.state.increment_total_votes().await;
        }
    }
    
    // ==================== CONFIGURATION ====================
    
    /// Set decision strategy
    async fn set_decision_strategy(&mut self, strategy: DecisionStrategy) -> VoterResponse {
        self.state.set_decision_strategy(strategy.clone()).await;
        VoterResponse::StrategyUpdated { strategy }
    }
    
    /// Enable auto-vote
    async fn enable_auto_vote(&mut self) -> VoterResponse {
        self.state.enable_auto_vote().await;
        VoterResponse::Success
    }
    
    /// Disable auto-vote
    async fn disable_auto_vote(&mut self) -> VoterResponse {
        self.state.disable_auto_vote().await;
        VoterResponse::Success
    }
    
    // ==================== QUERIES ====================
    
    /// Get active votes
    async fn get_active_votes(&mut self) -> VoterResponse {
        let votes = self.state.get_all_active_votes().await;
        let vote_data: Vec<alethea_oracle_types::VoterVoteData> = votes.into_iter().map(|v| {
            alethea_oracle_types::VoterVoteData {
                market_id: v.market_id,
                question: v.question,
                outcomes: v.outcomes,
                deadline: v.deadline,
                commit_deadline: v.commit_deadline,
                reveal_deadline: v.reveal_deadline,
                my_commitment: v.my_commitment,
                my_outcome: v.my_outcome,
                my_salt: v.my_salt,
                status: v.status,
            }
        }).collect();
        VoterResponse::ActiveVotes(vote_data)
    }
    
    /// Get vote history
    async fn get_vote_history(&mut self) -> VoterResponse {
        let history = self.state.get_vote_history().await;
        VoterResponse::VoteHistory(history)
    }
    
    /// Get voter status
    async fn get_status(&mut self) -> VoterResponse {
        let status = alethea_oracle_types::VoterStatus {
            registry_id: self.state.get_registry().await.unwrap_or_else(|| {
                self.runtime.application_id().forget_abi()
            }),
            owner: self.state.get_owner().await.unwrap_or_else(|| {
                self.runtime.authenticated_signer().unwrap_or_else(|| 
                    AccountOwner::from(self.runtime.application_id().forget_abi())
                )
            }),
            stake: self.state.get_stake().await,
            locked_stake: Amount::ZERO, // TODO: Track locked stake
            active_votes: self.state.get_all_active_votes().await.len() as u32,
            total_votes: *self.state.total_votes.get(),
            is_active: true,
            auto_vote_enabled: self.state.is_auto_vote_enabled().await,
            decision_strategy: self.state.get_decision_strategy().await,
        };
        
        VoterResponse::Status(status)
    }
    
    /// Get reputation info
    async fn get_reputation(&mut self) -> VoterResponse {
        let info = alethea_oracle_types::VoterReputationInfo {
            score: self.state.get_reputation().await,
            total_votes: *self.state.total_votes.get(),
            correct_votes: *self.state.correct_votes.get(),
            accuracy_rate: self.state.get_accuracy_rate().await,
            correct_streak: 0, // TODO: Track streak
            last_updated: self.runtime.system_time(),
        };
        
        VoterResponse::Reputation(info)
    }
    
    // ==================== HELPERS ====================
    
    /// Create commitment hash
    fn create_commitment(&self, outcome_index: usize, salt: [u8; 32]) -> [u8; 32] {
        let mut data = [0u8; 40];
        data[..8].copy_from_slice(&outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&salt);
        
        self.hash_data(&data)
    }
    
    /// Simple hash function
    fn hash_data(&self, data: &[u8]) -> [u8; 32] {
        if data.is_empty() {
            return [0u8; 32];
        }

        let mut result = [0u8; 32];
        
        let len = data.len() as u64;
        result[0] = (len & 0xFF) as u8;
        result[1] = ((len >> 8) & 0xFF) as u8;
        result[2] = ((len >> 16) & 0xFF) as u8;
        result[3] = ((len >> 24) & 0xFF) as u8;
        
        const MAX_HASH_INPUT: usize = 10_000;
        let max_len = data.len().min(MAX_HASH_INPUT);
        
        for i in 0..max_len {
            let pos = i % 32;
            result[pos] ^= data[i];
        }
        
        for i in 0..32 {
            let a = result[i];
            let b = result[(i + 7) % 32];
            result[i] = a.wrapping_add(b);
        }
        
        result
    }
}

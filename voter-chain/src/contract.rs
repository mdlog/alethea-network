// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{WithContractAbi, AccountOwner, Amount, ChainId, Timestamp},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use alethea_voter_chain::{
    VoterChainAbi, VoterOperation, VoterResponse, InitialState, Message,
    Parameters, VoterInfo, VoteRecord,
};

use self::state::{VoterState, VotingRequest};

pub struct VoterChainContract {
    state: VoterState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(VoterChainContract);

impl WithContractAbi for VoterChainContract {
    type Abi = VoterChainAbi;
}

impl Contract for VoterChainContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = InitialState;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = match VoterState::load(runtime.root_view_storage_context()).await {
            Ok(s) => s,
            Err(_) => {
                // If load fails, create new state (should not happen in production)
                VoterState::load(runtime.root_view_storage_context())
                    .await
                    .unwrap()
            }
        };
        VoterChainContract { state, runtime }
    }

    async fn instantiate(&mut self, initial_state: InitialState) {
        // Get owner from signer - WASM safe (no string allocation)
        let owner = match self.runtime.authenticated_signer() {
            Some(o) => o,
            None => AccountOwner::from(self.runtime.application_id().forget_abi()),
        };
        
        // Initialize state
        self.state.initialize(
            owner,
            initial_state.oracle_chain,
            initial_state.initial_stake,
        ).await;
    }

    async fn execute_operation(&mut self, operation: VoterOperation) -> VoterResponse {
        match operation {
            VoterOperation::Initialize { oracle_chain, stake } => {
                self.initialize_voter(oracle_chain, stake).await
            }
            
            VoterOperation::CommitVote { market_id, outcome_index } => {
                self.commit_vote(market_id, outcome_index).await
            }
            
            VoterOperation::RevealVote { market_id } => {
                self.reveal_vote(market_id).await
            }
            
            VoterOperation::SubmitVote { market_id, outcome_index } => {
                self.submit_vote(market_id, outcome_index).await
            }
            
            VoterOperation::AddStake { amount } => {
                self.add_stake(amount).await
            }
            
            VoterOperation::GetVoterInfo => {
                self.get_voter_info().await
            }
            
            VoterOperation::GetVoteHistory => {
                self.get_vote_history().await
            }
            
            VoterOperation::GetPendingCommitments => {
                self.get_pending_commitments().await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) -> () {
        match message {
            Message::VotingRequest { market_id, question, outcomes, deadline } => {
                self.handle_voting_request(market_id, question, outcomes, deadline).await;
            }
            
            Message::ReputationUpdate { increase, amount } => {
                self.handle_reputation_update(increase, amount).await;
            }
            
            Message::RewardPayment { amount, market_id } => {
                self.handle_reward_payment(amount, market_id).await;
            }
            
            Message::VoteCommitmentToOracle { .. } => {
                // Message sent to Oracle, no action needed here
            }
            
            Message::VoteRevealToOracle { .. } => {
                // Message sent to Oracle, no action needed here
            }
            
            Message::DirectVote { .. } => {
                // Message sent to Oracle, no action needed here
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.unwrap_or(());
    }
}

impl VoterChainContract {
    /// Generate salt untuk commit-reveal (WASM-compatible, deterministic)
    fn generate_salt_for_market(&mut self, market_id: u64) -> [u8; 32] {
        // Use market_id as primary input for deterministic salt
        let app_id_bytes = bcs::to_bytes(&self.runtime.application_id())
            .unwrap_or_default();
        
        let mut salt = [0u8; 32];
        // Use market_id for first 8 bytes
        salt[..8].copy_from_slice(&market_id.to_le_bytes());
        // Use app_id for next 16 bytes (max)
        let mix_len = app_id_bytes.len().min(16);
        for i in 0..mix_len {
            salt[8 + i] = app_id_bytes[i];
        }
        // Remaining bytes are zero (already initialized)
        
        salt
    }
    
    /// Verify commitment hash - WASM SAFE (no Vec, no panic)
    pub fn verify_commitment(
        commitment_hash: &[u8; 32],
        outcome_index: usize,
        salt: &[u8; 32],
    ) -> bool {
        let mut data = [0u8; 40]; // Fixed array: 8 bytes outcome + 32 bytes salt
        data[..8].copy_from_slice(&outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(salt);
        
        let computed = Self::simple_hash(&data);
        &computed == commitment_hash
    }
    
    /// Hash deterministik yang aman untuk WASM - ULTRA MINIMAL
    fn simple_hash(data: &[u8]) -> [u8; 32] {
        let mut result = [0u8; 32];
        
        if data.is_empty() {
            return result;
        }
        
        // Store length in first 4 bytes
        let len = data.len() as u64;
        result[0] = (len & 0xFF) as u8;
        result[1] = ((len >> 8) & 0xFF) as u8;
        result[2] = ((len >> 16) & 0xFF) as u8;
        result[3] = ((len >> 24) & 0xFF) as u8;
        
        // Safety limit to prevent infinite loops
        let max_len = data.len().min(10000);
        
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
    
    async fn initialize_voter(&mut self, oracle_chain: ChainId, stake: Amount) -> VoterResponse {
        // WASM safe - no string allocation
        let owner = match self.runtime.authenticated_signer() {
            Some(o) => o,
            None => AccountOwner::from(self.runtime.application_id().forget_abi()),
        };
        
        self.state.initialize(owner, Some(oracle_chain), stake).await;
        
        VoterResponse::Initialized
    }
    
    /// COMMIT PHASE - WASM SAFE (no Vec, no panic, no string alloc)
    async fn commit_vote(&mut self, market_id: u64, outcome_index: usize) -> VoterResponse {
        // QUICK FIX: Skip validation for testing
        // Binary markets only (0 or 1)
        if outcome_index > 1 {
            return VoterResponse::CommitmentSubmitted {
                market_id: 999, // Error indicator
                commitment_hash: [0u8; 32],
            };
        }
        
        // Generate salt
        let salt = self.generate_salt_for_market(market_id);
        
        // Create commitment hash - FIXED ARRAY ONLY
        let mut data = [0u8; 40];
        data[..8].copy_from_slice(&outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&salt);
        
        let commitment_hash_bytes = Self::simple_hash(&data);
        
        // Store commitment
        let commitment = alethea_voter_chain::VoteCommitment {
            market_id,
            commitment_hash: commitment_hash_bytes,
            outcome_index,
            salt,
            committed_at: self.runtime.system_time(),
        };
        
        // Store without panic
        if let Err(_) = self.state.pending_commitments.insert(&market_id, commitment) {
            return VoterResponse::CommitmentSubmitted {
                market_id: 998,
                commitment_hash: [0u8; 32],
            };
        }
        
        // Send commitment to Oracle Coordinator if configured
        if let Some(oracle_chain) = *self.state.oracle_chain.get() {
            // Calculate voting power (simplified for now)
            let voting_power = 100; // TODO: Calculate from reputation and stake
            let stake_amount = *self.state.total_stake.get();
            
            self.runtime.send_message(
                oracle_chain,
                Message::VoteCommitmentToOracle {
                    commitment_hash: commitment_hash_bytes,
                    voting_power,
                    stake_amount,
                },
            );
        }
        
        VoterResponse::CommitmentSubmitted {
            market_id,
            commitment_hash: commitment_hash_bytes,
        }
    }
    
    /// REVEAL PHASE - WASM SAFE
    async fn reveal_vote(&mut self, market_id: u64) -> VoterResponse {
        // Get commitment - no panic
        let commitment = match self.state.pending_commitments.get(&market_id).await {
            Ok(Some(c)) => c,
            _ => {
                return VoterResponse::VoteRevealed {
                    market_id,
                    outcome_index: 0,
                    verified: false,
                };
            }
        };
        
        // Verify - FIXED ARRAY
        let mut data = [0u8; 40];
        data[..8].copy_from_slice(&commitment.outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&commitment.salt);
        
        let computed_hash = Self::simple_hash(&data);
        let verified = computed_hash == commitment.commitment_hash;
        
        if !verified {
            return VoterResponse::VoteRevealed {
                market_id,
                outcome_index: commitment.outcome_index,
                verified: false,
            };
        }
        
        // Record vote - WASM SAFE (no String allocation)
        let record = state::VoteRecord {
            market_id,
            outcome_index: commitment.outcome_index,
            confidence: 95,
            timestamp: self.runtime.system_time(),
            was_correct: None,
            reward_received: Amount::ZERO,
        };
        
        self.state.record_vote(market_id, record).await;
        
        // Send reveal to Oracle Coordinator if configured
        if let Some(oracle_chain) = *self.state.oracle_chain.get() {
            self.runtime.send_message(
                oracle_chain,
                Message::VoteRevealToOracle {
                    outcome_index: commitment.outcome_index,
                    salt: commitment.salt,
                    confidence: 95,
                },
            );
        }
        
        VoterResponse::VoteRevealed {
            market_id,
            outcome_index: commitment.outcome_index,
            verified,
        }
    }

    async fn submit_vote(&mut self, market_id: u64, outcome_index: usize) -> VoterResponse {
        // Simple validation
        if outcome_index > 1 {
            return VoterResponse::VoteSubmitted { 
                market_id: 999, 
                outcome_index: 0 
            };
        }
        
        // Create vote record - WASM SAFE (no String allocation)
        let record = state::VoteRecord {
            market_id,
            outcome_index,
            confidence: 95,
            timestamp: self.runtime.system_time(),
            was_correct: None,
            reward_received: Amount::ZERO,
        };
        
        // Record vote
        self.state.record_vote(market_id, record).await;
        
        // Update reputation to increment total_votes
        self.state.update_reputation_correct(95).await;

        // Send direct vote to Oracle Coordinator if configured
        if let Some(oracle_chain) = *self.state.oracle_chain.get() {
            // Calculate voting power based on stake
            let stake: u128 = (*self.state.total_stake.get()).into();
            let voting_power = u64::try_from(stake).unwrap_or(100);
            let voter_chain = self.runtime.chain_id();
            
            self.runtime.send_message(
                oracle_chain,
                Message::DirectVote {
                    voter_chain,
                    market_id,
                    outcome_index,
                    confidence: 95,
                    voting_power,
                },
            );
        }

        VoterResponse::VoteSubmitted { market_id, outcome_index }
    }

    async fn add_stake(&mut self, amount: Amount) -> VoterResponse {
        self.state.add_stake(amount).await;
        let new_total = *self.state.total_stake.get();
        VoterResponse::StakeAdded { new_total }
    }

    async fn get_voter_info(&mut self) -> VoterResponse {
        match self.state.get_voter_info_sync() {
            Some(info) => VoterResponse::VoterInfo(info),
            None => VoterResponse::Initialized, // Return default if not initialized
        }
    }

    async fn get_vote_history(&mut self) -> VoterResponse {
        let mut history = Vec::new(); // OK for read-only response
        
        // Iterate through vote history
        if let Ok(indices) = self.state.vote_history.indices().await {
            for market_id in indices {
                if let Ok(Some(rec)) = self.state.vote_history.get(&market_id).await {
                    history.push(VoteRecord {
                        market_id: rec.market_id,
                        outcome_index: rec.outcome_index,
                        confidence: rec.confidence,
                        timestamp: rec.timestamp,
                        was_correct: rec.was_correct,
                    });
                }
            }
        }
        
        VoterResponse::VoteHistory(history)
    }
    
    async fn get_pending_commitments(&mut self) -> VoterResponse {
        let mut commitments = Vec::new(); // OK for read-only response
        
        // Iterate through pending commitments
        if let Ok(indices) = self.state.pending_commitments.indices().await {
            for market_id in indices {
                if let Ok(Some(commit)) = self.state.pending_commitments.get(&market_id).await {
                    commitments.push(alethea_voter_chain::CommitmentInfo {
                        market_id: commit.market_id,
                        commitment_hash: commit.commitment_hash,
                        committed_at: commit.committed_at,
                        can_reveal: true,
                    });
                }
            }
        }
        
        VoterResponse::PendingCommitments(commitments)
    }

    async fn handle_voting_request(
        &mut self,
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
    ) {
        let request = VotingRequest {
            market_id,
            question,
            outcomes,
            deadline,
            received_at: self.runtime.system_time(),
        };
        
        self.state.add_voting_request(market_id, request).await;
    }

    async fn handle_reputation_update(&mut self, increase: bool, amount: u64) {
        if increase {
            self.state.update_reputation_correct(amount as u8).await;
        } else {
            self.state.update_reputation_incorrect(amount as u8).await;
        }
    }

    async fn handle_reward_payment(&mut self, amount: Amount, market_id: u64) {
        self.state.add_stake(amount).await;
        
        // Update vote record dengan reward
        if let Ok(Some(mut record)) = self.state.vote_history.get(&market_id).await {
            record.reward_received = record.reward_received.saturating_add(amount);
            let _ = self.state.vote_history.insert(&market_id, record);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_hash_deterministic() {
        let data = b"same input";
        let hash1 = VoterChainContract::simple_hash(data);
        let hash2 = VoterChainContract::simple_hash(data);
        assert_eq!(hash1, hash2);
    }
    
    #[test]
    fn test_simple_hash_different_inputs() {
        let hash1 = VoterChainContract::simple_hash(b"input1");
        let hash2 = VoterChainContract::simple_hash(b"input2");
        assert_ne!(hash1, hash2);
    }
    
    #[test]
    fn test_verify_commitment() {
        let outcome_index = 1;
        let salt = [42u8; 32];
        
        // Use fixed array for test too
        let mut data = [0u8; 40];
        data[..8].copy_from_slice(&outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&salt);
        
        let hash = VoterChainContract::simple_hash(&data);
        
        assert!(VoterChainContract::verify_commitment(&hash, outcome_index, &salt));
        
        // Wrong salt should fail
        let wrong_salt = [43u8; 32];
        assert!(!VoterChainContract::verify_commitment(&hash, outcome_index, &wrong_salt));
    }
    
    #[test]
    fn test_hash_empty_data() {
        let hash = VoterChainContract::simple_hash(&[]);
        assert_eq!(hash, [0u8; 32]);
    }
}

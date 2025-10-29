// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;
mod types;

use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, ChainId, Timestamp, WithContractAbi},
    views::RootView,
    Contract, ContractRuntime,
};
use alethea_oracle_types::{
    OracleCoordinatorAbi, CoordinatorOperation, CoordinatorResponse,
    Message, Parameters,
};

use crate::types::{Market, MarketStatus, VoterInfo, VoteCommitment, VoteReveal};
use self::state::OracleCoordinatorState;

pub struct OracleCoordinatorContract {
    state: OracleCoordinatorState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(OracleCoordinatorContract);

impl WithContractAbi for OracleCoordinatorContract {
    type Abi = OracleCoordinatorAbi;
}

impl Contract for OracleCoordinatorContract {
    type Message = Message;
    type Parameters = Parameters;
    type InstantiationArgument = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = OracleCoordinatorState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        OracleCoordinatorContract { state, runtime }
    }

    async fn instantiate(&mut self, _arg: ()) {
        // Initialize with default parameters
        self.state.initialize().await;
    }

    async fn execute_operation(&mut self, operation: CoordinatorOperation) -> CoordinatorResponse {
        match operation {
            CoordinatorOperation::CreateMarket { 
                question, 
                outcomes, 
                trading_deadline,
                voting_deadline,
                min_voters,
                category,
            } => {
                self.create_market(
                    question, 
                    outcomes, 
                    trading_deadline, 
                    voting_deadline,
                    min_voters,
                    category,
                ).await
            }
            
            CoordinatorOperation::RegisterVoter { 
                voter_chain, 
                initial_stake 
            } => {
                self.register_voter(voter_chain, initial_stake).await
            }
            
            CoordinatorOperation::StartVoting { market_id } => {
                self.start_voting(market_id).await
            }
            
            CoordinatorOperation::AggregateVotes { market_id } => {
                self.aggregate_votes(market_id).await
            }
            
            CoordinatorOperation::GetMarket { market_id } => {
                self.get_market(market_id).await
            }
            
            CoordinatorOperation::GetActiveMarkets => {
                self.get_active_markets().await
            }
            
            CoordinatorOperation::GetVoterInfo { voter_chain } => {
                self.get_voter_info(voter_chain).await
            }
            
            CoordinatorOperation::GetMarketStats { market_id } => {
                self.get_market_stats(market_id).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) -> () {
        match message {
            Message::VoteCommitment { 
                voter_chain, 
                market_id,
                commitment_hash,
                voting_power,
                stake_amount,
            } => {
                self.handle_commitment(
                    voter_chain,
                    market_id,
                    commitment_hash,
                    voting_power,
                    stake_amount,
                ).await;
            }
            
            Message::VoteReveal { 
                voter_chain,
                market_id, 
                outcome_index, 
                salt,
                confidence,
            } => {
                self.handle_reveal(
                    voter_chain,
                    market_id,
                    outcome_index,
                    salt,
                    confidence,
                ).await;
            }
            
            Message::MarketResolutionRequest { 
                market_id, 
                requester 
            } => {
                self.handle_resolution_request(market_id, requester).await;
            }
            
            Message::ResolutionRequest {
                market_id,
                question,
                outcomes,
            } => {
                self.handle_market_resolution_request(market_id, question, outcomes).await;
            }
            
            Message::DirectVote {
                voter_chain,
                market_id,
                outcome_index,
                confidence,
                voting_power,
            } => {
                self.handle_direct_vote(voter_chain, market_id, outcome_index, confidence, voting_power).await;
            }
            
            _ => {
                // Handle other messages if needed
            }
        }
    }

    async fn store(mut self) {
        // RootView automatically persists state
        // No manual save needed
    }
}

impl OracleCoordinatorContract {
    /// Batas maksimal untuk data hashing
    const MAX_HASH_INPUT: usize = 10_000;

    /// Create new market untuk resolusi - WASM SAFE
    async fn create_market(
        &mut self,
        question: String,
        outcomes: Vec<String>,
        trading_deadline: Timestamp,
        voting_deadline: Timestamp,
        min_voters: u32,
        category: String,
    ) -> CoordinatorResponse {
        // Simple validation without panic
        if outcomes.len() < 2 || outcomes.len() > 10 {
            return CoordinatorResponse::Error { error_code: 1 }; // Invalid outcomes
        }
        
        if trading_deadline >= voting_deadline {
            return CoordinatorResponse::Error { error_code: 2 }; // Invalid deadlines
        }
        
        if min_voters < 3 {
            return CoordinatorResponse::Error { error_code: 3 }; // Min voters too low
        }

        let market_id = self.state.next_market_id().await;
        let creator = self.runtime.authenticated_signer();

        let market = Market {
            id: market_id,
            question: question.clone(),
            outcomes,
            creator,
            created_at: self.runtime.system_time(),
            trading_deadline,
            voting_deadline,
            min_voters,
            category,
            status: MarketStatus::Active,
            winning_outcome: None,
            confidence_score: None,
            total_commitments: 0,
            total_reveals: 0,
        };

        self.state.add_market(market_id, market).await;

        CoordinatorResponse::MarketCreated { 
            market_id,
            question_length: question.len() as u32, // WASM safe - store length
        }
    }

    /// Register voter chain ke oracle - WASM SAFE
    async fn register_voter(
        &mut self,
        voter_chain: ChainId,
        initial_stake: Amount,
    ) -> CoordinatorResponse {
        let params = self.runtime.application_parameters();
        
        if initial_stake < params.min_stake {
            return CoordinatorResponse::Error { error_code: 4 }; // Insufficient stake
        }

        // Check jika sudah terdaftar
        if self.state.is_voter_registered(&voter_chain).await {
            return CoordinatorResponse::Error { error_code: 5 }; // Already registered
        }

        let voter_info = VoterInfo {
            chain_id: voter_chain,
            reputation_score: 100, // Starting reputation
            total_stake: initial_stake,
            locked_stake: Amount::ZERO,
            total_votes: 0,
            total_correct: 0,
            total_incorrect: 0,
            correct_streak: 0,
            registered_at: self.runtime.system_time(),
            last_active: self.runtime.system_time(),
        };

        self.state.register_voter(voter_chain, voter_info).await;

        CoordinatorResponse::VoterRegistered { 
            voter_chain,
            initial_reputation: 100,
        }
    }

    /// Start voting period untuk market - WASM SAFE
    async fn start_voting(&mut self, market_id: u64) -> CoordinatorResponse {
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return CoordinatorResponse::Error { error_code: 6 }, // Market not found
        };

        // Validasi status
        if market.status != MarketStatus::Active {
            return CoordinatorResponse::Error { error_code: 7 }; // Market not active
        }

        // Check deadline
        if self.runtime.system_time() < market.trading_deadline {
            return CoordinatorResponse::Error { error_code: 8 }; // Trading period not ended
        }

        // Update status
        let mut updated_market = market.clone();
        updated_market.status = MarketStatus::VotingStarted;
        self.state.update_market(market_id, updated_market.clone()).await;

        // Broadcast ke semua registered voters
        let voters = self.state.get_all_voters().await;
        let total_voters = voters.len();
        
        for voter_chain in voters {
            self.runtime.send_message(
                voter_chain,
                Message::VotingRequest {
                    market_id,
                    question: updated_market.question.clone(),
                    outcomes: updated_market.outcomes.clone(),
                    deadline: updated_market.voting_deadline,
                },
            );
        }

        CoordinatorResponse::VotingStarted { 
            market_id,
            total_voters_notified: total_voters as u32,
        }
    }

    /// Handle commitment dari voter - WASM SAFE
    async fn handle_commitment(
        &mut self,
        voter_chain: ChainId,
        market_id: u64,
        commitment_hash: [u8; 32],
        voting_power: u64,
        stake_amount: Amount,
    ) {
        // Validasi voter terdaftar
        if !self.state.is_voter_registered(&voter_chain).await {
            return; // Ignore dari unregistered voter
        }

        // Validasi market status
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return,
        };

        if market.status != MarketStatus::VotingStarted 
            && market.status != MarketStatus::CommitPhase {
            return; // Ignore jika bukan fase commit
        }

        // Store commitment
        let commitment = alethea_oracle_types::VoteCommitment {
            voter_chain,
            market_id,
            commitment_hash,
            voting_power,
            stake_amount,
            committed_at: self.runtime.system_time(),
        };

        self.state.add_commitment(market_id, voter_chain, commitment).await;

        // Update market status jika perlu
        if market.status == MarketStatus::VotingStarted {
            let mut updated_market = market;
            updated_market.status = MarketStatus::CommitPhase;
            updated_market.total_commitments = 1;
            self.state.update_market(market_id, updated_market).await;
        } else {
            let mut updated_market = market;
            updated_market.total_commitments += 1;
            self.state.update_market(market_id, updated_market).await;
        }

        // Lock stake
        self.state.lock_voter_stake(voter_chain, stake_amount).await;
    }

    /// Handle reveal dari voter - WASM SAFE
    async fn handle_reveal(
        &mut self,
        voter_chain: ChainId,
        market_id: u64,
        outcome_index: usize,
        salt: [u8; 32],
        confidence: u8,
    ) {
        // Get commitment
        let commitment = match self.state.get_commitment(market_id, voter_chain).await {
            Some(c) => c,
            None => return, // No commitment found
        };

        // Verify reveal matches commitment - FIXED ARRAY
        let mut data = [0u8; 40]; // 8 bytes outcome + 32 bytes salt
        data[..8].copy_from_slice(&outcome_index.to_le_bytes());
        data[8..40].copy_from_slice(&salt);

        let computed_hash = self.simple_hash(&data);
        
        if computed_hash != commitment.commitment_hash {
            // Invalid reveal - slash stake
            self.state.slash_voter(voter_chain, commitment.stake_amount).await;
            return;
        }

        // Valid reveal - store it
        let reveal = alethea_oracle_types::VoteReveal {
            voter_chain,
            market_id,
            outcome_index,
            salt,
            confidence,
            voting_power: commitment.voting_power,
            revealed_at: self.runtime.system_time(),
        };

        self.state.add_reveal(market_id, voter_chain, reveal).await;

        // Update market status
        let mut market = self.state.get_market(market_id).await
            .expect("Market not found");
        
        if market.status == MarketStatus::CommitPhase {
            market.status = MarketStatus::RevealPhase;
        }
        market.total_reveals += 1;
        
        self.state.update_market(market_id, market).await;
    }

    /// Handle direct vote (no commit-reveal) - WASM SAFE
    async fn handle_direct_vote(
        &mut self,
        voter_chain: ChainId,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        voting_power: u64,
    ) {
        // Check if voter is registered
        if !self.state.is_voter_registered(&voter_chain).await {
            return; // Ignore unregistered voter
        }

        // Check if market exists
        let mut market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return,
        };

        // Accept direct votes in any active voting phase
        if !market.is_voting_phase() {
            return;
        }

        // Convert direct vote to reveal format for compatibility
        let reveal = alethea_oracle_types::VoteReveal {
            voter_chain,
            market_id,
            outcome_index,
            salt: [0u8; 32], // No salt for direct votes
            confidence,
            voting_power,
            revealed_at: self.runtime.system_time(),
        };

        self.state.add_reveal(market_id, voter_chain, reveal).await;

        // Update market status
        market.total_reveals += 1;
        self.state.update_market(market_id, market).await;
    }

    /// Aggregate votes dan resolve market - WASM SAFE
    async fn aggregate_votes(&mut self, market_id: u64) -> CoordinatorResponse {
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return CoordinatorResponse::Error { error_code: 6 }, // Market not found
        };

        // Validasi status - accept if in reveal phase OR if has votes (for direct voting)
        if market.status != MarketStatus::RevealPhase && market.total_reveals == 0 {
            return CoordinatorResponse::Error { error_code: 9 }; // Market not in reveal phase
        }

        // Check jika cukup reveals
        if market.total_reveals < market.min_voters {
            return CoordinatorResponse::Error { error_code: 10 }; // Not enough reveals
        }

        // Check deadline
        if self.runtime.system_time() < market.voting_deadline {
            return CoordinatorResponse::Error { error_code: 11 }; // Voting deadline not reached
        }

        // Get all reveals
        let reveals = self.state.get_all_reveals(market_id).await;

        // Aggregate menggunakan weighted majority
        let (winning_outcome, confidence) = self.aggregate_weighted_majority(
            reveals.clone(),
            market.outcomes.len(),
        );

        // Update market dengan hasil
        let mut updated_market = market.clone();
        updated_market.status = MarketStatus::Resolved;
        updated_market.winning_outcome = Some(winning_outcome);
        updated_market.confidence_score = Some(confidence);

        self.state.update_market(market_id, updated_market.clone()).await;

        // Update reputation untuk semua voters
        for reveal in &reveals {
            let was_correct = reveal.outcome_index == winning_outcome;
            
            if was_correct {
                self.state.update_voter_reputation_correct(reveal.voter_chain).await;
            } else {
                self.state.update_voter_reputation_incorrect(reveal.voter_chain).await;
            }
        }

        // Distribute rewards ke correct voters
        self.distribute_rewards(market_id, winning_outcome, reveals.clone()).await;

        // Send resolution ke market creator
        let timestamp = self.runtime.system_time();
        let chain_id = self.runtime.chain_id();
        self.runtime.send_message(
            // TODO: Get market app chain from market creator
            chain_id,
            Message::MarketResolved {
                market_id,
                outcome: winning_outcome,
                confidence,
                timestamp,
            },
        );

        CoordinatorResponse::MarketResolved { 
            market_id,
            winning_outcome,
            confidence,
            total_voters: reveals.len() as u32,
        }
    }

    /// Weighted majority aggregation - WASM SAFE
    fn aggregate_weighted_majority(
        &self,
        reveals: Vec<alethea_oracle_types::VoteReveal>,
        num_outcomes: usize,
    ) -> (usize, u8) {
        use std::collections::HashMap;

        let mut outcome_weights: HashMap<usize, f64> = HashMap::new();
        let mut total_weight = 0.0;

        for reveal in reveals {
            // Weight = voting_power * confidence
            let weight = (reveal.voting_power as f64) 
                * (reveal.confidence as f64 / 100.0);
            
            *outcome_weights.entry(reveal.outcome_index).or_insert(0.0) += weight;
            total_weight += weight;
        }

        // Find winner
        let (winning_outcome, winning_weight) = outcome_weights
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(idx, weight)| (*idx, *weight))
            .unwrap_or((0, 0.0));

        // Calculate confidence (percentage of winning outcome)
        let confidence = if total_weight > 0.0 {
            ((winning_weight / total_weight) * 100.0).min(100.0) as u8
        } else {
            0
        };

        (winning_outcome, confidence)
    }

    /// Distribute rewards ke correct voters - WASM SAFE
    async fn distribute_rewards(
        &mut self,
        market_id: u64,
        winning_outcome: usize,
        reveals: Vec<alethea_oracle_types::VoteReveal>,
    ) {
        let params = self.runtime.application_parameters();
        
        // Filter correct voters
        let correct_voters: Vec<_> = reveals
            .iter()
            .filter(|r| r.outcome_index == winning_outcome)
            .collect();

        if correct_voters.is_empty() {
            return;
        }

        // Calculate total voting power dari correct voters
        let total_voting_power: u64 = correct_voters
            .iter()
            .map(|v| v.voting_power)
            .sum();

        // Reward pool (bisa dari market fees, untuk sekarang fixed amount)
        let reward_pool = Amount::from_tokens(1000); // TODO: Calculate from fees

        // Distribute proportionally
        for voter in correct_voters {
            let voter_share = (voter.voting_power as f64) 
                / (total_voting_power as f64);
            let reward_pool_u128: u128 = reward_pool.into();
            let reward = Amount::from_tokens(
                (reward_pool_u128 as f64 * voter_share) as u128
            );

            // Send reward ke voter chain
            self.runtime.send_message(
                voter.voter_chain,
                Message::RewardPayment {
                    amount: reward,
                    market_id,
                },
            );

            // Unlock stake
            if let Some(commitment) = self.state.get_commitment(market_id, voter.voter_chain).await {
                self.state.unlock_voter_stake(
                    voter.voter_chain, 
                    commitment.stake_amount
                ).await;
            }
        }

        // Slash incorrect voters
        for reveal in reveals {
            if reveal.outcome_index != winning_outcome {
                if let Some(commitment) = self.state.get_commitment(market_id, reveal.voter_chain).await {
                    // Slash percentage dari stake
                    let stake_u128: u128 = commitment.stake_amount.into();
                    let slash_amount = Amount::from_tokens(
                        (stake_u128 * params.slash_percentage as u128) / 100
                    );
                    
                    self.state.slash_voter(reveal.voter_chain, slash_amount).await;
                }
            }
        }
    }

    /// Get market info
    async fn get_market(&mut self, market_id: u64) -> CoordinatorResponse {
        match self.state.get_market(market_id).await {
            Some(market) => CoordinatorResponse::Market(market),
            None => CoordinatorResponse::Error { error_code: 6 }, // Market not found
        }
    }

    /// Get active markets
    async fn get_active_markets(&mut self) -> CoordinatorResponse {
        let markets = self.state.get_active_markets().await;
        CoordinatorResponse::ActiveMarkets(markets)
    }

    /// Get voter info
    async fn get_voter_info(&mut self, voter_chain: ChainId) -> CoordinatorResponse {
        match self.state.get_voter_info(voter_chain).await {
            Some(info) => CoordinatorResponse::VoterInfo(info),
            None => CoordinatorResponse::Error { error_code: 12 }, // Voter not found
        }
    }

    /// Get market statistics
    async fn get_market_stats(&mut self, market_id: u64) -> CoordinatorResponse {
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return CoordinatorResponse::Error { error_code: 6 }, // Market not found
        };

        let stats = alethea_oracle_types::MarketStats {
            market_id,
            total_commitments: market.total_commitments,
            total_reveals: market.total_reveals,
            participation_rate: if market.total_commitments > 0 {
                (market.total_reveals as f64 / market.total_commitments as f64 * 100.0) as u8
            } else {
                0
            },
            confidence_score: market.confidence_score.unwrap_or(0),
            status: market.status,
        };

        CoordinatorResponse::MarketStats(stats)
    }

    /// Handle resolution request dari prediction market app
    async fn handle_resolution_request(
        &mut self,
        market_id: u64,
        requester: ChainId,
    ) {
        let market = match self.state.get_market(market_id).await {
            Some(m) => m,
            None => return,
        };

        // Jika sudah resolved, kirim hasil
        if market.status == MarketStatus::Resolved {
            if let Some(outcome) = market.winning_outcome {
                let timestamp = self.runtime.system_time();
                self.runtime.send_message(
                    requester,
                    Message::MarketResolved {
                        market_id,
                        outcome,
                        confidence: market.confidence_score.unwrap_or(0),
                        timestamp,
                    },
                );
            }
        }
    }
    
    /// Handle resolution request from Market-chain - WASM SAFE
    async fn handle_market_resolution_request(
        &mut self,
        market_id: u64,
        question: String,
        outcomes: Vec<String>,
    ) {
        // Check if market already exists
        if self.state.get_market(market_id).await.is_some() {
            // Market already exists, start voting if not started
            return;
        }
        
        // Create new market in Oracle Coordinator
        let current_time = self.runtime.system_time();
        let trading_deadline = current_time; // Trading already ended
        // Voting deadline: use far future for now (voting starts immediately)
        // Note: In production, calculate proper future timestamp
        let voting_deadline = Timestamp::from(u64::MAX / 2); // Far future
        
        // Create market with same ID as market-chain
        let _response = self.create_market(
            question,
            outcomes,
            trading_deadline,
            voting_deadline,
            1, // min_voters = 1 for testing
            "oracle".to_string(),
        ).await;
        
        // Automatically start voting
        let _ = self.start_voting(market_id).await;
    }

    /// Simple hash function - WASM SAFE (no Vec allocation)
    fn simple_hash(&self, data: &[u8]) -> [u8; 32] {
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
        let max_len = data.len().min(Self::MAX_HASH_INPUT);
        
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::util::BlockingWait;

    #[test]
    fn test_hash_consistency() {
        let coordinator = create_test_coordinator();
        
        let data = b"test data";
        let hash1 = coordinator.simple_hash(data);
        let hash2 = coordinator.simple_hash(data);
        
        assert_eq!(hash1, hash2, "Hash harus deterministik");
    }

    #[test]
    fn test_hash_large_data() {
        let coordinator = create_test_coordinator();
        
        let large_data = vec![0u8; 100_000];
        let hash = coordinator.simple_hash(&large_data);
        
        assert_eq!(hash.len(), 32);
    }

    #[test]
    fn test_aggregate_weighted_majority() {
        let coordinator = create_test_coordinator();
        
        let reveals = vec![
            alethea_oracle_types::VoteReveal {
                voter_chain: ChainId::root(0),
                market_id: 1,
                outcome_index: 0,
                salt: [0u8; 32],
                confidence: 95,
                voting_power: 150,
                revealed_at: Timestamp::from(0),
            },
            alethea_oracle_types::VoteReveal {
                voter_chain: ChainId::root(1),
                market_id: 1,
                outcome_index: 0,
                salt: [1u8; 32],
                confidence: 90,
                voting_power: 120,
                revealed_at: Timestamp::from(0),
            },
            alethea_oracle_types::VoteReveal {
                voter_chain: ChainId::root(2),
                market_id: 1,
                outcome_index: 1,
                salt: [2u8; 32],
                confidence: 80,
                voting_power: 100,
                revealed_at: Timestamp::from(0),
            },
        ];

        let (winner, confidence) = coordinator.aggregate_weighted_majority(reveals, 2);
        
        assert_eq!(winner, 0, "Outcome 0 harus menang");
        assert!(confidence > 60, "Confidence harus > 60%");
    }

    fn create_test_coordinator() -> OracleCoordinatorContract {
        let runtime = ContractRuntime::new();
        let state = OracleCoordinatorState::load(runtime.root_view_storage_context())
            .blocking_wait()
            .expect("Failed to load state");
        
        OracleCoordinatorContract { state, runtime }
    }
}

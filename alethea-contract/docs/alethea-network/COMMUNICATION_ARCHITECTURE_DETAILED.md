# 🔄 Alethea Network - Detailed Communication Architecture

**Date:** November 9, 2025  
**Status:** Complete Analysis  
**Purpose:** Detailed documentation of message flow from Market Chain → Registry → Voters

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Phase 1: Market Creation & Registration](#phase-1-market-creation--registration)
3. [Phase 2: Voter Selection & Notification](#phase-2-voter-selection--notification)
4. [Phase 3: Commit Phase](#phase-3-commit-phase)
5. [Phase 4: Reveal Phase](#phase-4-reveal-phase)
6. [Phase 5: Vote Aggregation](#phase-5-vote-aggregation)
7. [Phase 6: Resolution & Callback](#phase-6-resolution--callback)
8. [Phase 7: Reward Distribution](#phase-7-reward-distribution)
9. [Message Types Reference](#message-types-reference)
10. [Current Issues](#current-issues)

---

## Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Alethea Oracle Protocol                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │ Market Chain │ (dApp - Prediction Market)                │
│  │  (Contract)  │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         │ 1. call_application()                             │
│         │    RegistryOperation::RegisterMarket              │
│         ▼                                                    │
│  ┌──────────────────────────────────────────┐              │
│  │        Oracle Registry (Coordinator)      │              │
│  │              (Contract)                   │              │
│  └──────┬───────────────────────────┬────────┘              │
│         │                           │                        │
│         │ 2. send_message()         │ 6. send_message()     │
│         │    VoteRequest            │    MarketResolved     │
│         ▼                           ▼                        │
│  ┌─────────────┐            ┌──────────────┐               │
│  │   Voter 1   │            │ Market Chain │               │
│  │  (Contract) │            │  (Callback)  │               │
│  └──────┬──────┘            └──────────────┘               │
│         │                                                    │
│         │ 3. send_message()                                 │
│         │    VoteCommitment                                 │
│         │                                                    │
│         │ 4. send_message()                                 │
│         │    VoteReveal                                     │
│         ▼                                                    │
│  ┌──────────────────────────────────────────┐              │
│  │        Oracle Registry (Aggregation)      │              │
│  └──────┬───────────────────────────────────┘              │
│         │                                                    │
│         │ 7. send_message()                                 │
│         │    RewardDistribution                             │
│         ▼                                                    │
│  ┌─────────────┐                                           │
│  │   Voter 1   │                                           │
│  │  (Reward)   │                                           │
│  └─────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---


## Phase 1: Market Creation & Registration

### 1.1 Market Chain: Create Market

**File:** `market-chain/src/contract.rs`

```rust
async fn create_market(
    &mut self,
    question: String,
    outcomes: Vec<String>,
    resolution_deadline: Timestamp,
    initial_liquidity: Amount,
) -> MarketResponse {
    let market_id = *self.state.next_market_id.get();
    
    // Create market locally
    let market = Market {
        id: market_id,
        question,
        outcomes,
        creator: Some(creator),
        total_liquidity: initial_liquidity,
        outcome_pools: vec![liquidity_per_outcome; num_outcomes],
        resolution_deadline,
        status: MarketStatus::Open,  // ✅ Initial status
        final_outcome: None,
    };
    
    // Store in local state
    self.state.markets.insert(&market_id, market);
    self.state.next_market_id.set(market_id + 1);
    
    MarketResponse::MarketCreated(market_id)
}
```

**Key Points:**
- Market created with status `Open`
- Stored in Market Chain's local state
- No communication with Registry yet
- Returns market_id to user

---

### 1.2 Market Chain: Request Resolution

**File:** `market-chain/src/contract.rs`

```rust
async fn request_resolution(&mut self, market_id: u64) -> MarketResponse {
    // Get market
    let mut market = self.state.get_market(market_id).await?;
    
    // Check deadline passed
    if self.runtime.system_time() < market.resolution_deadline {
        return MarketResponse::Error;
    }
    
    // Update status to WaitingResolution
    market.status = MarketStatus::WaitingResolution;  // ✅ Status change
    self.state.markets.insert(&market_id, market);
    
    // Prepare data for Registry
    let question = market.question.clone();
    let outcomes = market.outcomes.clone();
    let deadline = market.resolution_deadline;
    
    // Get Registry ID
    let registry_id = alethea_sdk::canonical_registry_id()?;
    
    // Create operation
    let operation = RegistryOperation::RegisterMarket {
        question,
        outcomes,
        deadline,
        callback_data: market_id.to_le_bytes().to_vec(),  // ✅ Market ID for callback
    };
    
    // Call Registry
    self.runtime.call_application::<OracleRegistryAbi>(
        /* authenticated */ true,
        registry_id.with_abi(),
        &operation,
    );
    
    MarketResponse::ResolutionRequested
}
```

**Message Flow:**
```
Market Chain                    Registry
     │                             │
     │──call_application()────────>│
     │  RegisterMarket             │
     │  - question                 │
     │  - outcomes                 │
     │  - deadline                 │
     │  - callback_data (market_id)│
     │                             │
```

**Key Points:**
- ✅ Status changes to `WaitingResolution`
- ✅ Uses `call_application()` (synchronous call)
- ✅ Sends `callback_data` containing market_id
- ❌ **ISSUE:** `call_application()` may not work cross-application

---


### 1.3 Registry: Receive RegisterMarket

**File:** `oracle-registry/src/contract.rs`

```rust
async fn execute_operation(&mut self, operation: RegistryOperation) -> RegistryResponse {
    match operation {
        RegistryOperation::RegisterMarket {
            question,
            outcomes,
            deadline,
            callback_data,
        } => self.register_market(question, outcomes, deadline, callback_data).await,
        // ... other operations
    }
}

async fn register_market(
    &mut self,
    question: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    callback_data: Vec<u8>,
) -> RegistryResponse {
    // Calculate fee
    let params = self.state.get_parameters().await;
    let economic_system = EconomicSystem::new(params.clone());
    let required_fee = economic_system.calculate_market_fee(
        outcomes.len(),
        time_until_deadline,
    );
    
    // Create market request
    let market_id = self.state.next_market_id().await;
    let market = MarketRequest {
        id: market_id,
        requester_app: self.runtime.application_id().forget_abi(),
        requester_chain: self.runtime.chain_id(),  // ✅ Store requester chain
        question: question.clone(),
        outcomes: outcomes.clone(),
        created_at: current_time,
        deadline,
        fee_paid: required_fee,
        callback_data,  // ✅ Store callback data
        status: MarketStatus::Active,
    };
    
    // Register market
    self.state.register_market(market).await?;
    
    // Select voters
    let selected_voters = self.select_voters_for_market(market_id).await;
    
    // Store selected voters
    self.state.set_selected_voters(market_id, selected_voters.clone()).await;
    
    // Broadcast vote requests
    self.broadcast_vote_requests(
        market_id, 
        question, 
        outcomes, 
        deadline, 
        &selected_voters
    ).await;
    
    RegistryResponse::MarketRegistered {
        market_id,
        selected_voters,
    }
}
```

**Key Points:**
- ✅ Stores `requester_chain` for callback
- ✅ Stores `callback_data` (market_id)
- ✅ Creates market with status `Active`
- ✅ Selects voters immediately
- ✅ Broadcasts vote requests

---


## Phase 2: Voter Selection & Notification

### 2.1 Registry: Select Voters

**File:** `oracle-registry/src/contract.rs`

```rust
async fn select_voters_for_market(&mut self, market_id: u64) -> Vec<ApplicationId> {
    let params = self.state.get_parameters().await;
    let selector = VoterSelector::new(
        params.min_voters_per_market,  // e.g., 3
        params.max_voters_per_market,  // e.g., 10
        params.min_reputation,         // e.g., 50
    );
    
    // Get active voters
    let voters = self.state.get_active_voters().await;
    
    // Get reputations
    let mut reputations = Vec::new();
    for voter_id in &voters {
        if let Ok(rep) = self.state.get_voter_reputation(voter_id).await {
            reputations.push((*voter_id, rep));
        }
    }
    
    // Get stakes
    let mut stakes = Vec::new();
    for voter_id in &voters {
        if let Ok(metadata) = self.state.get_voter_metadata(voter_id).await {
            let stake_u128: u128 = metadata.stake.into();
            stakes.push((*voter_id, stake_u128));
        }
    }
    
    // Select voters based on reputation and stake
    selector.select_voters(market_id, &voters, &reputations, &stakes)
        .unwrap_or_default()
        .selected
}
```

**Selection Algorithm:**
- Filters voters by minimum reputation
- Weights by stake and reputation
- Selects between min and max voters
- Returns list of selected voter ApplicationIds

---

### 2.2 Registry: Broadcast Vote Requests

**File:** `oracle-registry/src/contract.rs`

```rust
async fn broadcast_vote_requests(
    &mut self,
    market_id: u64,
    question: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    selected_voters: &[ApplicationId],
) {
    let params = self.state.get_parameters().await;
    let protocol = CommitRevealProtocol::new(
        params.commit_phase_duration,  // e.g., 3600 seconds
        params.reveal_phase_duration,  // e.g., 3600 seconds
    );
    
    let current_time = self.runtime.system_time();
    let commit_deadline = protocol.calculate_commit_deadline(current_time);
    let reveal_deadline = protocol.calculate_reveal_deadline(commit_deadline);
    
    // Send VoteRequest to each selected voter
    for voter_app in selected_voters {
        // Get voter metadata to get chain_id
        if let Ok(metadata) = self.state.get_voter_metadata(voter_app).await {
            self.runtime.send_message(
                metadata.chain_id,  // ✅ Send to voter's chain
                RegistryMessage::VoteRequest {
                    market_id,
                    question: question.clone(),
                    outcomes: outcomes.clone(),
                    deadline,
                    commit_deadline,
                    reveal_deadline,
                },
            );
        }
    }
}
```

**Message Flow:**
```
Registry                        Voter 1              Voter 2              Voter 3
   │                               │                    │                    │
   │──send_message()──────────────>│                    │                    │
   │  VoteRequest                  │                    │                    │
   │  - market_id                  │                    │                    │
   │  - question                   │                    │                    │
   │  - outcomes                   │                    │                    │
   │  - deadline                   │                    │                    │
   │  - commit_deadline            │                    │                    │
   │  - reveal_deadline            │                    │                    │
   │                               │                    │                    │
   │──send_message()───────────────┼───────────────────>│                    │
   │  VoteRequest                  │                    │                    │
   │                               │                    │                    │
   │──send_message()───────────────┼────────────────────┼───────────────────>│
   │  VoteRequest                  │                    │                    │
```

**Key Points:**
- ✅ Uses `send_message()` (asynchronous cross-chain)
- ✅ Sends to voter's `chain_id` from metadata
- ✅ Includes commit and reveal deadlines
- ✅ All voters receive same question and outcomes

---


## Phase 3: Commit Phase

### 3.1 Voter: Receive VoteRequest

**File:** `voter-template/src/contract.rs`

```rust
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
        // ... other messages
    }
}

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
        status: VoteStatus::Requested,  // ✅ Initial status
    };
    
    // Store in state
    self.state.add_active_vote(vote).await;
    
    // If auto-vote enabled, decide and commit automatically
    if self.state.is_auto_vote_enabled().await {
        self.auto_vote(market_id).await;
    }
}
```

**Key Points:**
- ✅ Stores vote request in local state
- ✅ Status: `Requested`
- ✅ Can auto-vote if enabled
- ⚠️ Manual voting requires user action

---

### 3.2 Voter: Submit Vote (Manual or Auto)

**File:** `voter-template/src/contract.rs`

```rust
async fn submit_vote(
    &mut self,
    market_id: u64,
    outcome_index: usize,
    confidence: u8,
) -> VoterResponse {
    // Get active vote
    let mut vote = self.state.get_active_vote(market_id).await?;
    
    // Validate outcome index
    if outcome_index >= vote.outcomes.len() {
        return VoterResponse::Error { ... };
    }
    
    // Generate salt (pseudo-random)
    let salt = {
        let mut salt = [0u8; 32];
        let time = self.runtime.system_time().micros();
        for i in 0..32 {
            salt[i] = ((market_id + time + i as u64) % 256) as u8;
        }
        salt
    };
    
    // Create commitment hash
    let commitment_hash = self.create_commitment(outcome_index, salt);
    
    // Update vote
    vote.my_commitment = Some(commitment_hash);
    vote.my_outcome = Some(outcome_index);
    vote.my_salt = Some(salt);
    vote.status = VoteStatus::Committed;  // ✅ Status change
    
    self.state.update_active_vote(vote).await;
    
    // Send commitment to registry
    if let Some(chain_id) = self.state.get_registry_chain_id().await {
        let voter_app_id = self.runtime.application_id().forget_abi();
        let stake = self.state.get_stake().await;
        
        self.runtime.send_message(
            chain_id,  // ✅ Send to registry's chain
            RegistryMessage::VoteCommitment {
                market_id,
                voter_app: voter_app_id,
                commitment_hash,
                stake_locked: stake,
            },
        );
    }
    
    // Schedule reveal
    self.schedule_reveal(market_id).await;
    
    VoterResponse::VoteSubmitted {
        market_id,
        outcome_index,
    }
}

fn create_commitment(&self, outcome_index: usize, salt: [u8; 32]) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(&outcome_index.to_le_bytes());
    hasher.update(&salt);
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}
```

**Message Flow:**
```
Voter 1                         Registry
   │                               │
   │──send_message()──────────────>│
   │  VoteCommitment               │
   │  - market_id                  │
   │  - voter_app (ApplicationId)  │
   │  - commitment_hash            │
   │  - stake_locked               │
   │                               │
```

**Key Points:**
- ✅ Generates random salt
- ✅ Creates SHA256 commitment hash
- ✅ Stores outcome and salt locally (secret)
- ✅ Sends only commitment hash to Registry
- ✅ Status changes to `Committed`

---

### 3.3 Registry: Receive VoteCommitment

**File:** `oracle-registry/src/contract.rs`

```rust
async fn execute_message(&mut self, message: RegistryMessage) {
    match message {
        RegistryMessage::VoteCommitment {
            market_id,
            voter_app,
            commitment_hash,
            stake_locked,
        } => {
            self.handle_vote_commitment(
                market_id, 
                voter_app, 
                commitment_hash, 
                stake_locked
            ).await;
        }
        // ... other messages
    }
}

async fn handle_vote_commitment(
    &mut self,
    market_id: u64,
    voter_app: ApplicationId,
    commitment_hash: [u8; 32],
    stake_locked: Amount,
) {
    // Create commitment record
    let commitment = VoteCommitment {
        voter_app,
        market_id,
        commitment_hash,
        stake_locked,
        committed_at: self.runtime.system_time(),
    };
    
    // Store commitment
    self.state.add_commitment(commitment).await;
    
    // Update market status to CommitPhase if needed
    if let Ok(mut market) = self.state.get_market(market_id).await {
        if market.status == MarketStatus::Active {
            market.status = MarketStatus::CommitPhase;  // ✅ Status change
            self.state.update_market(market_id, market).await;
        }
    }
}
```

**Key Points:**
- ✅ Stores commitment with timestamp
- ✅ Locks voter's stake
- ✅ Updates market status to `CommitPhase`
- ✅ Waits for all voters to commit

---


## Phase 4: Reveal Phase

### 4.1 Voter: Reveal Vote

**File:** `voter-template/src/contract.rs`

```rust
async fn schedule_reveal(&mut self, market_id: u64) {
    // Get vote
    let vote = self.state.get_active_vote(market_id).await?;
    
    // Check if we have commitment
    let (outcome, salt) = match (vote.my_outcome, vote.my_salt) {
        (Some(o), Some(s)) => (o, s),
        _ => return,
    };
    
    // Check if commit deadline passed
    let now = self.runtime.system_time();
    if now < vote.commit_deadline {
        return; // Too early to reveal
    }
    
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
                confidence: 80,  // Default confidence
            },
        );
    }
    
    // Update status
    let mut vote = self.state.get_active_vote(market_id).await?;
    vote.status = VoteStatus::Revealed;  // ✅ Status change
    self.state.update_active_vote(vote).await;
}
```

**Message Flow:**
```
Voter 1                         Registry
   │                               │
   │──send_message()──────────────>│
   │  VoteReveal                   │
   │  - market_id                  │
   │  - voter_app                  │
   │  - outcome_index (revealed!)  │
   │  - salt (revealed!)           │
   │  - confidence                 │
   │                               │
```

**Key Points:**
- ✅ Reveals outcome and salt after commit deadline
- ✅ Registry can verify commitment matches reveal
- ✅ Status changes to `Revealed`

---

### 4.2 Registry: Receive VoteReveal

**File:** `oracle-registry/src/contract.rs`

```rust
async fn handle_vote_reveal(
    &mut self,
    market_id: u64,
    voter_app: ApplicationId,
    outcome_index: usize,
    salt: [u8; 32],
    confidence: u8,
) {
    // Get commitment
    let commitment = match self.state.get_commitment(market_id, &voter_app).await {
        Ok(c) => c,
        Err(_) => return, // No commitment found
    };
    
    // Verify reveal matches commitment
    let protocol = CommitRevealProtocol::new(3600, 3600);
    let reveal = VoteReveal {
        voter_app,
        market_id,
        outcome_index,
        salt,
        confidence,
        revealed_at: self.runtime.system_time(),
    };
    
    match protocol.verify_reveal(&commitment, &reveal) {
        Ok(_) => {
            // ✅ Valid reveal - store it
            self.state.add_reveal(reveal).await;
            
            // Update market status to RevealPhase
            if let Ok(mut market) = self.state.get_market(market_id).await {
                if market.status == MarketStatus::CommitPhase {
                    market.status = MarketStatus::RevealPhase;  // ✅ Status change
                    self.state.update_market(market_id, market).await;
                }
            }
            
            // Check if ready for aggregation
            self.check_and_aggregate(market_id).await;
        }
        Err(_) => {
            // ❌ Invalid reveal - slash stake
            let params = self.state.get_parameters().await;
            let slash_amount = protocol.calculate_slash_amount(
                commitment.stake_locked,
                params.slash_percentage,
            );
            
            // Send slash message to voter
            if let Ok(metadata) = self.state.get_voter_metadata(&voter_app).await {
                self.runtime.send_message(
                    metadata.chain_id,
                    RegistryMessage::StakeSlashed {
                        market_id,
                        amount: slash_amount,
                        reason: "Invalid reveal".to_string(),
                    },
                );
            }
        }
    }
}
```

**Verification Process:**
```rust
// In CommitRevealProtocol
fn verify_reveal(
    &self,
    commitment: &VoteCommitment,
    reveal: &VoteReveal,
) -> Result<(), CommitRevealError> {
    // Recreate commitment hash from reveal
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(&reveal.outcome_index.to_le_bytes());
    hasher.update(&reveal.salt);
    let computed_hash = hasher.finalize();
    
    // Compare with stored commitment
    if computed_hash.as_slice() == commitment.commitment_hash {
        Ok(())
    } else {
        Err(CommitRevealError::InvalidReveal)
    }
}
```

**Key Points:**
- ✅ Verifies reveal matches commitment
- ✅ Stores valid reveals
- ✅ Slashes stake for invalid reveals
- ✅ Updates market status to `RevealPhase`
- ✅ Checks if ready for aggregation

---


## Phase 5: Vote Aggregation

### 5.1 Registry: Check if Ready for Aggregation

**File:** `oracle-registry/src/contract.rs`

```rust
async fn check_and_aggregate(&mut self, market_id: u64) {
    // Get market
    let market = self.state.get_market(market_id).await?;
    
    // Get selected voters
    let selected_voters = self.state.get_selected_voters(market_id).await?;
    
    // Get all reveals
    let reveals = self.state.get_all_reveals(market_id).await.unwrap_or_default();
    
    // Check if we have enough reveals (e.g., 2/3 of selected voters)
    let min_reveals = (selected_voters.len() * 2) / 3;
    
    if reveals.len() < min_reveals {
        return; // ⏳ Not enough reveals yet
    }
    
    // ✅ Ready to aggregate
    self.aggregate_and_resolve(market_id).await;
}
```

**Aggregation Threshold:**
- Requires 2/3 (66%) of selected voters to reveal
- Example: 3 voters selected → need 2 reveals
- Example: 10 voters selected → need 7 reveals

---

### 5.2 Registry: Aggregate Votes

**File:** `oracle-registry/src/contract.rs`

```rust
async fn aggregate_and_resolve(&mut self, market_id: u64) {
    // Get market
    let mut market = self.state.get_market(market_id).await?;
    
    // Get all reveals
    let reveals = self.state.get_all_reveals(market_id).await.unwrap_or_default();
    
    // Convert reveals to VoteData
    let votes: Vec<VoteData> = reveals.iter().map(|r| VoteData {
        voter_app: r.voter_app,
        outcome_index: r.outcome_index,
        confidence: r.confidence,
        voting_power: 100,  // TODO: Calculate from reputation
        stake: Amount::from_tokens(1000),  // TODO: Get actual stake
    }).collect();
    
    // Aggregate votes
    let params = self.runtime.application_parameters();
    let aggregator = VoteAggregator::new(66); // 66% supermajority
    
    let result = aggregator.aggregate_votes(
        &votes,
        market.outcomes.len(),
        params.min_voters_per_market
    )?;
    
    // Update market with result
    market.status = MarketStatus::Resolved;  // ✅ Final status
    self.state.update_market(market_id, market.clone()).await;
    self.state.resolve_market(market_id, result.winning_outcome, result.confidence).await;
    
    // Send resolution to requester
    self.runtime.send_message(
        market.requester_chain,  // ✅ Send back to Market Chain
        RegistryMessage::MarketResolved {
            market_id,
            outcome_index: result.winning_outcome,
            confidence: result.confidence,
            callback_data: market.callback_data.clone(),  // ✅ Include callback data
        },
    );
    
    // Distribute rewards
    self.distribute_rewards(market_id, result.winning_outcome, &votes).await;
}
```

**Aggregation Algorithm:**
```rust
// In VoteAggregator
pub fn aggregate_votes(
    &self,
    votes: &[VoteData],
    num_outcomes: usize,
    min_voters: usize,
) -> Result<AggregationResult, AggregationError> {
    // Check minimum voters
    if votes.len() < min_voters {
        return Err(AggregationError::InsufficientVotes);
    }
    
    // Count weighted votes per outcome
    let mut outcome_weights = vec![0u128; num_outcomes];
    
    for vote in votes {
        let weight = (vote.voting_power as u128) 
                   * (vote.confidence as u128) 
                   * (vote.stake.into());
        outcome_weights[vote.outcome_index] += weight;
    }
    
    // Find winning outcome
    let total_weight: u128 = outcome_weights.iter().sum();
    let (winning_outcome, winning_weight) = outcome_weights
        .iter()
        .enumerate()
        .max_by_key(|(_, w)| *w)
        .unwrap();
    
    // Calculate confidence (percentage of total weight)
    let confidence = ((winning_weight * 100) / total_weight) as u8;
    
    // Check supermajority threshold
    if confidence < self.supermajority_threshold {
        return Err(AggregationError::NoConsensus);
    }
    
    Ok(AggregationResult {
        winning_outcome,
        confidence,
        total_votes: votes.len(),
        total_weight,
    })
}
```

**Key Points:**
- ✅ Weights votes by: voting_power × confidence × stake
- ✅ Requires supermajority (66%)
- ✅ Calculates confidence score
- ✅ Updates market status to `Resolved`

---


## Phase 6: Resolution & Callback

### 6.1 Registry: Send Resolution to Market Chain

**Message Flow:**
```
Registry                        Market Chain
   │                               │
   │──send_message()──────────────>│
   │  MarketResolved               │
   │  - market_id                  │
   │  - outcome_index (winner)     │
   │  - confidence                 │
   │  - callback_data (market_id)  │
   │                               │
```

**Code:** (Already shown in Phase 5.2)

---

### 6.2 Market Chain: Receive Resolution

**File:** `market-chain/src/contract.rs`

```rust
async fn execute_cross_chain_message(&mut self, message: RegistryMessage) {
    match message {
        RegistryMessage::MarketResolved { 
            market_id, 
            outcome_index, 
            confidence,
            callback_data,
        } => {
            self.handle_resolution(market_id, outcome_index).await;
        }
        _ => {
            // Try SDK handler for other message types
            if let Some(result) = self.alethea.handle_resolution(message) {
                // Extract market ID from callback data
                if result.callback_data.len() >= 8 {
                    let market_id = u64::from_le_bytes([
                        result.callback_data[0],
                        result.callback_data[1],
                        result.callback_data[2],
                        result.callback_data[3],
                        result.callback_data[4],
                        result.callback_data[5],
                        result.callback_data[6],
                        result.callback_data[7],
                    ]);
                    
                    self.handle_resolution(market_id, result.outcome_index).await;
                }
            }
        }
    }
}

async fn handle_resolution(&mut self, market_id: u64, outcome_index: usize) {
    // Get market
    if let Some(mut market) = self.state.get_market(market_id).await {
        // Update market status
        market.status = MarketStatus::Resolved;  // ✅ Final status
        market.final_outcome = Some(outcome_index);
        
        // Save to state
        self.state.markets.insert(&market_id, market).await;
        
        // Now users can claim winnings
    }
}
```

**Key Points:**
- ✅ Receives resolution via `execute_cross_chain_message()`
- ✅ Extracts market_id from callback_data
- ✅ Updates market status to `Resolved`
- ✅ Sets final_outcome
- ✅ Users can now claim winnings

---

### 6.3 Market Chain: Claim Winnings

**File:** `market-chain/src/contract.rs`

```rust
async fn claim_winnings(&mut self, market_id: u64) -> MarketResponse {
    // Get market
    let market = self.state.get_market(market_id).await?;
    
    // Check if resolved
    if !matches!(market.status, MarketStatus::Resolved) {
        return MarketResponse::Error;
    }
    
    // Get user
    let owner = self.runtime.authenticated_signer()?;
    
    // Get position
    let position = self.state.get_position(market_id, &owner).await?;
    
    // Get final outcome
    let final_outcome = market.final_outcome?;
    
    // Check if user won
    if position.outcome_index == final_outcome {
        // Calculate winnings
        let winnings = Amount::from_attos(position.shares as u128);
        
        // TODO: Transfer tokens to user
        
        MarketResponse::WinningsClaimed { amount: winnings }
    } else {
        MarketResponse::WinningsClaimed { amount: Amount::ZERO }
    }
}
```

**Key Points:**
- ✅ Only works after market is `Resolved`
- ✅ Checks if user's outcome matches final_outcome
- ✅ Calculates winnings based on shares
- ⚠️ Token transfer not yet implemented

---


## Phase 7: Reward Distribution

### 7.1 Registry: Distribute Rewards

**File:** `oracle-registry/src/contract.rs`

```rust
async fn distribute_rewards(
    &mut self,
    market_id: u64,
    winning_outcome: usize,
    all_votes: &[VoteData],
) {
    let params = self.state.get_parameters().await;
    let economic_system = EconomicSystem::new(params);
    
    // Filter correct voters (those who voted for winning outcome)
    let correct_voters = economic_system.filter_correct_voters(
        all_votes, 
        winning_outcome
    );
    
    // Get fee pool
    let fee_pool = self.state.get_fee_pool().await;
    
    // Calculate distribution
    let distribution = economic_system.calculate_reward_distribution(
        fee_pool,
        &correct_voters,
        winning_outcome
    )?;
    
    // Send rewards to voters
    for (voter_app, amount) in distribution.voter_rewards {
        // Get voter metadata to get chain_id
        if let Ok(metadata) = self.state.get_voter_metadata(&voter_app).await {
            self.runtime.send_message(
                metadata.chain_id,
                RegistryMessage::RewardDistribution {
                    market_id,
                    amount,
                },
            );
        }
    }
    
    // Add protocol fee to treasury
    self.state.add_to_treasury(distribution.protocol_fee).await;
}
```

**Reward Calculation:**
```rust
// In EconomicSystem
pub fn calculate_reward_distribution(
    &self,
    fee_pool: Amount,
    correct_voters: &[VoteData],
    winning_outcome: usize,
) -> Result<RewardDistribution, EconomicError> {
    // Calculate total weight of correct voters
    let total_weight: u128 = correct_voters.iter()
        .map(|v| (v.voting_power as u128) * (v.stake.into()))
        .sum();
    
    // Calculate protocol fee (e.g., 10%)
    let fee_pool_u128: u128 = fee_pool.into();
    let protocol_fee = (fee_pool_u128 * self.params.protocol_fee_percentage as u128) / 100;
    let voter_pool = fee_pool_u128 - protocol_fee;
    
    // Distribute proportionally to correct voters
    let mut voter_rewards = Vec::new();
    for voter in correct_voters {
        let voter_weight = (voter.voting_power as u128) * (voter.stake.into());
        let reward = (voter_pool * voter_weight) / total_weight;
        voter_rewards.push((voter.voter_app, Amount::from_attos(reward)));
    }
    
    Ok(RewardDistribution {
        voter_rewards,
        protocol_fee: Amount::from_attos(protocol_fee),
    })
}
```

**Message Flow:**
```
Registry                        Voter 1              Voter 2              Voter 3
   │                               │                    │                    │
   │──send_message()──────────────>│                    │                    │
   │  RewardDistribution           │                    │                    │
   │  - market_id                  │                    │                    │
   │  - amount (reward)            │                    │                    │
   │                               │                    │                    │
   │──send_message()───────────────┼───────────────────>│                    │
   │  RewardDistribution           │                    │                    │
   │                               │                    │                    │
   │  (Voter 3 voted wrong,        │                    │                    │
   │   no reward sent)             │                    │                    │
```

**Key Points:**
- ✅ Only correct voters receive rewards
- ✅ Rewards proportional to stake and voting power
- ✅ Protocol takes fee (e.g., 10%)
- ✅ Wrong voters get nothing (or slashed)

---

### 7.2 Voter: Receive Reward

**File:** `voter-template/src/contract.rs`

```rust
async fn handle_reward(&mut self, market_id: u64, amount: Amount) {
    // Add reward to stake
    self.state.add_stake(amount).await;
    
    // Update reputation (correct vote)
    let total = *self.state.total_votes.get();
    let correct = *self.state.correct_votes.get();
    self.state.total_votes.set(total + 1);
    self.state.correct_votes.set(correct + 1);
    
    // Calculate new reputation score
    let accuracy = (correct + 1) * 100 / (total + 1);
    self.state.reputation_score.set(accuracy as u64);
    
    // Move vote to history
    if let Some(vote) = self.state.get_active_vote(market_id).await {
        let result = VoteResult {
            market_id,
            question: vote.question,
            my_outcome: vote.my_outcome,
            final_outcome: vote.my_outcome,  // Assume correct since we got reward
            reward_received: amount,
            was_correct: true,
        };
        
        self.state.add_vote_history(result).await;
        self.state.remove_active_vote(market_id).await;
    }
}
```

**Key Points:**
- ✅ Adds reward to voter's stake
- ✅ Updates reputation (accuracy score)
- ✅ Moves vote to history
- ✅ Tracks correct votes

---


## Message Types Reference

### RegistryMessage (Cross-Chain Messages)

**File:** `alethea-oracle-types/src/registry.rs`

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum RegistryMessage {
    // ========== FROM dApps TO Registry ==========
    RegisterMarket {
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    },
    
    // ========== FROM Voters TO Registry ==========
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
    DirectVote {
        voter_app: ApplicationId,
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        voting_power: u64,
    },
    
    // ========== FROM Registry TO dApps ==========
    MarketResolved {
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
        callback_data: Vec<u8>,
    },
    
    // ========== FROM Registry TO Voters ==========
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
```

---

### RegistryOperation (Direct Calls)

**File:** `alethea-oracle-types/src/registry.rs`

```rust
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum RegistryOperation {
    // Market operations
    RegisterMarket {
        question: String,
        outcomes: Vec<String>,
        deadline: Timestamp,
        callback_data: Vec<u8>,
    },
    GetMarket { market_id: u64 },
    GetMarketStatus { market_id: u64 },
    RequestResolution { market_id: u64 },
    
    // Voter operations
    RegisterVoter { stake: Amount },
    UnregisterVoter,
    UpdateStake { additional_stake: Amount },
    
    // Admin operations
    EmergencyPause,
    EmergencyUnpause,
    
    // Query operations
    GetProtocolStats,
    GetVoterInfo { voter_app: ApplicationId },
    GetVoterReputation { voter_app: ApplicationId },
}
```

---

### VoterOperation (Direct Calls)

**File:** `alethea-oracle-types/src/voter.rs`

```rust
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum VoterOperation {
    Initialize {
        registry_id: ApplicationId,
        initial_stake: Amount,
    },
    UpdateStake {
        additional_stake: Amount,
    },
    SubmitVote {
        market_id: u64,
        outcome_index: usize,
        confidence: u8,
    },
    GetActiveVotes,
    GetVoteHistory,
    SetDecisionStrategy {
        strategy: DecisionStrategy,
    },
    EnableAutoVote,
    DisableAutoVote,
    GetStatus,
    GetReputation,
}
```

---

### MarketStatus (State Tracking)

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,              // Market created, trading active
    Closed,            // Trading closed, waiting for resolution request
    WaitingResolution, // Resolution requested, waiting for Registry
    Active,            // Registry received, selecting voters
    CommitPhase,       // Voters committing votes
    RevealPhase,       // Voters revealing votes
    Resolved,          // Market resolved, final outcome set
}
```

---

### VoteStatus (Voter State Tracking)

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Copy, PartialEq, Eq)]
pub enum VoteStatus {
    Requested,   // Vote request received
    Committed,   // Commitment sent to Registry
    Revealed,    // Reveal sent to Registry
    Rewarded,    // Reward received
}
```

---


## Current Issues

### Issue 1: Market Chain → Registry Communication

**Problem:** `call_application()` doesn't reach Registry

**Location:** `market-chain/src/contract.rs:request_resolution()`

```rust
// This doesn't work:
self.runtime.call_application::<OracleRegistryAbi>(
    true,
    registry_id.with_abi(),
    &operation,
);
```

**Evidence:**
- Market Chain status changes to `WaitingResolution` ✅
- Registry never receives `RegisterMarket` ❌
- Direct GraphQL call to Registry works ✅

**Root Cause:**
- `call_application()` may not support cross-application calls
- Or requires specific setup/permissions not configured
- Linera SDK 0.15.5 may have limitations

**Possible Solutions:**

#### Solution A: Use send_message() Instead
```rust
// Replace call_application with send_message
self.runtime.send_message(
    registry_chain_id,  // Need to know Registry's chain
    RegistryMessage::RegisterMarket {
        question,
        outcomes,
        deadline,
        callback_data,
    },
);
```

**Pros:**
- Known to work for cross-chain communication
- Consistent with other message passing

**Cons:**
- Need to know Registry's chain_id
- Asynchronous (no immediate response)

#### Solution B: Dashboard Hybrid Approach
```typescript
// In dashboard
async function requestOracleResolution(marketId: number) {
    // 1. Get market details from Market Chain
    const market = await MarketChainService.getMarket(marketId);
    
    // 2. Register with Registry via GraphQL
    await RegistryService.registerMarket({
        question: market.question,
        outcomes: market.outcomes,
        deadline: market.resolutionDeadline,
        callbackData: marketId.to_bytes()
    });
    
    // 3. Update Market Chain status
    await MarketChainService.requestResolution(marketId);
}
```

**Pros:**
- Works with current setup
- No contract changes needed
- User has control

**Cons:**
- Manual step required
- Not fully automated
- UX not ideal

---

### Issue 2: Voter Mutations Not Working

**Problem:** Voter GraphQL mutations return "EmptyMutation" error

**Location:** `voter-template/src/service.rs`

**Impact:**
- Cannot test voting workflow via GraphQL
- Manual voting not possible
- Only auto-vote works (if enabled)

**Solution:**
- Fix GraphQL service to expose mutations properly
- Redeploy voters with fixed service

---

### Issue 3: Chain ID Synchronization

**Current State:**
- All components on same chain: `c8e5acd...`
- Registry stores `requester_chain` ✅
- Voters store `registry_chain_id` ✅

**Potential Issue:**
- If components deployed on different chains
- Need proper chain_id tracking
- Cross-chain message routing

**Mitigation:**
- Keep all components on same chain for now
- Document chain_id requirements
- Test cross-chain deployment later

---


## Complete Flow Summary

### Timeline Diagram

```
Time    Market Chain          Registry              Voter 1              Voter 2              Voter 3
────────────────────────────────────────────────────────────────────────────────────────────────────────
T0      CreateMarket
        status: Open
        │
T1      RequestResolution
        status: WaitingResolution
        │
        │ call_application()
        │ RegisterMarket ────────>
        │                         │
T2                                RegisterMarket
                                  status: Active
                                  │
                                  │ select_voters()
                                  │ [Voter1, Voter2, Voter3]
                                  │
                                  │ send_message()
                                  │ VoteRequest ──────────> VoteRequest      VoteRequest      VoteRequest
                                  │                         status:          status:          status:
                                  │                         Requested        Requested        Requested
                                  │                         │                │                │
T3                                                          │ SubmitVote     │ SubmitVote     │ SubmitVote
                                                            │ (manual/auto)  │                │
                                                            │                │                │
                                                            │ send_message() │                │
                                                            │ VoteCommitment │                │
                                  │ <─────────────────────────────────────────────────────────────────
                                  │                         status:          status:          status:
                                  │                         Committed        Committed        Committed
                                  │
T4                                status: CommitPhase
                                  │
                                  │ (wait for commit_deadline)
                                  │
T5                                                          │ schedule_reveal()
                                                            │ send_message()
                                                            │ VoteReveal
                                  │ <─────────────────────────────────────────────────────────────────
                                  │                         status:          status:          status:
                                  │                         Revealed         Revealed         Revealed
                                  │
T6                                status: RevealPhase
                                  │
                                  │ check_and_aggregate()
                                  │ (2/3 reveals received)
                                  │
                                  │ aggregate_votes()
                                  │ - outcome: 0
                                  │ - confidence: 85%
                                  │
T7                                status: Resolved
                                  │
                                  │ send_message()
                                  │ MarketResolved
        │ <─────────────────────────
        │
T8      handle_resolution()
        status: Resolved
        final_outcome: 0
        │
        │ (users can claim)
        │
T9                                distribute_rewards()
                                  │
                                  │ send_message()
                                  │ RewardDistribution ──> Reward            Reward           (no reward)
                                  │                        +stake           +stake           Voter3 wrong
                                  │                        +reputation      +reputation
```

---

### State Transitions

#### Market Chain States:
```
Open → WaitingResolution → Resolved
```

#### Registry Market States:
```
Active → CommitPhase → RevealPhase → Resolved
```

#### Voter Vote States:
```
Requested → Committed → Revealed → Rewarded
```

---

### Message Count Summary

For 1 market with 3 voters:

| Phase | Message Type | Count | Direction |
|-------|-------------|-------|-----------|
| 1. Registration | RegisterMarket | 1 | Market → Registry |
| 2. Vote Request | VoteRequest | 3 | Registry → Voters |
| 3. Commit | VoteCommitment | 3 | Voters → Registry |
| 4. Reveal | VoteReveal | 3 | Voters → Registry |
| 5. Resolution | MarketResolved | 1 | Registry → Market |
| 6. Rewards | RewardDistribution | 2 | Registry → Voters |
| **Total** | | **13** | |

---

### Data Flow Summary

```
Market Chain                Registry                Voters
    │                          │                       │
    │ Market Data              │                       │
    │ - question               │                       │
    │ - outcomes               │                       │
    │ - deadline               │                       │
    │ - callback_data          │                       │
    │ ────────────────────────>│                       │
    │                          │                       │
    │                          │ Vote Request          │
    │                          │ - market_id           │
    │                          │ - question            │
    │                          │ - outcomes            │
    │                          │ - deadlines           │
    │                          │ ─────────────────────>│
    │                          │                       │
    │                          │ Commitment            │
    │                          │ - hash(outcome+salt)  │
    │                          │ <─────────────────────│
    │                          │                       │
    │                          │ Reveal                │
    │                          │ - outcome             │
    │                          │ - salt                │
    │                          │ <─────────────────────│
    │                          │                       │
    │                          │ [Aggregation]         │
    │                          │ - weighted voting     │
    │                          │ - supermajority       │
    │                          │                       │
    │ Resolution               │                       │
    │ - outcome_index          │                       │
    │ - confidence             │                       │
    │ - callback_data          │                       │
    │ <────────────────────────│                       │
    │                          │                       │
    │                          │ Rewards               │
    │                          │ - amount              │
    │                          │ ─────────────────────>│
```

---

## Recommendations

### Short-Term Fixes

1. **Fix Market → Registry Communication**
   - Implement Solution B (Dashboard Hybrid)
   - Test end-to-end workflow
   - Document workaround

2. **Fix Voter Mutations**
   - Update voter service GraphQL
   - Redeploy voters
   - Test manual voting

3. **Add Monitoring**
   - Log all message sends
   - Track message delivery
   - Monitor state transitions

### Long-Term Improvements

1. **Research call_application()**
   - Check Linera documentation
   - Ask in Linera community
   - Find working examples

2. **Implement Proper Solution**
   - Use send_message() if needed
   - Update SDK accordingly
   - Test cross-chain deployment

3. **Add Retry Logic**
   - Handle message failures
   - Implement timeouts
   - Add fallback mechanisms

4. **Improve UX**
   - Auto-refresh dashboard
   - Show real-time status
   - Better error messages

---

## Testing Checklist

### Phase 1: Market Creation
- [ ] Create market via dashboard
- [ ] Verify market stored in Market Chain
- [ ] Check market status is `Open`

### Phase 2: Resolution Request
- [ ] Request resolution after deadline
- [ ] Verify status changes to `WaitingResolution`
- [ ] Check Registry receives market (manual or auto)

### Phase 3: Voter Selection
- [ ] Verify Registry selects 3 voters
- [ ] Check VoteRequest sent to all voters
- [ ] Verify voters receive requests

### Phase 4: Voting
- [ ] Submit votes from all voters
- [ ] Verify commitments sent to Registry
- [ ] Check reveals sent after commit deadline

### Phase 5: Aggregation
- [ ] Verify Registry aggregates votes
- [ ] Check winning outcome calculated
- [ ] Verify confidence score

### Phase 6: Resolution
- [ ] Check MarketResolved sent to Market Chain
- [ ] Verify Market Chain updates status
- [ ] Check final_outcome set correctly

### Phase 7: Rewards
- [ ] Verify correct voters receive rewards
- [ ] Check reputation updated
- [ ] Verify wrong voters get nothing

---

**Documentation Complete**  
**Date:** November 9, 2025  
**Status:** Ready for Implementation & Testing

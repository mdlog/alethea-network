# Cross-Chain Oracle Usage Examples

## Example 1: User Registers as Voter from Their Own Chain

### Step 1: User calls operation on their chain

```rust
// On User Chain (e.g., Alice's chain)
use linera_sdk::linera_base_types::Amount;

// Alice wants to register as a voter
let operation = Operation::RegisterVoter {
    stake: Amount::from_tokens(1000),
    name: Some("Alice".to_string()),
    metadata_url: Some("https://alice.example.com/profile".to_string()),
};

// Execute operation - this automatically uses chain_id as identifier
runtime.call_application(
    registry_app_id,
    &operation
);
```

### Step 2: Registry processes registration

```rust
// On Registry Chain
async fn execute_operation(&mut self, operation: Operation) -> OperationResponse {
    match operation {
        Operation::RegisterVoter { stake, name, metadata_url } => {
            // ✅ Uses runtime.chain_id() automatically!
            let voter_chain = self.runtime.chain_id();
            
            // Validate and register
            self.register_voter_chainid(stake, name, metadata_url).await
        }
    }
}
```

### Step 3: Event emitted to subscribers

```rust
// Registry emits event
self.emit_oracle_event(OracleEvent::VoterRegistered {
    voter_chain: alice_chain_id,
    stake: Amount::from_tokens(1000),
    name: Some("Alice".to_string()),
    registered_at: current_time,
});
```

---

## Example 2: Cross-Chain Voting (Commit-Reveal)

### Step 1: User commits vote

```rust
// On User Chain (Alice)
use sha2::{Sha256, Digest};

// Create commit hash
let value = "Yes";
let salt = "random_salt_12345";
let mut hasher = Sha256::new();
hasher.update(value.as_bytes());
hasher.update(salt.as_bytes());
let commit_hash = format!("{:x}", hasher.finalize());

// Send commit message to Registry
let message = Message::CommitVote {
    query_id: 1,
    commit_hash,
};

runtime.prepare_message(message)
    .with_tracking()
    .send_to(registry_chain_id);
```

### Step 2: Registry stores commit

```rust
// On Registry Chain
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::CommitVote { query_id, commit_hash } => {
            let voter_chain = self.get_sender_chain();
            
            // Store commit
            self.commit_vote(query_id, commit_hash).await;
            
            // Emit event
            self.emit_oracle_event(OracleEvent::VoteSubmitted {
                query_id,
                voter_chain,
                timestamp: self.runtime.system_time(),
                is_commit: true,
            });
        }
    }
}
```

### Step 3: User reveals vote

```rust
// On User Chain (after commit phase ends)
let message = Message::RevealVote {
    query_id: 1,
    value: "Yes".to_string(),
    salt: "random_salt_12345".to_string(),
    confidence: Some(90),
};

runtime.prepare_message(message)
    .with_tracking()
    .send_to(registry_chain_id);
```

### Step 4: Registry validates and stores vote

```rust
// On Registry Chain
Message::RevealVote { query_id, value, salt, confidence } => {
    let voter_chain = self.get_sender_chain();
    
    // Validate commit matches reveal
    self.reveal_vote(query_id, value, salt, confidence).await;
    
    // Check if query can be resolved
    if self.can_resolve_query(query_id).await {
        self.resolve_query(query_id).await;
    }
}
```

---

## Example 3: Market Requests Oracle Resolution

### Step 1: Market expires and needs resolution

```rust
// On Market Chain
pub struct SimpleMarket {
    market_id: u64,
    question: String,
    end_time: Timestamp,
    registry_chain: ChainId,
    // ...
}

impl SimpleMarket {
    async fn check_expiration(&mut self) {
        let current_time = self.runtime.system_time();
        
        if current_time >= self.end_time && !self.resolution_requested {
            // Request oracle resolution
            let message = Message::CreateQueryFromMarket {
                market_id: self.market_id,
                question: self.question.clone(),
                outcomes: vec!["Yes".to_string(), "No".to_string()],
                deadline: Timestamp::from(current_time.micros() + 86400_000_000), // 24h
                callback_chain: self.runtime.chain_id(),
                callback_data: self.market_id.to_le_bytes().to_vec(),
            };
            
            self.runtime
                .prepare_message(message)
                .with_tracking()
                .send_to(self.registry_chain);
            
            self.resolution_requested = true;
        }
    }
}
```

### Step 2: Registry creates query

```rust
// On Registry Chain
Message::CreateQueryFromMarket {
    market_id,
    question,
    outcomes,
    deadline,
    callback_chain,
    callback_data,
} => {
    // Create query
    let query_id = self.create_query_internal(
        question.clone(),
        outcomes.clone(),
        DecisionStrategy::Majority,
        None,
        Amount::ZERO,
        Some(deadline),
        None,
    ).await;
    
    // Store callback info
    self.state.query_callbacks.insert(
        &query_id,
        QueryCallback {
            callback_chain,
            callback_app: None,
            callback_data: callback_data.clone(),
        }
    );
    
    // Emit event
    self.emit_oracle_event(OracleEvent::QueryCreated {
        query_id,
        description: question,
        outcomes,
        deadline,
        creator: callback_chain,
    });
}
```

### Step 3: Voters vote on query

```rust
// Multiple voters submit votes (see Example 2)
// ...
```

### Step 4: Query is resolved

```rust
// On Registry Chain (when enough votes)
async fn resolve_query(&mut self, query_id: u64) {
    // ... resolution logic ...
    
    // Send callback to market
    self.send_resolution_callback(query_id).await;
}

async fn send_resolution_callback(&mut self, query_id: u64) {
    let callback = self.state.query_callbacks.get(&query_id).await.unwrap();
    let query = self.state.get_query(query_id).await.unwrap();
    
    let message = Message::QueryResolutionCallback {
        query_id,
        resolved_outcome: query.resolved_outcome.unwrap(),
        resolved_at: query.resolved_at.unwrap(),
        callback_data: callback.callback_data.clone(),
    };
    
    self.send_message(callback.callback_chain, message);
}
```

### Step 5: Market receives resolution

```rust
// On Market Chain
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback {
            query_id,
            resolved_outcome,
            resolved_at,
            callback_data,
        } => {
            // Extract market_id from callback_data
            let market_id = u64::from_le_bytes(
                callback_data.try_into().expect("Invalid callback data")
            );
            
            // Update market with resolution
            if let Some(market) = self.markets.get_mut(&market_id) {
                market.winning_outcome = Some(resolved_outcome.clone());
                market.resolved_at = Some(resolved_at);
                market.status = MarketStatus::Resolved;
                
                // Distribute winnings
                self.distribute_winnings(market_id, &resolved_outcome).await;
            }
        }
    }
}
```

---

## Example 4: Subscribe to Oracle Events

### Step 1: User chain subscribes

```rust
// On User Chain
pub struct OracleSubscriber {
    registry_chain: ChainId,
    registry_app: ApplicationId,
}

impl OracleSubscriber {
    pub fn subscribe(&mut self) {
        let app_id = self.registry_app.forget_abi();
        self.runtime.subscribe_to_events(
            self.registry_chain,
            app_id,
            ORACLE_STREAM_NAME.into()
        );
    }
}
```

### Step 2: Receive events

```rust
// On User Chain
async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
    for update in updates {
        assert_eq!(update.stream_id.stream_name, ORACLE_STREAM_NAME.into());
        
        for index in update.new_indices() {
            let event = self.runtime.read_event(
                update.chain_id,
                ORACLE_STREAM_NAME.into(),
                index
            );
            
            match event {
                OracleEvent::QueryCreated { query_id, description, outcomes, deadline, creator } => {
                    println!("📢 New query created: {} (ID: {})", description, query_id);
                    println!("   Outcomes: {:?}", outcomes);
                    println!("   Deadline: {:?}", deadline);
                    
                    // Update local UI or state
                    self.available_queries.push(query_id);
                }
                
                OracleEvent::QueryResolved { query_id, outcome, resolved_at, total_votes } => {
                    println!("✅ Query {} resolved: {}", query_id, outcome);
                    println!("   Total votes: {}", total_votes);
                    
                    // Update local state
                    self.resolved_queries.insert(query_id, outcome);
                }
                
                OracleEvent::VoteSubmitted { query_id, voter_chain, timestamp, is_commit } => {
                    if is_commit {
                        println!("🔒 Vote committed on query {}", query_id);
                    } else {
                        println!("🗳️  Vote revealed on query {}", query_id);
                    }
                }
                
                _ => {}
            }
        }
    }
}
```

---

## Example 5: Claim Rewards

### Step 1: User checks pending rewards

```rust
// On User Chain - Query via GraphQL
query {
  myVoterInfo(address: "e833a6ebd9f5f7301345269054dea5ebc8ed83af50cd3da0f152bccdb43deee9") {
    address
    stake
    reputation
    totalVotes
    correctVotes
    pendingRewards
  }
}
```

### Step 2: User claims rewards

```rust
// On User Chain
let message = Message::ClaimRewards;

runtime.prepare_message(message)
    .with_tracking()
    .send_to(registry_chain_id);
```

### Step 3: Registry processes claim

```rust
// On Registry Chain
Message::ClaimRewards => {
    let voter_chain = self.get_sender_chain();
    
    let pending = self.state.get_pending_rewards(&voter_chain).await;
    
    if pending > Amount::ZERO {
        // Transfer rewards
        // (In production, implement actual token transfer)
        
        // Clear pending rewards
        self.state.pending_rewards.insert(&voter_chain, Amount::ZERO);
        
        // Emit event
        self.emit_oracle_event(OracleEvent::RewardsClaimed {
            voter_chain,
            amount: pending,
            timestamp: self.runtime.system_time(),
        });
    }
}
```

---

## Testing Cross-Chain Flows

### Integration Test Example

```rust
#[tokio::test]
async fn test_cross_chain_voting_flow() {
    // Setup chains
    let registry_chain = setup_registry_chain().await;
    let alice_chain = setup_user_chain("Alice").await;
    let bob_chain = setup_user_chain("Bob").await;
    
    // 1. Register voters
    alice_chain.register_voter(Amount::from_tokens(1000)).await;
    bob_chain.register_voter(Amount::from_tokens(1500)).await;
    
    // 2. Create query
    let query_id = registry_chain.create_query(
        "Will BTC reach $100k?",
        vec!["Yes", "No"],
        DecisionStrategy::Majority,
    ).await;
    
    // 3. Voters commit
    alice_chain.commit_vote(query_id, "Yes", "salt1").await;
    bob_chain.commit_vote(query_id, "No", "salt2").await;
    
    // 4. Wait for commit phase to end
    advance_time(COMMIT_PHASE_DURATION).await;
    
    // 5. Voters reveal
    alice_chain.reveal_vote(query_id, "Yes", "salt1").await;
    bob_chain.reveal_vote(query_id, "No", "salt2").await;
    
    // 6. Resolve query
    let result = registry_chain.resolve_query(query_id).await;
    
    // 7. Verify result
    assert_eq!(result, "Yes"); // Bob has more stake, so "No" wins
    
    // 8. Check rewards
    let bob_rewards = bob_chain.get_pending_rewards().await;
    assert!(bob_rewards > Amount::ZERO);
}
```

---

## Best Practices

1. **Always use `.with_tracking()`** for important messages
2. **Validate all inputs** before processing cross-chain messages
3. **Emit events** for transparency and real-time updates
4. **Handle errors gracefully** - don't panic in message handlers
5. **Use chain_id** for authentication, not manual address parsing
6. **Subscribe to events** for real-time UI updates
7. **Test cross-chain flows** thoroughly before deployment
8. **Monitor message delivery** in production
9. **Implement retry logic** for failed operations
10. **Document callback data format** for market integration

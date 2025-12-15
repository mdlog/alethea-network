# Cross-Chain Messaging Quick Reference

## 🚀 Quick Start

### Send a Message
```rust
self.runtime
    .prepare_message(message)
    .with_tracking()  // ← Always use this!
    .send_to(destination_chain_id);
```

### Emit an Event
```rust
self.runtime.emit_event(
    ORACLE_STREAM_NAME.into(),
    event
);
```

### Get Sender Chain
```rust
let sender = self.runtime.chain_id();  // In operations
let sender = self.get_sender_chain();  // In messages
```

## 📨 Message Types

### Voter Operations
```rust
Message::RegisterVoter { stake, name, metadata_url }
Message::UpdateStake { additional_stake }
Message::WithdrawStake { amount }
Message::DeregisterVoter
```

### Voting Operations
```rust
Message::SubmitVote { query_id, value, confidence }
Message::CommitVote { query_id, commit_hash }
Message::RevealVote { query_id, value, salt, confidence }
Message::ClaimRewards
```

### Market Integration
```rust
Message::CreateQueryFromMarket {
    market_id,
    question,
    outcomes,
    deadline,
    callback_chain,
    callback_data,
}

Message::QueryResolutionCallback {
    query_id,
    resolved_outcome,
    resolved_at,
    callback_data,
}
```

## 📡 Event Types

```rust
OracleEvent::QueryCreated { query_id, description, outcomes, deadline, creator }
OracleEvent::QueryResolved { query_id, outcome, resolved_at, total_votes }
OracleEvent::VoterRegistered { voter_chain, stake, name, registered_at }
OracleEvent::VoteSubmitted { query_id, voter_chain, timestamp, is_commit }
OracleEvent::RewardsClaimed { voter_chain, amount, timestamp }
OracleEvent::ParametersUpdated { updated_by, timestamp }
```

## 🔧 Common Patterns

### Pattern 1: Send Message from User Chain
```rust
// On User Chain
let message = Message::CommitVote {
    query_id: 1,
    commit_hash: "abc123".to_string(),
};

runtime.prepare_message(message)
    .with_tracking()
    .send_to(registry_chain_id);
```

### Pattern 2: Handle Message on Registry
```rust
// On Registry Chain
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::CommitVote { query_id, commit_hash } => {
            let voter_chain = self.get_sender_chain();
            self.commit_vote(query_id, commit_hash).await;
        }
    }
}
```

### Pattern 3: Subscribe to Events
```rust
// On User Chain
runtime.subscribe_to_events(
    registry_chain_id,
    registry_app_id.forget_abi(),
    ORACLE_STREAM_NAME.into()
);
```

### Pattern 4: Process Events
```rust
// On User Chain
async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
    for update in updates {
        for index in update.new_indices() {
            let event = runtime.read_event(
                update.chain_id,
                ORACLE_STREAM_NAME.into(),
                index
            );
            
            match event {
                OracleEvent::QueryCreated { query_id, .. } => {
                    // Handle new query
                }
                _ => {}
            }
        }
    }
}
```

### Pattern 5: Market Requests Resolution
```rust
// On Market Chain
let message = Message::CreateQueryFromMarket {
    market_id: self.market_id,
    question: self.question.clone(),
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    deadline: self.end_time,
    callback_chain: self.runtime.chain_id(),
    callback_data: self.market_id.to_le_bytes().to_vec(),
};

runtime.prepare_message(message)
    .with_tracking()
    .send_to(registry_chain_id);
```

### Pattern 6: Market Receives Resolution
```rust
// On Market Chain
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback {
            query_id,
            resolved_outcome,
            callback_data,
            ..
        } => {
            let market_id = u64::from_le_bytes(
                callback_data.try_into().unwrap()
            );
            
            self.resolve_market(market_id, resolved_outcome).await;
        }
    }
}
```

## ⚡ Helper Functions

### In Contract
```rust
// Send message with tracking
fn send_message(&mut self, destination: ChainId, message: Message) {
    self.runtime
        .prepare_message(message)
        .with_tracking()
        .send_to(destination);
}

// Emit event
fn emit_oracle_event(&mut self, event: OracleEvent) {
    self.runtime.emit_event(ORACLE_STREAM_NAME.into(), event);
}

// Get sender
fn get_sender_chain(&self) -> ChainId {
    self.runtime.message_origin_chain_id().expect("No sender")
}
```

## 🎯 Best Practices

### ✅ DO
- Use `.with_tracking()` for all important messages
- Validate all inputs before processing
- Emit events for transparency
- Use `runtime.chain_id()` for authentication
- Handle errors gracefully
- Log important operations

### ❌ DON'T
- Don't parse addresses manually
- Don't forget `.with_tracking()`
- Don't panic in message handlers
- Don't skip input validation
- Don't forget to emit events
- Don't hardcode chain IDs

## 🔍 Debugging

### Check Message Delivery
```bash
# View chain logs
linera service --port 8080

# Check message queue
linera query-application <CHAIN_ID>:<APP_ID>
```

### Check Events
```bash
# Subscribe to events
linera subscribe <CHAIN_ID> <APP_ID> <STREAM_NAME>
```

### Check State
```bash
# Query GraphQL
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address stake } }"}'
```

## 📚 Code Locations

- **Message Types**: `src/lib.rs` (line ~100)
- **Event Types**: `src/lib.rs` (line ~150)
- **Message Handlers**: `src/contract.rs` (`execute_message`)
- **Cross-Chain Helpers**: `src/contract.rs` (end of file)
- **Event Streaming**: `src/contract.rs` (end of file)

## 🆘 Common Issues

### "Message origin chain ID not found"
→ Message not sent with proper authentication
→ Use `runtime.prepare_message()` not direct send

### "Event not received"
→ Check subscription is active
→ Verify stream name matches `ORACLE_STREAM_NAME`

### "Callback not working"
→ Verify callback info is stored in `query_callbacks`
→ Check callback chain ID is correct

## 📖 Full Documentation

- Architecture: `CROSS_CHAIN_IMPLEMENTATION.md`
- Examples: `USAGE_EXAMPLES.md`
- Summary: `CROSS_CHAIN_SUMMARY.md`
- This Guide: `QUICK_REFERENCE.md`

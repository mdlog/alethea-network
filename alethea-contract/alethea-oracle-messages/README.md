# Alethea Oracle Messages

Shared message types for cross-chain communication between Oracle Registry and consumer applications.

## Overview

This library provides industry-standard message types that enable:
- **Prediction Markets** to request oracle resolution
- **Insurance Protocols** to get claim verification
- **Gaming DApps** to resolve outcomes
- **Any DApp** to use decentralized oracle services

## Industry Standard Compliance

| Standard | Feature | Alethea Equivalent |
|----------|---------|-------------------|
| **UMA Optimistic Oracle** | `bond` | `bond_amount` |
| **UMA Optimistic Oracle** | `reward` | `priority_fee` |
| **UMA Optimistic Oracle** | `liveness` | `dispute_window_secs` |
| **Reality.eth** | Question types | `QuestionType` enum |
| **Reality.eth** | `minBond` | `bond_amount` |
| **Reality.eth** | `timeout` | `dispute_window_secs` |
| **Kleros ERC-792** | `choices` | `outcomes` |

## Message Types

### OracleRequest (Consumer → Registry)

#### CreateQuery (Legacy)
Basic query creation for backward compatibility.

```rust
OracleRequest::CreateQuery {
    request_id: u64,
    description: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    callback_chain: ChainId,
    callback_app: ApplicationId,
    callback_data: Vec<u8>,
}
```

#### CreateQueryWithBond (Recommended)
Industry-standard format with bond, fees, and metadata.

```rust
OracleRequest::CreateQueryWithBond {
    // Required
    request_id: u64,
    description: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    callback_chain: ChainId,
    callback_app: ApplicationId,
    callback_data: Vec<u8>,
    
    // Economic (Industry Standard)
    bond_amount: Amount,              // Refundable if no dispute
    priority_fee: Option<Amount>,     // Non-refundable, adds to rewards
    dispute_window_secs: Option<u64>, // Time to dispute after resolution
    
    // Strategy
    strategy: Option<DecisionStrategy>,
    min_votes: Option<u32>,
    
    // Metadata (Best Practice)
    question_type: Option<QuestionType>,
    resolution_criteria: Option<String>,
    source_urls: Option<String>,
    category: Option<String>,
    metadata_url: Option<String>,
}
```

#### RaiseDispute
Challenge a resolved query result.

```rust
OracleRequest::RaiseDispute {
    query_id: u64,
    disputed_outcome: String,
    dispute_bond: Amount,        // Must equal or exceed original bond
    reason: String,
    evidence_urls: Option<String>,
    callback_chain: ChainId,
    callback_app: ApplicationId,
}
```

#### CancelQuery
Cancel a pending query (only if no votes yet).

```rust
OracleRequest::CancelQuery {
    query_id: u64,
    callback_chain: ChainId,
    callback_app: ApplicationId,
}
```

### OracleCallback (Registry → Consumer)

#### QueryCreated
Confirmation that query was created.

```rust
OracleCallback::QueryCreated {
    query_id: u64,
    request_id: u64,
    callback_data: Vec<u8>,
    estimated_resolution: Option<Timestamp>,
    dispute_window_end: Option<Timestamp>,
}
```

#### QueryResolved
Query voting completed (may still be disputed).

```rust
OracleCallback::QueryResolved {
    query_id: u64,
    result: String,
    result_index: Option<u32>,
    resolved_at: Timestamp,
    callback_data: Vec<u8>,
    vote_count: u32,
    confidence: u8,
    dispute_window_end: Option<Timestamp>,
    is_final: bool,                    // IMPORTANT: Check this!
    total_voting_weight: Option<u128>,
}
```

> **Important**: Only act on the result if `is_final == true`. Otherwise, wait for `QueryFinalized`.

#### QueryFinalized
Result is final - safe for settlement!

```rust
OracleCallback::QueryFinalized {
    query_id: u64,
    result: String,
    result_index: Option<u32>,
    finalized_at: Timestamp,
    callback_data: Vec<u8>,
    bond_refunded: Option<Amount>,
}
```

#### QueryDisputed
Result is being challenged.

```rust
OracleCallback::QueryDisputed {
    query_id: u64,
    original_result: String,
    disputed_by: ChainId,
    disputed_outcome: String,
    dispute_reason: String,
    callback_data: Vec<u8>,
    new_deadline: Option<Timestamp>,
}
```

#### DisputeResolved
Final result after dispute resolution.

```rust
OracleCallback::DisputeResolved {
    query_id: u64,
    final_result: String,
    disputer_won: bool,
    winner_payout: Amount,
    callback_data: Vec<u8>,
}
```

#### QueryExpired
Query expired without enough votes.

```rust
OracleCallback::QueryExpired {
    query_id: u64,
    callback_data: Vec<u8>,
    votes_received: u32,
    votes_required: u32,
    bond_refunded: Option<Amount>,
}
```

#### QueryCancelled
Query was cancelled.

```rust
OracleCallback::QueryCancelled {
    query_id: u64,
    callback_data: Vec<u8>,
    reason: String,
    bond_refunded: Option<Amount>,
}
```

## Question Types

```rust
pub enum QuestionType {
    Boolean,                    // Yes/No
    SingleSelect,               // Pick one from outcomes
    MultipleSelect,             // Pick multiple (bit-encoded)
    Numeric { decimals: u8 },   // Number with decimal places
    Datetime,                   // Unix timestamp
}
```

## Decision Strategies

```rust
pub enum DecisionStrategy {
    Majority,              // Most votes wins
    Median,                // Median value (for Numeric)
    WeightedByStake,       // Votes weighted by stake (default)
    WeightedByReputation,  // Votes weighted by reputation
}
```

## Best Practices

### For Consumer Apps

```rust
// Handle resolution callbacks properly
match callback {
    OracleCallback::QueryResolved { is_final, result, .. } => {
        if is_final {
            // Safe to act on result
            self.settle(result).await;
        } else {
            // Wait for QueryFinalized
            self.mark_pending(result).await;
        }
    }
    OracleCallback::QueryFinalized { result, .. } => {
        // Definitely safe - dispute window passed
        self.settle(result).await;
    }
    OracleCallback::QueryDisputed { .. } => {
        // Don't settle - wait for DisputeResolved
    }
    OracleCallback::DisputeResolved { final_result, .. } => {
        // Final after dispute
        self.settle(final_result).await;
    }
    // ... handle other callbacks
}
```

### Resolution Flow

```
Query Created
     │
     ▼
  Voting
     │
     ▼
QueryResolved (is_final=false)
     │
     ├─── No Dispute ───────────────────┐
     │                                   ▼
     │                          QueryFinalized
     │                          (Safe to settle!)
     │
     └─── Dispute Raised ───────────────┐
                                        ▼
                                  QueryDisputed
                                        │
                                        ▼
                                  Re-voting
                                        │
                                        ▼
                                DisputeResolved
                                (Final result)
```

## Usage

Add to your `Cargo.toml`:

```toml
[dependencies]
alethea-oracle-messages = { path = "../alethea-oracle-messages" }
```

Then in your contract:

```rust
use alethea_oracle_messages::{OracleRequest, OracleCallback, QuestionType, DecisionStrategy};

// Create request
let request = OracleRequest::CreateQueryWithBond {
    request_id: 1,
    description: "Will BTC reach $100k?".to_string(),
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    // ... other fields
};

// Include in your Message enum
pub enum Message {
    OracleRequest(OracleRequest),
    OracleCallback(OracleCallback),
    // ... your other messages
}
```

## License

MIT License

# Alethea Consumer SDK

Rust SDK for integrating consumer applications with Alethea Oracle Network.

## Overview

This SDK provides standardized types and traits for applications that want to use Alethea Oracle as their resolution layer.

## Production Status (Jan 7, 2026)

| Component | Value |
|-----------|-------|
| Oracle Registry | `b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c` |
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| Endpoint | `https://alethea.network` |
| Voters | 4 registered |
| Queries | 10 created, 1 resolved |

## Verified Integration

Simple Market DApp successfully integrated with Alethea Oracle:
- ✅ Market created and linked to Oracle Query
- ✅ RequestResolution creates query in Oracle
- ✅ Market receives QueryCreated callback
- ✅ Market status updates to "Voting"

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
alethea-consumer-sdk = { path = "../alethea-consumer-sdk" }
alethea-oracle-messages = { path = "../alethea-oracle-messages" }
```

## Quick Start

### 1. Define Message Type

```rust
use alethea_oracle_messages::OracleCallback;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    OracleRequest(OracleRequest),
    OracleCallback(OracleCallback),
}
```

### 2. Handle Callbacks

```rust
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::OracleCallback(callback) => {
            match callback {
                OracleCallback::QueryCreated { query_id, callback_data, .. } => {
                    let market_id = decode_request_id(&callback_data).unwrap();
                    self.link_query_to_market(market_id, query_id).await;
                }
                OracleCallback::QueryResolved { query_id, result, callback_data, .. } => {
                    let market_id = decode_request_id(&callback_data).unwrap();
                    self.resolve_market(market_id, result).await;
                }
                // Handle other callbacks...
            }
        }
    }
}
```

### 3. Request Resolution

```rust
async fn request_resolution(&mut self, market_id: u64) {
    let callback_data = encode_request_id(market_id);
    
    let operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
        description: market.question.clone(),
        outcomes: vec!["Yes".to_string(), "No".to_string()],
        strategy: DecisionStrategy::Majority,
        min_votes: None,
        reward_amount: Amount::from_tokens(1),
        deadline: Some(market.end_time),
        callback_chain: self.runtime.chain_id(),
        callback_app: self.runtime.application_id().forget_abi(),
        callback_data,
    };
    
    self.runtime.call_application(true, registry_app_id, &operation);
}
```

## Callback Types

```rust
pub enum OracleCallback {
    /// Query was created successfully
    QueryCreated {
        query_id: u64,
        request_id: u64,
        callback_data: Vec<u8>,
    },
    
    /// Query was resolved with a result
    QueryResolved {
        query_id: u64,
        result: String,           // "Yes" or "No"
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
        vote_count: u32,
        confidence: u8,           // 0-100
    },
    
    /// Query expired without enough votes
    QueryExpired {
        query_id: u64,
        callback_data: Vec<u8>,
        votes_received: u32,
        votes_required: u32,
    },
    
    /// Query was cancelled
    QueryCancelled {
        query_id: u64,
        callback_data: Vec<u8>,
        reason: String,
    },
}
```

## Callback Data Encoding

Use helper functions for encoding/decoding market IDs:

```rust
use alethea_oracle_messages::{encode_request_id, decode_request_id};

// Encode market_id for callback_data
let callback_data = encode_request_id(market_id);  // [1, 0, 0, 0, 0, 0, 0, 0]

// Decode market_id from callback_data
let market_id = decode_request_id(&callback_data).unwrap();  // 1
```

## Consumer App Registration (Optional)

Register your app for rate limiting and analytics:

```rust
let operation = oracle_registry_v2::Operation::RegisterConsumerApp {
    name: "My Prediction Market".to_string(),
    category: AppCategory::PredictionMarket,
    stake: Amount::ZERO,  // Free tier
    metadata_url: None,
};

self.runtime.call_application(true, registry_app_id, &operation);
```

### Registration Tiers

| Tier | Stake | Rate Limit | Priority |
|------|-------|------------|----------|
| Free | 0 ALTH | 10/hour | Low |
| Standard | 100 ALTH | 100/hour | Medium |
| Premium | 1000 ALTH | 1000/hour | High |
| Enterprise | 10000 ALTH | Unlimited | Highest |

## App Categories

```rust
pub enum AppCategory {
    PredictionMarket,  // Prediction markets
    Insurance,         // Insurance protocols
    Gaming,            // Gaming applications
    DeFi,              // DeFi protocols
    DataFeed,          // Data feed consumers
    Custom(String),    // Custom category
}
```

## Example: Simple Market Integration

See `simple-market` for a complete working example:

```
alethea-contract/simple-market/
├── src/
│   ├── contract.rs  # Handles callbacks, requests resolution
│   ├── lib.rs       # Message types, operations
│   └── state.rs     # Market state
└── README.md
```

**Verified Results:**
- Market #1 created with question
- RequestResolution sent to Oracle
- Query #10 created in Oracle Registry
- Market linked to Query (queryId: 10)
- Market status changed to "Voting"

## Integration Checklist

- [ ] Add `alethea-oracle-messages` dependency
- [ ] Include `OracleCallback` in Message enum
- [ ] Handle all callback types in `execute_message`
- [ ] Store Oracle Registry App ID during instantiation
- [ ] Implement `CreateQueryWithCallback` call
- [ ] Encode market/entity ID in callback_data
- [ ] Test end-to-end flow

## Deployment Command

```bash
linera publish-and-create \
  contract.wasm service.wasm \
  36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2 \
  --json-argument '{"registry_app_id":"b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c","registry_chain_id":"36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2","use_local_instance":true}' \
  --required-application-ids b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c
```

## License

MIT

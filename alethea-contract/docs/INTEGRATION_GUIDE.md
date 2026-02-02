# Alethea Oracle Integration Guide

## Overview

This guide explains how to integrate your application with Alethea Oracle Network for decentralized resolution.

## NEW: Consumer App Registration System

Starting from v0.2.0, consumer apps (markets, insurance, etc.) should register with the Oracle Registry before creating queries. This enables:

- **Access Control**: Only registered apps can create queries
- **Rate Limiting**: Tiered rate limits based on stake
- **Analytics**: Track app usage and reputation
- **Accountability**: Apps stake tokens for accountability

### Registration Tiers

| Tier | Stake | Rate Limit | Priority |
|------|-------|------------|----------|
| Free | 0 ALTH | 10/hour | Low |
| Standard | 100 ALTH | 100/hour | Medium |
| Premium | 1000 ALTH | 1000/hour | High |
| Enterprise | 10000 ALTH | Unlimited | Highest |

### Quick Registration

```rust
// In your contract's instantiate()
let operation = oracle_registry_v2::Operation::RegisterConsumerApp {
    name: "My Prediction Market".to_string(),
    category: oracle_registry_v2::AppCategory::PredictionMarket,
    stake: Amount::ZERO, // Free tier
    metadata_url: None,
};

let response = self.runtime.call_application(true, registry_app_id, &operation);
```

## Architecture: Hub-and-Spoke

Alethea uses a **Hub-and-Spoke** architecture for scalable, trustless oracle resolution:

```
                              ┌─────────────────────────────────┐
                              │         HUB CHAIN               │
                              │      (Alethea Main)             │
                              │                                 │
                              │  ┌───────────────────────────┐  │
                              │  │   Registry (HUB MODE)     │  │
                              │  │ - Global voter registry   │  │
                              │  │ - Consumer app registry   │  │
                              │  │ - Voting happens HERE     │  │
                              │  │ - Resolution authority    │  │
                              │  └───────────────────────────┘  │
                              └───────────────┬─────────────────┘
                                              │
                     Cross-chain messaging (SAME APP = Registry)
                                              │
          ┌───────────────────────────────────┼───────────────────────────────────┐
          │                                   │                                   │
          ▼                                   ▼                                   ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│    YOUR CHAIN           │     │    OTHER DEV CHAIN      │     │    ANOTHER CHAIN        │
│                         │     │                         │     │                         │
│ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │
│ │Registry (INSTANCE)  │ │     │ │Registry (INSTANCE)  │ │     │ │Registry (INSTANCE)  │ │
│ │- Forwards queries   │ │     │ │- Forwards queries   │ │     │ │- Forwards queries   │ │
│ │- Receives callbacks │ │     │ │- Receives callbacks │ │     │ │- Receives callbacks │ │
│ └──────────┬──────────┘ │     │ └──────────┬──────────┘ │     │ └──────────┬──────────┘ │
│            │            │     │            │            │     │            │            │
│   call_application()    │     │   call_application()    │     │   call_application()    │
│   (TRUSTLESS!)          │     │   (TRUSTLESS!)          │     │   (TRUSTLESS!)          │
│            │            │     │            │            │     │            │            │
│            ▼            │     │            ▼            │     │            ▼            │
│ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │
│ │   Your Market App   │ │     │ │   Their Market App  │ │     │ │   Insurance App     │ │
│ │   (REGISTERED)      │ │     │ │   (REGISTERED)      │ │     │ │   (REGISTERED)      │ │
│ └─────────────────────┘ │     │ └─────────────────────┘ │     │ └─────────────────────┘ │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

### Why Hub-and-Spoke?

| Benefit | Description |
|---------|-------------|
| **Scalable** | Unlimited developer chains |
| **Self-service** | Developers use `request-application` |
| **Trustless** | `call_application()` = on-chain verification |
| **Isolated** | Each app on its own chain |
| **Decentralized** | Voting on Hub, execution distributed |

For detailed architecture documentation, see [HUB_AND_SPOKE_ARCHITECTURE.md](./HUB_AND_SPOKE_ARCHITECTURE.md).

## Quick Start: Developer Onboarding

### Step 1: Request Registry Instance on Your Chain

```bash
# Get Registry Instance on your chain (no permission needed!)
linera request-application \
  d7179163b28ee5d94087fcfc0208191c6451381cf0003325190a0cd461a30c47 \
  --target-chain-id <YOUR_CHAIN_ID>
```

This creates a Registry Instance on your chain that:
- Automatically connects to Alethea Hub
- Forwards queries to Hub for voting
- Receives resolution callbacks

### Step 2: Deploy Your App

```bash
# Deploy your app to YOUR OWN chain
linera publish-and-create \
  your_contract.wasm your_service.wasm \
  --json-argument '{"registry_app_id":"<REGISTRY_INSTANCE_ON_YOUR_CHAIN>"}'
```

### Step 3: Register as Consumer App (NEW!)

In your contract's `instantiate()`:

```rust
// Register with Oracle Registry
let operation = oracle_registry_v2::Operation::RegisterConsumerApp {
    name: "My App Name".to_string(),
    category: oracle_registry_v2::AppCategory::PredictionMarket, // or Insurance, Gaming, DeFi, DataFeed
    stake: Amount::from_tokens(100), // Standard tier
    metadata_url: Some("https://myapp.com/metadata.json".to_string()),
};

let response = self.runtime.call_application(true, registry_app_id, &operation);
if response.success {
    eprintln!("✅ Registered with Oracle: {}", response.message);
}
```

### Step 4: Use Oracle via call_application()

Your app calls the local Registry Instance (trustless, on-chain):

```rust
// In your contract
let response = self.runtime.call_application(
    true,  // authenticated
    registry_app_id,
    &Operation::CreateQueryWithCallback { ... },
);
```

## Step-by-Step Integration

### Step 1: Add Dependencies

```toml
# Cargo.toml
[dependencies]
alethea-consumer-sdk = { path = "../alethea-consumer-sdk" }
oracle-registry-v2 = { path = "../oracle-registry-v2" }
```

### Step 2: Define Message Types

```rust
// src/lib.rs
use linera_sdk::linera_base_types::Timestamp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    // Your other messages...
    
    /// REQUIRED: Oracle resolution callback
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
    },
}
```

### Step 3: Store Registry Reference

```rust
// src/state.rs
use linera_sdk::linera_base_types::{ApplicationId, ChainId};

pub struct MyAppState {
    // Your state...
    
    /// Oracle Registry Application ID
    pub registry_app_id: RegisterView<Option<ApplicationId>>,
    
    /// Oracle Registry Chain ID (for callbacks)
    pub registry_chain_id: RegisterView<Option<ChainId>>,
}
```

### Step 4: Initialize with Registry

```rust
// src/contract.rs
async fn instantiate(&mut self, args: InstantiationArgument) {
    // Store Registry reference
    self.state.registry_app_id.set(Some(args.registry_app_id.forget_abi()));
    self.state.registry_chain_id.set(Some(args.registry_chain_id));
}
```

### Step 5: Request Resolution

```rust
use alethea_consumer_sdk::CallbackData;
use oracle_registry_v2::OracleRegistryV2Abi;

async fn request_resolution(&mut self, entity_id: u64, question: String) {
    let registry_app_id = self.state.registry_app_id.get()
        .expect("Registry not configured");
    
    // Encode your entity ID in callback data
    let callback_data = CallbackData::encode_u64(entity_id);
    
    // Create the operation
    let operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
        description: question,
        outcomes: vec!["Yes".to_string(), "No".to_string()],
        strategy: oracle_registry_v2::state::DecisionStrategy::Majority,
        min_votes: None,
        reward_amount: Amount::ZERO,
        deadline: None,
        callback_chain: self.runtime.chain_id(),
        callback_app: self.runtime.application_id().forget_abi(),
        callback_data,
    };
    
    // Make cross-application call
    let registry_typed = registry_app_id.with_abi::<OracleRegistryV2Abi>();
    let response = self.runtime.call_application(true, registry_typed, &operation);
    
    if !response.success {
        panic!("Failed to create query: {}", response.message);
    }
}
```

### Step 6: Handle Callback

```rust
use alethea_consumer_sdk::CallbackData;

async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback {
            query_id,
            resolved_outcome,
            resolved_at,
            callback_data,
        } => {
            // Decode your entity ID
            let entity_id = CallbackData::decode_u64(&callback_data)
                .expect("Invalid callback data");
            
            // Update your state
            self.handle_resolution(entity_id, query_id, resolved_outcome, resolved_at).await;
        }
        // ... other messages
    }
}

async fn handle_resolution(
    &mut self,
    entity_id: u64,
    query_id: u64,
    outcome: String,
    resolved_at: Timestamp,
) {
    // Get your entity
    let mut entity = self.state.entities.get(&entity_id).await
        .expect("Entity not found");
    
    // Update with resolution
    entity.status = EntityStatus::Resolved;
    entity.outcome = Some(outcome);
    entity.resolved_at = Some(resolved_at);
    entity.query_id = Some(query_id);
    
    // Save
    self.state.entities.insert(&entity_id, entity);
}
```

## Complete Example

See `simple-market` for a complete working example:

```
alethea-contract/simple-market/
├── src/
│   ├── contract.rs  # Full implementation
│   ├── lib.rs       # Types and operations
│   ├── service.rs   # GraphQL interface
│   └── state.rs     # State management
├── Cargo.toml
└── README.md
```

## Testing Your Integration

### 1. Deploy Oracle Registry

```bash
# Build
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

# Deploy
linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm
```

### 2. Deploy Your Contract

```bash
# Build
cargo build --release --target wasm32-unknown-unknown -p your-contract

# Deploy with Registry reference
linera publish-and-create \
  target/wasm32-unknown-unknown/release/your_contract.wasm \
  target/wasm32-unknown-unknown/release/your_service.wasm \
  --json-argument '{"registry_app_id":"<REGISTRY_APP_ID>","registry_chain_id":"<CHAIN_ID>"}'
```

### 3. Test Flow

```bash
# 1. Create entity in your contract
curl -X POST "$YOUR_APP_URL" \
  -d '{"query":"mutation { createEntity(question: \"Test?\") }"}'

# 2. Request resolution (after entity expires)
curl -X POST "$YOUR_APP_URL" \
  -d '{"query":"mutation { requestResolution(entityId: \"1\") }"}'

# 3. Vote in Oracle Dashboard (http://localhost:4002)

# 4. Check resolution
curl -X POST "$YOUR_APP_URL" \
  -d '{"query":"{ entity(id: \"1\") { status outcome } }"}'
```

## Best Practices

### 1. Question Format

Write questions about **verifiable facts**, not predictions:

```
✅ Good: "Did Bitcoin close above $100,000 on December 5, 2024?"
✅ Good: "Did Team A win the championship game on [date]?"
✅ Good: "Was the SpaceX launch on [date] successful?"

❌ Bad: "Will Bitcoin reach $100,000?" (future prediction)
❌ Bad: "Is Bitcoin a good investment?" (subjective)
```

### 2. Outcomes

Keep outcomes clear and mutually exclusive:

```rust
// Binary (most common)
outcomes: vec!["Yes".to_string(), "No".to_string()]

// Multiple choice
outcomes: vec!["Team A".to_string(), "Team B".to_string(), "Draw".to_string()]

// Numeric ranges
outcomes: vec!["0-100".to_string(), "101-500".to_string(), "500+".to_string()]
```

### 3. Callback Data

Encode all necessary information:

```rust
// Single ID
let data = CallbackData::encode_u64(market_id);

// Multiple IDs
let data = CallbackData::encode_multiple_u64(&[market_id, user_id, round_id]);

// With reference string
let data = CallbackData::encode_string(&format!("market:{}:round:{}", market_id, round));
```

### 4. Error Handling

Always handle potential failures:

```rust
// Check response
if !response.success {
    // Revert state changes
    entity.status = EntityStatus::Open;
    self.state.entities.insert(&entity_id, entity);
    panic!("Oracle call failed: {}", response.message);
}

// Validate callback
let entity_id = match CallbackData::decode_u64(&callback_data) {
    Some(id) => id,
    None => {
        eprintln!("Invalid callback data");
        return;
    }
};
```

## Troubleshooting

### Query Not Created

- Check Registry App ID is correct
- Ensure you're on the same chain (for cross-app calls)
- Verify question and outcomes are valid

### Callback Not Received

- Verify callback_chain and callback_app are correct
- Check your Message enum includes QueryResolutionCallback
- Ensure execute_message handles the callback

### Resolution Incorrect

- Check voting phase completed
- Verify minimum votes reached
- Review voter participation in Dashboard

## Support

- GitHub: https://github.com/alethea-network
- Dashboard: http://localhost:4002
- Documentation: ./docs/

## License

MIT

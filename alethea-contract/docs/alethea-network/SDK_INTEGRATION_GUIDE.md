# 🚀 Alethea SDK Integration Guide

## Quick Start: Integrate Oracle in 3 Steps

### Step 1: Add Dependencies

```toml
# Cargo.toml
[dependencies]
alethea-sdk = { path = "../alethea-sdk" }
alethea-oracle-types = { path = "../alethea-oracle-types" }
```

### Step 2: Add SDK Client to Your Contract

```rust
use alethea_sdk::AletheaClient;
use alethea_oracle_types::RegistryMessage;

pub struct YourContract {
    state: YourState,
    runtime: ContractRuntime<Self>,
    alethea: AletheaClient,  // ✅ Add this
}

impl Contract for YourContract {
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = YourState::load(runtime.root_view_storage_context())
            .await
            .unwrap();
        
        Self {
            state,
            runtime,
            alethea: AletheaClient::new(),  // ✅ Initialize
        }
    }
}
```

### Step 3: Request Resolution (ONE LINE!)

```rust
impl YourContract {
    async fn request_oracle_resolution(&mut self, question: String, outcomes: Vec<String>) {
        // ✅ That's it! One line to request resolution
        self.alethea.request_resolution(
            &self.runtime,
            question,
            outcomes,
            deadline,
            your_callback_data,
        ).await.unwrap();
    }
    
    async fn execute_cross_chain_message(&mut self, message: RegistryMessage) {
        // ✅ One line to handle resolution
        if let Some(result) = self.alethea.handle_resolution(message) {
            // Use result.outcome_index and result.confidence
            self.handle_oracle_result(result).await;
        }
    }
}
```

---

## 📚 Complete Example: Prediction Market

```rust
// Copyright (c) Your Project
// SPDX-License-Identifier: MIT

#![cfg_attr(target_arch = "wasm32", no_main)]

use linera_sdk::{
    linera_base_types::{WithContractAbi, Amount, Timestamp},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use alethea_sdk::AletheaClient;
use alethea_oracle_types::RegistryMessage;

pub struct PredictionMarket {
    state: MarketState,
    runtime: ContractRuntime<Self>,
    alethea: AletheaClient,
}

linera_sdk::contract!(PredictionMarket);

impl Contract for PredictionMarket {
    type Message = RegistryMessage;
    type Parameters = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .unwrap();
        
        Self {
            state,
            runtime,
            alethea: AletheaClient::new(),
        }
    }

    async fn instantiate(&mut self, _arg: ()) {
        // Initialize your state
    }

    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::CreateMarket { question, outcomes, deadline } => {
                // 1. Create market locally
                let market_id = self.create_market_internal(question.clone(), outcomes.clone()).await;
                
                // 2. Request oracle resolution (ONE LINE!)
                self.alethea.request_resolution(
                    &self.runtime,
                    question,
                    outcomes,
                    deadline,
                    market_id.to_le_bytes().to_vec(),  // Store market ID in callback
                ).await.unwrap();
                
                Response::MarketCreated { market_id }
            }
            // ... other operations
        }
    }

    async fn execute_cross_chain_message(&mut self, message: RegistryMessage) {
        // Handle oracle resolution (ONE LINE!)
        if let Some(result) = self.alethea.handle_resolution(message) {
            // Extract market ID from callback data
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
            
            // Settle market with oracle result
            self.settle_market(market_id, result.outcome_index, result.confidence).await;
        }
    }

    async fn store(mut self) {
        self.state.save().await.unwrap();
    }
}

impl PredictionMarket {
    async fn create_market_internal(&mut self, question: String, outcomes: Vec<String>) -> u64 {
        // Your market creation logic
        let market_id = self.state.next_market_id;
        self.state.next_market_id += 1;
        // ... store market
        market_id
    }
    
    async fn settle_market(&mut self, market_id: u64, outcome_index: usize, confidence: u8) {
        // Your settlement logic
        // outcome_index: winning outcome (0-based)
        // confidence: 0-100 (percentage)
    }
}
```

---

## 🎯 SDK API Reference

### `AletheaClient`

#### Constructor

```rust
// Use canonical registry (recommended)
let client = AletheaClient::new();

// Use custom registry (for testing)
let client = AletheaClient::with_registry(custom_registry_id);
```

#### Methods

##### `request_resolution()`

Request oracle resolution for a question.

```rust
pub async fn request_resolution<C: Contract>(
    &self,
    runtime: &ContractRuntime<C>,
    question: String,
    outcomes: Vec<String>,
    deadline: Timestamp,
    callback_data: Vec<u8>,
) -> Result<(), AletheaError>
```

**Parameters:**
- `runtime` - Your contract runtime
- `question` - Question to resolve (e.g., "Will BTC hit $100k?")
- `outcomes` - Possible outcomes (2-10 options, e.g., ["Yes", "No"])
- `deadline` - When resolution should happen
- `callback_data` - Data to include in callback (e.g., market ID)

**Returns:**
- `Ok(())` if request sent successfully
- `Err(AletheaError)` if failed

**Example:**
```rust
self.alethea.request_resolution(
    &self.runtime,
    "Will it rain tomorrow?".to_string(),
    vec!["Yes".to_string(), "No".to_string()],
    Timestamp::from(tomorrow),
    market_id.to_le_bytes().to_vec(),
).await?;
```

---

##### `handle_resolution()`

Parse resolution callback from oracle.

```rust
pub fn handle_resolution(
    &self,
    message: RegistryMessage,
) -> Option<ResolutionResult>
```

**Parameters:**
- `message` - Message received from oracle

**Returns:**
- `Some(ResolutionResult)` if message is a resolution
- `None` if message is not a resolution

**Example:**
```rust
if let Some(result) = self.alethea.handle_resolution(message) {
    println!("Market resolved: outcome {}, confidence {}%", 
        result.outcome_index, 
        result.confidence
    );
}
```

---

### `ResolutionResult`

Result of oracle resolution.

```rust
pub struct ResolutionResult {
    pub market_id: u64,
    pub outcome_index: usize,
    pub confidence: u8,
    pub callback_data: Vec<u8>,
}
```

**Fields:**
- `market_id` - Market ID (extracted from callback_data)
- `outcome_index` - Winning outcome (0-based index)
- `confidence` - Confidence score (0-100)
- `callback_data` - Original callback data you provided

---

## 🔧 Advanced Usage

### Custom Callback Data

You can store any data in callback_data to identify your market:

```rust
// Store market ID
let callback_data = market_id.to_le_bytes().to_vec();

// Store multiple values
let mut callback_data = Vec::new();
callback_data.extend_from_slice(&market_id.to_le_bytes());
callback_data.extend_from_slice(&user_id.to_le_bytes());

// Store JSON (if needed)
let callback_data = serde_json::to_vec(&MyData { ... }).unwrap();
```

### Error Handling

```rust
match self.alethea.request_resolution(...).await {
    Ok(_) => {
        // Resolution requested successfully
        Response::Success
    }
    Err(AletheaError::RegistryNotFound) => {
        // Registry not deployed
        Response::Error("Oracle not available")
    }
    Err(AletheaError::InvalidParameters) => {
        // Invalid question or outcomes
        Response::Error("Invalid parameters")
    }
    Err(e) => {
        // Other errors
        Response::Error(format!("Failed: {:?}", e))
    }
}
```

### Query Market Status

```rust
// Query status of a market
let status = self.alethea.query_market_status(
    &self.runtime,
    market_id,
).await?;

println!("Market status: {:?}", status.status);
println!("Commitments: {}", status.total_commitments);
println!("Reveals: {}", status.total_reveals);
```

---

## 📊 Message Flow

```
1. Your dApp
   └─> request_resolution()
       └─> Send message to Oracle Registry

2. Oracle Registry
   ├─> Select voters
   ├─> Broadcast vote requests
   ├─> Collect commitments
   ├─> Collect reveals
   ├─> Aggregate votes
   └─> Send resolution to your dApp

3. Your dApp
   └─> handle_resolution()
       └─> Settle market with result
```

---

## ✅ Best Practices

### 1. **Always Store Market ID in Callback**

```rust
// ✅ Good
let callback_data = market_id.to_le_bytes().to_vec();

// ❌ Bad - No way to identify which market
let callback_data = vec![];
```

### 2. **Handle Resolution in Separate Method**

```rust
// ✅ Good - Clean separation
async fn execute_cross_chain_message(&mut self, message: RegistryMessage) {
    if let Some(result) = self.alethea.handle_resolution(message) {
        self.handle_oracle_result(result).await;
    }
}

async fn handle_oracle_result(&mut self, result: ResolutionResult) {
    // Your settlement logic here
}
```

### 3. **Validate Outcomes**

```rust
// ✅ Good - Validate before requesting
if outcomes.len() < 2 || outcomes.len() > 10 {
    return Response::Error("Invalid outcomes");
}

self.alethea.request_resolution(...).await?;
```

### 4. **Use Confidence Score**

```rust
// ✅ Good - Consider confidence in settlement
if result.confidence >= 80 {
    // High confidence - settle normally
    self.settle_market(market_id, result.outcome_index).await;
} else {
    // Low confidence - maybe refund or dispute
    self.handle_low_confidence(market_id).await;
}
```

---

## 🚫 Common Mistakes

### ❌ Don't Configure Oracle Manually

```rust
// ❌ OLD WAY - Don't do this!
pub struct OldContract {
    oracle_id: Option<ApplicationId>,  // ❌ Not needed!
}

// ✅ NEW WAY - SDK handles it
pub struct NewContract {
    alethea: AletheaClient,  // ✅ Just use SDK
}
```

### ❌ Don't Parse Messages Manually

```rust
// ❌ OLD WAY - Don't do this!
match message {
    Message::MarketResolved { market_id, outcome, .. } => {
        // Manual parsing
    }
}

// ✅ NEW WAY - Use SDK
if let Some(result) = self.alethea.handle_resolution(message) {
    // Automatic parsing
}
```

### ❌ Don't Send Messages Directly

```rust
// ❌ OLD WAY - Don't do this!
self.runtime.send_message(
    oracle_chain_id,  // ❌ Need to know chain ID
    Message::ResolutionRequest { ... },  // ❌ Manual construction
);

// ✅ NEW WAY - Use SDK
self.alethea.request_resolution(...).await?;  // ✅ One line!
```

---

## 📖 Examples

### Sports Betting

```rust
// Create sports bet
let market_id = self.create_bet(
    "Who will win Lakers vs Warriors?",
    vec!["Lakers", "Warriors", "Draw"],
).await;

// Request oracle resolution
self.alethea.request_resolution(
    &self.runtime,
    "Who will win Lakers vs Warriors?".to_string(),
    vec!["Lakers".to_string(), "Warriors".to_string(), "Draw".to_string()],
    game_end_time,
    market_id.to_le_bytes().to_vec(),
).await?;
```

### Weather Derivatives

```rust
// Create weather derivative
let market_id = self.create_derivative(
    "Will temperature exceed 30°C tomorrow?",
    vec!["Yes", "No"],
).await;

// Request oracle resolution
self.alethea.request_resolution(
    &self.runtime,
    "Will temperature exceed 30°C tomorrow?".to_string(),
    vec!["Yes".to_string(), "No".to_string()],
    tomorrow_end,
    market_id.to_le_bytes().to_vec(),
).await?;
```

### Political Prediction

```rust
// Create political prediction market
let market_id = self.create_prediction(
    "Who will win the 2024 election?",
    vec!["Candidate A", "Candidate B", "Candidate C"],
).await;

// Request oracle resolution
self.alethea.request_resolution(
    &self.runtime,
    "Who will win the 2024 election?".to_string(),
    vec![
        "Candidate A".to_string(),
        "Candidate B".to_string(),
        "Candidate C".to_string(),
    ],
    election_day,
    market_id.to_le_bytes().to_vec(),
).await?;
```

---

## 🎉 Summary

### What You Get:

✅ **One-line integration** - No complex setup
✅ **No configuration** - SDK knows canonical registry
✅ **Automatic parsing** - No manual message handling
✅ **Type-safe** - Compile-time guarantees
✅ **Scalable** - Shared infrastructure
✅ **Permissionless** - No approval needed

### What You Don't Need:

❌ Deploy oracle infrastructure
❌ Configure oracle IDs
❌ Manual message construction
❌ Complex setup
❌ Approval process

---

**Ready to integrate?** Just add the SDK and start building! 🚀

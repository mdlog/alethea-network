# Alethea SDK

Simple client library for integrating Alethea Oracle Protocol into your Linera dApp.

## Features

- ✅ **One-line integration** - Request oracle resolution with a single method call
- ✅ **Automatic routing** - Uses canonical Oracle Registry (no configuration needed)
- ✅ **Type-safe** - Full Rust type safety with comprehensive error handling
- ✅ **Callback handling** - Easy parsing of oracle responses
- ✅ **Binary market helpers** - Convenience methods for Yes/No markets

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
alethea-sdk = { path = "../alethea-sdk" }
alethea-oracle-types = { path = "../alethea-oracle-types" }
```

## Quick Start

### 1. Create Client

```rust
use alethea_sdk::AletheaClient;

// Create client (uses canonical registry)
let client = AletheaClient::new();
```

### 2. Request Resolution

```rust
use linera_sdk::linera_base_types::Timestamp;

// Request market resolution
client.request_resolution(
    &self.runtime,
    "Will it rain tomorrow?".to_string(),
    vec!["Yes".to_string(), "No".to_string()],
    Timestamp::from(tomorrow_timestamp),
    market_id.to_le_bytes().to_vec(), // Callback data
).await?;
```

### 3. Handle Resolution

```rust
use alethea_oracle_types::RegistryMessage;

async fn execute_message(&mut self, message: RegistryMessage) {
    // Parse resolution result
    if let Some(result) = self.client.handle_resolution(message) {
        // Market resolved!
        let market_id = result.market_id_from_callback().unwrap();
        let outcome = result.outcome_index;
        let confidence = result.confidence;
        
        // Settle your market
        self.settle_market(market_id, outcome).await;
    }
}
```

## Complete Example

```rust
use alethea_sdk::{AletheaClient, ResolutionResult};
use alethea_oracle_types::RegistryMessage;
use linera_sdk::{
    base::{ContractRuntime, Timestamp, WithContractAbi},
    views::{RootView, View},
    Contract,
};

pub struct MyPredictionMarket {
    state: MyMarketState,
    runtime: ContractRuntime<Self>,
    alethea: AletheaClient,
}

impl Contract for MyPredictionMarket {
    type Message = RegistryMessage;
    // ... other associated types ...

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MyMarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        Self {
            state,
            runtime,
            alethea: AletheaClient::new(), // Create client
        }
    }

    async fn execute_operation(&mut self, operation: MyOperation) -> MyResponse {
        match operation {
            MyOperation::CreateMarket { question, deadline } => {
                let market_id = self.state.next_market_id().await;
                
                // Request oracle resolution
                self.alethea.request_binary_resolution(
                    &self.runtime,
                    question,
                    deadline,
                    market_id.to_le_bytes().to_vec(),
                ).await?;
                
                MyResponse::MarketCreated { market_id }
            }
        }
    }

    async fn execute_message(&mut self, message: RegistryMessage) {
        // Handle oracle resolution
        if let Some(result) = self.alethea.handle_resolution(message) {
            let market_id = result.market_id_from_callback().unwrap();
            
            // Settle market with oracle result
            self.settle_market(market_id, result.outcome_index).await;
        }
    }
}
```

## API Reference

### AletheaClient

#### Methods

##### `new() -> Self`

Create client with canonical Oracle Registry.

```rust
let client = AletheaClient::new();
```

##### `with_registry(registry_id: ApplicationId) -> Self`

Create client with custom registry (for testing).

```rust
let client = AletheaClient::with_registry(custom_registry_id);
```

##### `request_resolution(...) -> Result<()>`

Request market resolution from oracle.

**Parameters:**
- `runtime: &ContractRuntime<C>` - Contract runtime
- `question: String` - Question to resolve
- `outcomes: Vec<String>` - Possible outcomes (2-10)
- `deadline: Timestamp` - Resolution deadline
- `callback_data: Vec<u8>` - Data for callback (e.g., market ID)

**Example:**
```rust
client.request_resolution(
    &runtime,
    "Will BTC reach $100k?".to_string(),
    vec!["Yes".to_string(), "No".to_string()],
    Timestamp::from(future_time),
    market_id.to_le_bytes().to_vec(),
).await?;
```

##### `request_binary_resolution(...) -> Result<()>`

Convenience method for binary (Yes/No) markets.

**Parameters:**
- `runtime: &ContractRuntime<C>` - Contract runtime
- `question: String` - Question to resolve
- `deadline: Timestamp` - Resolution deadline
- `callback_data: Vec<u8>` - Data for callback

**Example:**
```rust
client.request_binary_resolution(
    &runtime,
    "Will it rain tomorrow?".to_string(),
    Timestamp::from(tomorrow),
    market_id.to_le_bytes().to_vec(),
).await?;
```

##### `handle_resolution(message: RegistryMessage) -> Option<ResolutionResult>`

Parse resolution callback from oracle.

**Returns:**
- `Some(ResolutionResult)` if message is a resolution
- `None` if message is not a resolution

**Example:**
```rust
if let Some(result) = client.handle_resolution(message) {
    println!("Outcome: {}, Confidence: {}%", 
        result.outcome_index, result.confidence);
}
```

##### `extract_market_id(result: &ResolutionResult) -> Option<u64>`

Extract market ID from callback data.

**Example:**
```rust
if let Some(market_id) = client.extract_market_id(&result) {
    self.settle_market(market_id, result.outcome_index).await;
}
```

### ResolutionResult

Resolution result from oracle.

**Fields:**
- `market_id: u64` - Market ID (from registry)
- `outcome_index: usize` - Winning outcome index
- `confidence: u8` - Confidence score (0-100)
- `callback_data: Vec<u8>` - Your callback data

**Methods:**
- `market_id_from_callback() -> Option<u64>` - Extract market ID from callback data

### MarketRegistration

Market registration parameters.

**Methods:**
- `new(...)` - Create registration
- `binary(...)` - Create binary market registration
- `validate()` - Validate parameters

## Error Handling

```rust
use alethea_sdk::{AletheaError, Result};

match client.request_resolution(...).await {
    Ok(()) => println!("Request sent"),
    Err(AletheaError::RegistryNotConfigured) => {
        println!("Registry not deployed yet");
    }
    Err(AletheaError::InvalidParameters(msg)) => {
        println!("Invalid parameters: {}", msg);
    }
    Err(e) => println!("Error: {}", e),
}
```

## Best Practices

### 1. Store Market ID in Callback Data

```rust
// When requesting resolution
let market_id = 123u64;
client.request_resolution(
    &runtime,
    question,
    outcomes,
    deadline,
    market_id.to_le_bytes().to_vec(), // ✅ Store market ID
).await?;

// When handling resolution
if let Some(result) = client.handle_resolution(message) {
    let market_id = result.market_id_from_callback().unwrap();
    // ✅ Can identify which market was resolved
}
```

### 2. Validate Before Requesting

```rust
use alethea_sdk::MarketRegistration;

let registration = MarketRegistration::new(
    question,
    outcomes,
    deadline.micros(),
    callback_data,
);

// Validate before sending
if let Err(e) = registration.validate() {
    return Err(format!("Invalid market: {}", e));
}

client.request_resolution(...).await?;
```

### 3. Handle All Message Types

```rust
async fn execute_message(&mut self, message: RegistryMessage) {
    // Handle resolution
    if let Some(result) = self.alethea.handle_resolution(message) {
        self.handle_resolution(result).await;
        return;
    }
    
    // Handle other message types if needed
    match message {
        RegistryMessage::VoteRequest { .. } => {
            // Not relevant for dApps
        }
        _ => {}
    }
}
```

### 4. Use Binary Helper for Yes/No Markets

```rust
// Instead of:
client.request_resolution(
    &runtime,
    question,
    vec!["Yes".to_string(), "No".to_string()],
    deadline,
    callback_data,
).await?;

// Use:
client.request_binary_resolution(
    &runtime,
    question,
    deadline,
    callback_data,
).await?; // ✅ Simpler
```

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = AletheaClient::new();
        // Test client functionality
    }
}
```

### Integration Tests

For integration testing, use a custom registry:

```rust
let test_registry_id = deploy_test_registry().await;
let client = AletheaClient::with_registry(test_registry_id);

client.request_resolution(...).await?;
```

## Examples

See the `market-chain` crate for a complete example of integrating Alethea SDK into a prediction market dApp.

## Support

- **Documentation**: https://docs.alethea.network
- **GitHub**: https://github.com/alethea-network
- **Discord**: https://discord.gg/alethea

## License

MIT OR Apache-2.0

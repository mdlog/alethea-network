# Linera Executor

Tool untuk mengeksekusi operasi pada Linera chains menggunakan Linera SDK.

## ⚠️ Status: Prototype

Tool ini adalah **prototype** yang mendemonstrasikan bagaimana execution seharusnya bekerja. 

**Limitasi saat ini:**
- Linera CLI tidak menyediakan perintah `execute-operation` langsung
- Operasi harus dieksekusi melalui blocks atau messages
- Memerlukan proper SDK integration untuk production use

## Installation

```bash
cd linera-executor
cargo build --release
```

Binary akan tersedia di `../target/release/linera-executor`.

## Usage

### Set Environment Variables

```bash
export CHAIN_ID="ce05009e4ffaef77689fe3c26f08494f13feb7b18ae60d44dec76799988efbb1"
export APP_ID="640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6"
export WALLET_PATH="~/.config/linera/wallet.json"
export STORAGE_PATH="rocksdb:~/.config/linera/wallet.db"
```

### Test Connection

```bash
linera-executor test
```

### Register Voter

```bash
linera-executor register-voter \
  --stake 1000 \
  --name "Alice"
```

### Submit Vote

```bash
linera-executor submit-vote \
  --query-id 1 \
  --value "Yes" \
  --confidence 90
```

### Create Query

```bash
linera-executor create-query \
  --description "Will it rain tomorrow?" \
  --outcomes "Yes,No" \
  --strategy Majority \
  --min-votes 3 \
  --reward 1000
```

### Update Stake

```bash
linera-executor update-stake --amount 500
```

### Withdraw Stake

```bash
linera-executor withdraw-stake --amount 200
```

### Claim Rewards

```bash
linera-executor claim-rewards
```

### Execute from File

```bash
linera-executor execute-file --file /tmp/operation.json
```

### Send Message

```bash
linera-executor send-message \
  --target-chain "ce05009e4ffaef77689fe3c26f08494f13feb7b18ae60d44dec76799988efbb1" \
  --message '{"RegisterVoter":{"stake":"1000","name":"Alice","metadata_url":null}}'
```

## How It Works

### Current Implementation (Prototype)

1. **Parse command** - CLI arguments diparse
2. **Create operation** - Operation object dibuat
3. **Serialize to JSON** - Operation diserialisasi ke JSON
4. **Save to file** - JSON disimpan ke temp file
5. **Return instructions** - Instruksi dikembalikan ke user

### What's Missing (Production)

Untuk production use, diperlukan:

1. **Proper SDK Integration**
   ```rust
   use linera_sdk::*;
   
   let client = ChainClient::new(chain_id, wallet, storage)?;
   client.execute_operation(operation).await?;
   ```

2. **Block Creation**
   - Create block proposal dengan operation
   - Sign block dengan wallet
   - Submit block ke validators
   - Wait for confirmation

3. **Message Sending**
   - Create message dengan proper authentication
   - Send message ke target chain
   - Wait for message processing

## Architecture

```
┌─────────────────┐
│   CLI Parser    │
│   (clap)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LineraExecutor │
│  (executor.rs)  │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  Operation      │  │   Message    │
│  Creation       │  │   Sending    │
└─────────────────┘  └──────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────┐
│   Linera SDK (Future)       │
│   - ChainClient             │
│   - Block Creation          │
│   - Message Passing         │
└─────────────────────────────┘
```

## Example: Register Alice

```bash
# Set environment
export CHAIN_ID="ce05009e4ffaef77689fe3c26f08494f13feb7b18ae60d44dec76799988efbb1"
export APP_ID="640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6"

# Register voter
linera-executor register-voter \
  --stake 1000 \
  --name "Alice"

# Output:
# 🔷 Linera Executor
# ==================
# Wallet: /home/user/.config/linera/wallet.json
# Storage: rocksdb:/home/user/.config/linera/wallet.db
# Chain ID: ce05009e4ffaef77689fe3c26f08494f13feb7b18ae60d44dec76799988efbb1
# App ID: 640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
#
# 📝 Registering voter...
#   Stake: 1000
#   Name: Some("Alice")
#   Metadata URL: None
#
# ⚠️  Direct operation execution not yet implemented in Linera CLI
# ⚠️  Using workaround: GraphQL mutation (returns instructions only)
#
# Operation prepared:
# {
#   "RegisterVoter": {
#     "stake": "1000",
#     "name": "Alice",
#     "metadata_url": null
#   }
# }
#
# Operation file saved to: /tmp/linera_op_12345.json
```

## Next Steps

Untuk mengimplementasikan proper execution:

### 1. Implement SDK Integration

```rust
// executor.rs
use linera_sdk::*;

impl LineraExecutor {
    pub async fn execute_operation(&self, operation: Operation) -> Result<String> {
        // Load wallet
        let wallet = Wallet::from_file(&self.wallet_path)?;
        
        // Load storage
        let storage = Storage::from_path(&self.storage_path)?;
        
        // Create chain client
        let chain_id = ChainId::from_str(&self.chain_id)?;
        let client = ChainClient::new(chain_id, wallet, storage)?;
        
        // Execute operation
        let result = client.execute_operation(operation).await?;
        
        Ok(format!("Operation executed: {:?}", result))
    }
}
```

### 2. Implement Block Creation

```rust
pub async fn create_block_with_operation(
    &self,
    operation: Operation,
) -> Result<BlockProposal> {
    // Create block proposal
    let block = BlockProposal {
        operations: vec![operation],
        height: self.get_next_height().await?,
        timestamp: SystemTime::now(),
        ...
    };
    
    // Sign block
    let signed_block = self.sign_block(block)?;
    
    // Submit to validators
    self.submit_block(signed_block).await?;
    
    Ok(signed_block)
}
```

### 3. Implement Message Sending

```rust
pub async fn send_message(
    &self,
    target_chain: ChainId,
    message: Message,
) -> Result<()> {
    // Create message with authentication
    let authenticated_message = AuthenticatedMessage {
        message,
        sender: self.chain_id,
        target: target_chain,
        ...
    };
    
    // Send message
    self.client.send_message(authenticated_message).await?;
    
    Ok(())
}
```

## Troubleshooting

### "Direct operation execution not yet implemented"

Ini adalah limitasi saat ini. Untuk mengeksekusi operasi, gunakan salah satu:
1. `linera project test` (untuk testing)
2. Backend API dengan proper SDK integration
3. Manual block creation

### "Failed to connect to Linera service"

Pastikan Linera service running:
```bash
linera service --port 8080 &
```

### "Failed to read wallet"

Pastikan wallet path benar:
```bash
ls ~/.config/linera/wallet.json
```

## Contributing

Untuk mengimplementasikan proper execution:

1. Fork repository
2. Implement SDK integration di `executor.rs`
3. Add tests
4. Submit PR

## License

MIT OR Apache-2.0

## References

- [Linera SDK Documentation](https://docs.rs/linera-sdk/)
- [Linera Protocol](https://linera.io)
- [Oracle Registry v2](../oracle-registry-v2/)

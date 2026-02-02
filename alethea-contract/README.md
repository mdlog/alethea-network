<div align="center">
  
  # 🏛️ Alethea Contract

  **Smart Contracts for Alethea Oracle Network on Linera Blockchain**

  [![Status](https://img.shields.io/badge/status-testnet%20ready-blue)]()
  [![Version](https://img.shields.io/badge/version-3.4.0-blue)]()
  [![Network](https://img.shields.io/badge/network-linera%20conway-purple)]()
  [![License](https://img.shields.io/badge/license-MIT-blue)]()
</div>

---

## 🆕 Latest Updates (v3.4.0 - February 2026)

### Current Status
- **Oracle Resolution Network**: Fully operational on Conway Testnet
- **Commit-Reveal Voting**: Secure two-phase voting system
- **Stake-Weighted Consensus**: Reputation-based voting power
- **Cross-Chain Ready**: Hub-and-spoke architecture for DApp integration
- **Consumer SDK**: Easy integration for external applications

### Key Features
- ✅ Voter registration with minimum 100 ALTH stake
- ✅ Query creation with customizable outcomes and rewards
- ✅ Automatic resolution after reveal phase
- ✅ Reward distribution to correct voters
- ✅ Slashing mechanism for incorrect votes (5%)
- ✅ Reputation system with 4 tiers (Novice → Master)

---

## 📦 Components

| Component | Description |
|-----------|-------------|
| `oracle-registry-v2/` | Core oracle contract with voter registration, query management, commit-reveal voting, dispute handling |
| `alethea-token/` | ALTH token contract with stake management and authorized minting/burning |
| `simple-market/` | Minimal prediction market for testing oracle resolution callbacks |
| `alethea-oracle-messages/` | **Industry-standard** shared message types for cross-chain communication |
| `alethea-oracle-sdk/` | TypeScript SDK for DApp integration |
| `alethea-consumer-sdk/` | Rust SDK for contract integration |
| `market-chain/` | Legacy prediction market with AMM (reference) |
| `integration-tests/` | Integration test suite |

---

## 🏗️ Architecture

### Oracle Registry v2 (Core)

```
Oracle Registry v2
├── Voter Registration
│   ├── Stake Management (stake, lockedStake, withdrawableBalance)
│   ├── Reputation System (0-100, tiers: Novice → Master)
│   └── Two-Step Reward Claiming
│
├── Query Management
│   ├── Legacy CreateQuery (backward compatible)
│   ├── CreateQueryWithBond (Industry Standard)
│   │   ├── bond_amount (refundable)
│   │   ├── priority_fee (non-refundable)
│   │   ├── dispute_window_secs
│   │   └── metadata (resolution_criteria, source_urls, category)
│   └── Question Types (Boolean, SingleSelect, Numeric, MultipleSelect)
│
├── Voting
│   ├── Commit-Reveal (keccak256)
│   ├── Decision Strategies (Majority, Median, WeightedByStake, WeightedByReputation)
│   └── Voter Selection (by stake/reputation)
│
├── Resolution & Disputes
│   ├── QueryResolved (is_final, dispute_window_end)
│   ├── QueryFinalized (safe for settlement)
│   ├── RaiseDispute (challenge mechanism)
│   └── DisputeResolved (final result)
│
└── Callbacks (Industry Standard)
    ├── QueryCreated (with estimated_resolution)
    ├── QueryResolved (with is_final flag)
    ├── QueryFinalized (after dispute window)
    ├── QueryDisputed (challenge notification)
    ├── DisputeResolved (final after challenge)
    ├── QueryExpired (with bond_refunded)
    └── QueryCancelled (with bond_refunded)
```

### Cross-Chain Message Flow

```
┌────────────────┐   CreateQueryWithBond    ┌─────────────────────┐
│  Market/DApp   │ ─────────────────────────►│   Oracle Registry   │
│                │   bond=100, fee=10       │                     │
└────────────────┘                          └─────────────────────┘
        │                                            │
        │◄─────────── QueryCreated ──────────────────│
        │         (dispute_window_end=...)           │
        │                                            │
        │           [Voters vote...]                 │
        │                                            │
        │◄─────────── QueryResolved ─────────────────│
        │         (is_final=false)                   │
        │                                            │
        │     [1 hour dispute window]                │
        │                                            │
    ┌───┴─── NO DISPUTE ────────────────────┐        │
    │   │◄────── QueryFinalized ────────────│────────│
    │   │     (SAFE TO SETTLE!)             │        │
    │   │                                   │        │
    └───┴───── DISPUTE RAISED ──────────────┘        │
        │◄─────────── QueryDisputed ─────────────────│
        │                                            │
        │      [Re-voting for dispute]               │
        │                                            │
        │◄─────────── DisputeResolved ───────────────│
        │         (final_result, winner)             │
        └────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### Token Contract Authorization
```rust
// MintReward - Only authorized registry can mint
Message::MintReward { .. } => {
    if caller_id != registry_app_id {
        return; // REJECTED
    }
    // Proceed with minting
}

// BurnSlash - Only authorized registry can burn
Message::BurnSlash { .. } => {
    if caller_id != registry_app_id {
        return; // REJECTED
    }
    // Proceed with burning
}
```

### Two-Step Reward Claiming
```
┌─────────────┐   claimRewards()   ┌──────────────────┐   claimWithdrawableTokens()   ┌──────────┐
│   Pending   │ ──────────────────►│   Withdrawable   │ ────────────────────────────►│  Wallet  │
│   Rewards   │                    │    Balance       │                              │ (Tokens) │
└─────────────┘                    └──────────────────┘                              └──────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Rust toolchain (see `rust-toolchain.toml`)
- Linera CLI installed
- wasm32-unknown-unknown target

### Build

```bash
# Build all contracts
cargo build --release --target wasm32-unknown-unknown

# Build specific contract
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2
cargo build --release --target wasm32-unknown-unknown -p alethea-token
cargo build --release --target wasm32-unknown-unknown -p simple-market
```

### Deploy

#### Option 1: Use Automated Deployment Script (Recommended)

```bash
cd alethea-contract

# Deploy to Conway Testnet (default)
./scripts/deploy-complete-system.sh

# Or deploy to local network
./scripts/deploy-complete-system.sh --local
```

The script will:
1. Check/create wallet with valid owner
2. Build both contracts (ALTH Token + Oracle Registry V2)
3. Publish and create applications on the blockchain
4. Output environment variables for dashboard

#### Option 2: Manual Deployment

```bash
# Build contracts
cargo build --release --target wasm32-unknown-unknown

# Start Linera service
linera service --port 8080 &

# Deploy Token
linera publish-and-create \
    target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    target/wasm32-unknown-unknown/release/alethea-token-service.wasm \
    --json-parameters '{"name":"Alethea","symbol":"ALTH","decimals":18,...}' \
    --json-argument '{"accounts":{"0x...":"1000000000."},"admin":"0x..."}'

# Deploy Registry
linera publish-and-create \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
    --json-parameters '{}' \
    --json-argument '"Hub"'
```

### Current Deployment (Conway Testnet - February 2026)

| Contract | Application ID |
|----------|----------------|
| **Oracle Registry V2** | `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990` |
| **ALTH Token** | `dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd` |
| **Chain ID** | `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec` |

**Network:** Linera Conway Testnet  
**RPC:** `https://rpc.testnet-conway.linera.net`  
**Faucet:** `https://faucet.testnet-conway.linera.net`

**GraphQL Endpoints:**
- Registry: `POST /chains/9d0d233f.../applications/f51da82d...`
- Token: `POST /chains/9d0d233f.../applications/dac6b92...`

---

## 📘 SDK Usage

### TypeScript SDK (for DApps)

```typescript
import { ExternalDAppClient } from 'alethea-oracle-sdk';

const client = new ExternalDAppClient({
    // Conway Testnet (February 2026)
    registryId: 'f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990',
    chainId: '9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec',
    callbackChainId: 'your-dapp-chain-id',
    callbackAppId: 'your-dapp-app-id',
});

// Create query with bond (Industry Standard - Recommended)
const result = await client.createQueryWithBond({
    description: 'Did BTC close above $100,000 on January 5, 2026?',
    outcomes: ['Yes', 'No'],
    bondAmount: '100',       // 100 ALTH (refundable)
    priorityFee: '10',       // 10 ALTH (non-refundable)
    durationSecs: 3600,
    resolutionCriteria: 'Use CoinGecko BTC/USD price at exactly 00:00 UTC',
    sourceUrls: 'https://coingecko.com/btc',
    category: 'Crypto',
});

// Subscribe to resolution
const unsubscribe = await client.subscribeToResolution(
    result.queryId,
    (resolution, error) => {
        if (resolution) {
            // Check if result is final before acting
            if (resolution.is_final) {
                console.log('Final result:', resolution.result);
                // Safe to settle
            }
        }
    }
);
```

### Rust SDK (for Contracts)

```rust
use alethea_oracle_messages::{OracleRequest, OracleCallback};

// Send resolution request with bond
let request = OracleRequest::CreateQueryWithBond {
    request_id: market_id,
    description: question,
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    deadline: resolution_deadline,
    callback_chain: self.runtime.chain_id(),
    callback_app: self.runtime.application_id(),
    callback_data: encode_request_id(market_id),
    bond_amount: Amount::from_tokens(100),
    priority_fee: Some(Amount::from_tokens(10)),
    dispute_window_secs: Some(3600),
    // ... other fields
};

// Handle callback - wait for finalization!
async fn execute_message(&mut self, message: Message) {
    if let Message::OracleCallback(callback) = message {
        match callback {
            OracleCallback::QueryResolved { is_final, result, .. } => {
                if is_final {
                    // Safe to settle
                    self.settle_market(result).await;
                } else {
                    // Wait for QueryFinalized
                    self.mark_pending(result).await;
                }
            }
            OracleCallback::QueryFinalized { result, .. } => {
                // Definitely safe to settle
                self.settle_market(result).await;
            }
            // ... handle other callbacks
        }
    }
}
```

---

## 🔧 Environment Files

| File | Purpose |
|------|---------|
| `.env.fresh` | Main environment with chain IDs and app IDs |
| `.env.registry-v2` | Oracle Registry v2 specific config |
| `.env.simple-market` | Simple Market specific config |

---

## 📖 Documentation

- [Oracle Registry Guide](oracle-registry-v2/REGISTRATION_GUIDE.md)
- [Oracle Messages Reference](alethea-oracle-messages/README.md)
- [SDK Documentation](alethea-oracle-sdk/README.md)
- [Simple Market Guide](simple-market/README.md)
- [Integration Guide](docs/alethea-network/INTEGRATION_TEST_GUIDE.md)

---

## 🔄 Version History

| Version | Changes |
|---------|---------|
| v2.3.0 | Industry-standard formats, dispute mechanism, security fixes |
| v2.2.0 | Hub-and-Spoke architecture, consumer app registration |
| v2.1.0 | Hybrid model with bonds, query metadata |
| v2.0.0 | Account-based registry (oracle-registry-v2) |
| v1.x | Legacy application-based registry |

---

## 🔗 Related Repositories

- **Dashboard**: [alethea-dashboard-vite](../alethea-dashboard-vite) - Voter dashboard and admin interface

---

## 📄 License

MIT License

---

<div align="center">
  
  **Built with ❤️ on Linera Blockchain**
  
  *Industry-Standard Oracle Infrastructure*
  
</div>

<div align="center">

<img src="logo.png" alt="Alethea Network Logo" width="200"/>

# Alethea Network

**Decentralized Oracle Resolution Network on Linera Blockchain**

[![Status](https://img.shields.io/badge/status-testnet%20ready-blue)]()
[![Version](https://img.shields.io/badge/version-3.4.0-blue)]()
[![Network](https://img.shields.io/badge/network-linera%20conway-purple)]()
[![Token](https://img.shields.io/badge/token-ALTH-gold)]()

</div>

---

## What is Alethea?

Alethea Network is a **decentralized oracle platform** that provides consensus-based data verification and query resolution for DApps on Linera blockchain.

**Key Features:**
- 🔐 **Commit-Reveal Voting** - Secure two-phase voting system
- 💰 **Stake-Weighted Consensus** - Votes weighted by staked tokens
- 🎯 **Reputation System** - Accuracy-based voter scoring
- 🔗 **Cross-Chain Ready** - Hub-and-spoke architecture
- 📦 **Consumer SDK** - Easy integration for DApps

---

## Quick Start

### 1. Start Linera Service
```bash
linera service --port 8080
```

### 2. Run Oracle Dashboard
```bash
cd alethea-dashboard-vite
npm install && npm run dev
# Open http://localhost:4002
```

---

## Current Deployment (Conway Testnet)

| Contract | Application ID |
|----------|----------------|
| **Oracle Registry** | `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990` |
| **ALTH Token** | `dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd` |

**Chain ID:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

**Network:** Linera Conway Testnet  
**RPC:** `https://rpc.testnet-conway.linera.net`  
**Faucet:** `https://faucet.testnet-conway.linera.net`

---

## How It Works

### 1. Query Creation
DApps create queries with outcomes and rewards:
```rust
CreateQuery {
    description: "Will BTC reach $100k?",
    outcomes: ["Yes", "No"],
    reward_amount: 100 ALTH,
    min_votes: 3
}
```

### 2. Commit-Reveal Voting
Voters participate in two phases:
- **Commit Phase**: Submit vote hash (prevents front-running)
- **Reveal Phase**: Reveal actual vote with salt

### 3. Resolution
Query is resolved when:
- ✅ Reveal phase ends
- ✅ Minimum votes met
- ✅ Consensus reached

**Result:** Winning outcome determined, rewards distributed, callbacks sent.

---

## Voting & Rewards

### Stake Requirements
- **Minimum Stake:** 100 ALTH
- **Stake Locking:** 10% locked per active vote
- **Slashing:** 5% penalty for incorrect votes

### Reward Distribution
```
voter_reward = (voter_stake / total_correct_stake) × total_reward
```

### Reputation Tiers
| Tier | Score | Weight Multiplier |
|------|-------|-------------------|
| Master | 91-100 | 1.7x - 2.0x |
| Expert | 71-90 | 1.35x - 1.7x |
| Intermediate | 41-70 | 0.9x - 1.35x |
| Novice | 0-40 | 0.5x - 0.9x |

---

## Integration Guide

### For DApp Developers

**1. Add Dependencies:**
```toml
[dependencies]
alethea-consumer-sdk = { path = "../alethea-consumer-sdk" }
alethea-oracle-messages = { path = "../alethea-oracle-messages" }
```

**2. Create Query:**
```rust
use alethea_oracle_messages::OracleRequest;

let request = OracleRequest::CreateQueryWithCallback {
    description: "Your query".to_string(),
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    reward_amount: Amount::from_tokens(100),
    // ...
};

self.send_message(oracle_chain_id, request);
```

**3. Handle Callback:**
```rust
match message {
    OracleCallback::QueryResolved { query_id, result } => {
        // Process oracle result
        self.handle_resolution(query_id, result);
    }
    _ => {}
}
```

---

## Architecture

```
                    HUB CHAIN
              (Oracle Registry)
                     |
        +------------+------------+
        |            |            |
    User Chain   Consumer App   DApps
        |            |            |
    - Vote       - Query       - Custom
    - Stake      - Callback    - Logic
    - Claim      - Resolve
```

---

## Repository Structure

```
alethea-network/
├── alethea-contract/           # Smart Contracts (Rust)
│   ├── oracle-registry-v2/     # Main oracle contract
│   ├── alethea-token/          # ALTH token
│   ├── alethea-consumer-sdk/   # Integration SDK
│   └── scripts/                # Deployment scripts
│
├── alethea-dashboard-vite/     # Oracle Dashboard (React)
│   ├── src/components/         # UI components
│   ├── src/contexts/           # State management
│   └── src/pages/              # Dashboard pages
│
├── docs/                       # Documentation
└── src/                        # Additional sources
```

---

## API Reference

### GraphQL Queries

```graphql
# Get all queries
query {
  queries {
    id
    description
    outcomes
    status
    result
  }
}

# Get voter profile
query {
  voterProfile(address: "CHAIN_ID") {
    stake
    reputation
    totalVotes
    correctVotes
  }
}
```

### GraphQL Mutations

```graphql
# Register as voter
mutation {
  sendRegisterVoterMessage(
    targetChain: "REGISTRY_CHAIN_ID"
    stake: "100"
  )
}

# Commit vote
mutation {
  sendCommitVoteMessage(
    targetChain: "REGISTRY_CHAIN_ID"
    queryId: 1
    commitHash: "0x..."
  )
}

# Reveal vote
mutation {
  sendRevealVoteMessage(
    targetChain: "REGISTRY_CHAIN_ID"
    queryId: 1
    outcome: "Yes"
    salt: "random_salt"
  )
}
```

---

## Technology Stack

**Frontend:** React 19 • Vite 6 • TypeScript • TailwindCSS  
**Blockchain:** Linera SDK 0.15.6 • WASM Client  
**Contracts:** Rust • WebAssembly • GraphQL

---

## Development

### Build Contracts
```bash
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown
```

### Deploy
```bash
./scripts/deploy-complete-system.sh
```

### Run Tests
```bash
cargo test
```

---

## Resources

- **Dashboard:** [alethea-dashboard-vite/README.md](./alethea-dashboard-vite/README.md)
- **Consumer SDK:** [alethea-contract/alethea-consumer-sdk/README.md](./alethea-contract/alethea-consumer-sdk/README.md)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Linera Docs:** https://docs.linera.io

---

## License

MIT License

---

<div align="center">

**Built on Linera Blockchain**

[Dashboard](http://localhost:4002) • [GitHub](https://github.com/mdlog/alethea-network) • [Contracts](./alethea-contract/)

</div>

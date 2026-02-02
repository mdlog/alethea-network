<div align="center">

<img src="logo.png" alt="Alethea Network Logo" width="200"/>

# Alethea Network

**Decentralized Oracle Network & Prediction Market Platform on Linera Blockchain**

[![Status](https://img.shields.io/badge/status-testnet%20ready-blue)]()
[![Version](https://img.shields.io/badge/version-3.4.0-blue)]()
[![Network](https://img.shields.io/badge/network-linera%20conway-purple)]()
[![Token](https://img.shields.io/badge/token-ALTH-gold)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

</div>

---

## Overview

Alethea Network is a **decentralized oracle platform** built on Linera blockchain, providing consensus-based resolution for prediction markets and DApps. The platform features:

- **Decentralized Oracle**: Commit-reveal voting with stake-weighted consensus
- **Prediction Markets**: Binary (Yes/No) markets with oracle resolution
- **Real Token Integration**: ALTH token for staking and rewards
- **Hub-and-Spoke Architecture**: Scalable cross-chain communication
- **Reputation System**: Accuracy-based voter scoring and rewards

---

## Applications

| Application | Description | Port | Status |
|-------------|-------------|------|--------|
| [alethea-dashboard-vite](./alethea-dashboard-vite/) | **Oracle Dashboard** - Voter registration, staking, queries, voting | 4002 | Active |
| [alethea-market](./alethea-market/) | **Prediction Market** - Binary markets with oracle resolution | 4004 | Active |
| [alethea-contract](./alethea-contract/) | **Smart Contracts** - Oracle registry, token, market contracts | - | Deployed |
| [alethea-explorer](./alethea-explorer/) | **Blockchain Explorer** - Network monitoring (Next.js) | 3000 | In Progress |

---

## Architecture

```
Alethea Network
├── alethea-dashboard-vite/          # Oracle Dashboard (Vite + React)
│   ├── src/
│   │   ├── components/              # UI components
│   │   │   ├── VoteModal.tsx        # Commit-reveal voting
│   │   │   ├── RegisterModal.tsx    # Voter registration
│   │   │   ├── StakeInterface.tsx   # Token staking
│   │   │   ├── TokenFaucet.tsx      # Test token faucet
│   │   │   └── ClaimRewards.tsx     # Reward claiming
│   │   ├── contexts/
│   │   │   ├── LineraContext.tsx    # WASM client & wallet
│   │   │   └── TokenContext.tsx     # Token state management
│   │   └── pages/
│   │       ├── HomePage.tsx         # Dashboard & active queries
│   │       ├── VotersPage.tsx       # Voter leaderboard
│   │       ├── QueriesPage.tsx      # Query creation & voting
│   │       ├── ProfilePage.tsx      # User profile & stakes
│   │       ├── TokenPage.tsx        # Token management
│   │       └── DocsPage.tsx         # API documentation
│   └── .env.local                   # Environment config
│
├── alethea-market/                  # Prediction Market (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreateMarketModal.tsx
│   │   │   ├── BetModal.tsx
│   │   │   └── CallbackMonitor.tsx
│   │   ├── contexts/
│   │   │   └── LineraContext.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── MarketsPage.tsx
│   │   │   └── MarketDetailPage.tsx
│   │   └── hooks/
│   │       └── useOracleQuery.ts
│   └── .env.local
│
├── alethea-contract/                # Smart Contracts (Rust)
│   ├── oracle-registry-v2/          # Main oracle registry
│   ├── simple-market/               # Prediction market contract
│   ├── alethea-token/               # ALTH token contract
│   ├── alethea-oracle-messages/     # Shared message types
│   ├── alethea-oracle-types/        # Shared data types
│   ├── alethea-consumer-sdk/        # SDK for consumer apps
│   └── scripts/                     # Deployment scripts
│
└── linera-protocol/                 # Linera SDK (submodule)
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **Linera CLI** (`cargo install linera-service`)
- **Rust** (for contract development)

### 1. Start Linera Service

```bash
# Connect to Conway testnet
linera service --port 8080
```

### 2. Start Oracle Dashboard

```bash
cd alethea-dashboard-vite
npm install
npm run dev
# Open http://localhost:4002
```

### 3. Start Prediction Market (Optional)

```bash
cd alethea-market
npm install
npm run dev
# Open http://localhost:4004
```

---

## Current Deployment

### Conway Testnet (February 2026)

| Parameter | Value |
|-----------|-------|
| **Network** | Linera Conway Testnet |
| **RPC** | `https://rpc.testnet-conway.linera.net` |
| **Faucet** | `https://faucet.testnet-conway.linera.net` |

### Contract IDs

| Contract | Chain ID | Application ID |
|----------|----------|----------------|
| **Oracle Registry** | `9d0d233f...` | `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990` |
| **ALTH Token** | `9d0d233f...` | `dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd` |
| **Simple Market** | `9d0d233f...` | `afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1` |

Full Chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

### ALTH Token

| Parameter | Value |
|-----------|-------|
| **Name** | Alethea |
| **Symbol** | ALTH |
| **Decimals** | 18 |
| **Faucet Amount** | 1,000 ALTH per request |

---

## Smart Contracts

### Oracle Registry v2

The main oracle contract implementing:

- **Voter Registration**: Register with stake (min 100 ALTH)
- **Query Management**: Create queries with outcomes and rewards
- **Commit-Reveal Voting**: Two-phase secure voting
- **Resolution**: Automatic query resolution with reward distribution
- **Reputation System**: 4-tier accuracy-based scoring (Novice → Intermediate → Expert → Master)
- **Slashing**: 5% stake penalty for incorrect votes

**Key Operations:**
```
RegisterVoter / RegisterVoterFor
CreateQuery / CreateQueryWithCallback
CommitVote / RevealVote
ResolveQuery
ClaimRewards
UpdateStake / WithdrawStake
```

### Simple Market

Binary prediction market contract:

- **Market Creation**: Yes/No questions with end time
- **Betting**: Place bets on outcomes
- **Oracle Integration**: Request resolution from Oracle Registry
- **Payout**: Distribute winnings based on oracle result

**Key Operations:**
```
CreateMarket
PlaceBet
RequestResolution
ClaimPayout
```

### ALTH Token

Standard fungible token with:

- **Transfer**: Standard token transfers
- **Staking Integration**: Transfer to registry for staking
- **Minting**: Admin-controlled minting
- **Cross-chain**: Secure cross-chain transfers

---

## Features

### Oracle Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| **Wallet Connection** | Active | WASM-based wallet with IndexedDB storage |
| **Token Faucet** | Active | Request 1,000 ALTH test tokens |
| **Voter Registration** | Active | Register with 100+ ALTH stake |
| **Query Creation** | Active | Create queries with rewards |
| **Commit-Reveal Voting** | Active | Secure two-phase voting |
| **Auto-Resolution** | Active | Automatic query resolution |
| **Reward Claiming** | Active | Claim pending rewards |
| **Stake Management** | Active | Add/withdraw stake |
| **Reputation System** | Active | Accuracy-based scoring |

### Prediction Market

| Feature | Status | Description |
|---------|--------|-------------|
| **Market Creation** | Active | Create Yes/No prediction markets |
| **Betting** | Active | Place bets with odds calculation |
| **Oracle Integration** | Active | Request resolution via oracle |
| **Callback Monitor** | Active | Track oracle query status |
| **Payout System** | Active | Claim winnings after resolution |

---

## Voting System

### Commit-Reveal Protocol

1. **Commit Phase**: Voters submit hash of vote (`keccak256(outcome + salt)`)
2. **Reveal Phase**: Voters reveal actual vote and salt
3. **Resolution**: Auto-resolved after reveal phase ends

### Stake Locking

When committing to a query, 10% of available stake is locked:
```
stake_to_lock = available_stake / 10
available_stake = total_stake - locked_stake
```

### Reward Distribution (WeightedByStake)

Rewards distributed proportionally based on stake:
```
voter_reward = (voter_stake / total_correct_voters_stake) * total_reward
```

### Reputation Tiers

| Tier | Score Range | Weight Multiplier |
|------|-------------|-------------------|
| Master | 91-100 | 1.7x - 2.0x |
| Expert | 71-90 | 1.35x - 1.7x |
| Intermediate | 41-70 | 0.9x - 1.35x |
| Novice | 0-40 | 0.5x - 0.9x |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.1 | UI Framework |
| Vite | 6.2.0 | Build Tool |
| TypeScript | 5.8.2 | Type Safety |
| TailwindCSS | 3.4.1 | Styling |
| React Router | 7.1.0 | Routing |
| @linera/client | 0.15.6 | WASM Blockchain Client |
| @linera/signer | 0.15.6 | Wallet Signing |
| ethers | 6.13.0 | Mnemonic Generation |
| Recharts | 2.12.7 | Charts (Dashboard) |
| Lucide React | 0.556.0 | Icons |

### Smart Contracts

| Technology | Version | Purpose |
|------------|---------|---------|
| Rust | 1.75+ | Contract Language |
| linera-sdk | 0.15.6 | Linera SDK |
| async-graphql | 7.0 | GraphQL API |
| serde | 1.0 | Serialization |
| sha2 | 0.10 | Hashing |
| WebAssembly | wasm32 | Target Platform |

---

## Environment Configuration

### Dashboard (.env.local)

```env
# Alethea Dashboard - Conway Testnet
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net

# Chain Configuration
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Oracle Registry
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990

# ALTH Token
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
VITE_TOKEN_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Service URL (empty for Vite proxy)
VITE_SERVICE_URL=
```

### Market (.env.local)

```env
# Alethea Market - Conway Testnet
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net

# Chain Configuration
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Simple Market Contract
VITE_MARKET_APP_ID=afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1

# Oracle Registry
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_REGISTRY_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

---

## User Guide

### 1. Connect Wallet

- Open dashboard at `http://localhost:4002`
- Click "Create Wallet" (generates WASM-based wallet)
- Wallet stored in browser's IndexedDB

### 2. Get Test Tokens

- Click "Token Faucet" in header
- Request 1,000 ALTH tokens
- Wait for cross-chain transfer
- Click refresh to update balance

### 3. Register as Voter

- Navigate to "Voters" page
- Click "Register as Voter"
- Enter stake amount (min 100 ALTH)
- Confirm transaction

### 4. Vote on Queries

- Go to "Home" or "Queries" page
- Select active query
- **Commit Phase**: Submit vote hash
- **Reveal Phase**: Reveal actual vote

### 5. Claim Rewards

- Go to "Profile" page
- View pending rewards
- Click "Claim Rewards"
- Rewards added to stake

---

## API Reference

### GraphQL Endpoints

```
# Registry (Oracle)
POST /chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID}

# Token
POST /chains/{USER_CHAIN_ID}/applications/{TOKEN_APP_ID}

# Market
POST /chains/{CHAIN_ID}/applications/{MARKET_APP_ID}
```

### Common Queries

```graphql
# Get network statistics
query {
  statistics {
    totalVoters
    activeVoters
    totalQueriesCreated
    totalQueriesResolved
  }
  totalStake
}

# Get all queries
query {
  queries {
    id
    description
    outcomes
    status
    commitEnd
    revealEnd
    voteCount
    result
  }
}

# Get voter profile
query {
  voterProfile(address: "CHAIN_ID") {
    stake
    lockedStake
    reputation
    totalVotes
    correctVotes
  }
}
```

### Common Mutations

```graphql
# Create query
mutation {
  createQuery(
    description: "Will BTC reach $100k?"
    outcomes: ["Yes", "No"]
    strategy: "WeightedByStake"
    minVotes: 1
    rewardAmount: "100"
    durationSecs: 3600
  )
}

# Register voter
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
    commitHash: "..."
  )
}
```

---

## Cross-Chain Communication

### Hub-and-Spoke Architecture

```
                    HUB CHAIN
              (Oracle Registry)
                     |
                     |  Cross-chain Messages
                     |
        +------------+------------+
        |            |            |
    User Chain   Market Chain   Other Apps
        |            |            |
    - Vote       - Create      - Custom
    - Stake      - Bet         - Logic
    - Claim      - Resolve
```

### Message Types

**OracleRequest** (Market -> Registry):
- `CreateQuery` - Request oracle resolution
- `CreateQueryWithBond` - With bond and priority fee

**OracleCallback** (Registry -> Market):
- `QueryCreated` - Query registered
- `QueryResolved` - Resolution complete
- `QueryExpired` - No resolution

---

## Contract Deployment

### Build Contracts

```bash
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown
```

### Deploy

```bash
# Use deployment script
./scripts/deploy-complete-system.sh

# Or deploy individually
linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
  --json-argument '{"min_stake": 100000000, "min_votes_default": 1}'
```

---

## Troubleshooting

### Common Issues

**Vote not recorded:**
- Ensure using WASM client (not HTTP)
- Cross-chain messages need time to propagate
- Check browser console for errors

**Insufficient stake:**
- Stake locked in active queries
- Wait for queries to resolve
- Add more stake via Profile page

**Balance not updating:**
- Cross-chain transfer in progress
- Click refresh button
- Process inbox: `mutation { processInbox(chainId: "...") }`

**Market not resolving:**
- Ensure Oracle Registry has voters
- Check if query was created
- Monitor callback events

---

## Development

### Project Structure

```bash
# Clone repository
git clone https://github.com/your-org/alethea-network.git

# Install dashboard dependencies
cd alethea-dashboard-vite && npm install

# Install market dependencies
cd ../alethea-market && npm install

# Build contracts
cd ../alethea-contract && cargo build --release
```

### Running Tests

```bash
# Contract tests
cd alethea-contract
cargo test

# Integration tests
cd alethea-contract/oracle-registry-v2
./run_integration_tests.sh
```

---

## Resources

- **Dashboard Docs**: [alethea-dashboard-vite/README.md](./alethea-dashboard-vite/README.md)
- **Architecture**: [alethea-architecture-complete.md](./alethea-architecture-complete.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Linera Docs**: https://docs.linera.io

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built on Linera Blockchain**

*Decentralized Oracle Network | Conway Testnet | Active Development*

[Dashboard](http://localhost:4002) | [Market](http://localhost:4004) | [Contracts](./alethea-contract/)

</div>

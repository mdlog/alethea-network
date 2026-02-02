# Alethea Network - Complete Architecture Documentation
## Decentralized Resolution Oracle Market on Linera Blockchain

**Version:** 3.0  
**Last Updated:** December 17, 2025  
**Status:** Production Ready (Conway Testnet)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Components](#architecture-components)
4. [Smart Contract Architecture](#smart-contract-architecture)
5. [Oracle Resolution Protocol](#oracle-resolution-protocol)
6. [Economic Model](#economic-model)
7. [Frontend Dashboard](#frontend-dashboard)
8. [API Reference](#api-reference)
9. [Deployment Information](#deployment-information)

---

## Executive Summary

### What is Alethea Network?

**Alethea Network is a decentralized resolution oracle marketplace built on Linera blockchain**, providing consensus-based resolution for prediction markets and DApps.

**Key Features:**
- 🎯 **Decentralized Resolution**: Commit-reveal voting with stake-weighted consensus
- 💰 **Cost Efficient**: Minimal fees on Linera microchains
- 🚀 **Scalable**: Parallel processing via Linera microchain architecture
- 🛡️ **Secure**: Commit-reveal + reputation-based voting prevents manipulation
- 📊 **Transparent**: Full audit trail on-chain

### Current Deployment (Conway Testnet - Dec 17, 2025)

| Component | Value |
|-----------|-------|
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| ALTH Token App ID | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |
| Oracle Registry v2 App ID | `053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730` |
| Faucet URL | `https://faucet.testnet-conway.linera.net` |

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ALETHEA ORACLE NETWORK                      │
│                        (Linera Microchains)                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
        │  Prediction     │ │   DeFi      │ │  Smart       │
        │  Markets        │ │   Protocols │ │  Contracts   │
        │  (Consumers)    │ │ (Consumers) │ │  (Consumers) │
        └────────┬────────┘ └──────┬──────┘ └──────┬───────┘
                 │                 │                │
                 └─────────────────┼────────────────┘
                                   │
                          CREATE QUERY REQUEST
                          (Pay for resolution)
                                   │
                                   ▼
        ┌───────────────────────────────────────────────────┐
        │           REGISTRY CHAIN (Shared State)           │
        │                                                   │
        │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
        │  │ Queries  │  │  Voters  │  │ Resolutions  │    │
        │  │ Registry │  │ Registry │  │   Results    │    │
        │  └──────────┘  └──────────┘  └──────────────┘    │
        │                                                   │
        │  Chain ID: 36dd869563b74586a953019006de56c8...   │
        │  App ID:   053e39a7bb6c3fe0c034da47a7a35...      │
        └───────────────────────┬───────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │ User Chain  │ │ User Chain  │ │ User Chain  │
        │  (Alice)    │ │   (Bob)     │ │ (Charlie)   │
        │             │ │             │ │             │
        │ - Vote      │ │ - Vote      │ │ - Vote      │
        │ - Earn      │ │ - Earn      │ │ - Earn      │
        │ - Stake     │ │ - Stake     │ │ - Stake     │
        └─────────────┘ └─────────────┘ └─────────────┘
              ▲               ▲               ▲
              │               │               │
              └───────────────┴───────────────┘
                       VOTERS NETWORK
                (Provide Resolution Service)
```

### System Participants

#### 1. **Consumers (Prediction Markets, DApps)**
- **Role**: Request oracle resolution for their markets
- **Action**: Create queries, pay reward fees
- **Example**: Prediction markets, insurance protocols

#### 2. **Voters (Oracle Providers)**
- **Role**: Provide resolution service through voting
- **Action**: Stake tokens, commit/reveal votes, earn rewards
- **Requirements**: Minimum 100 ALTH tokens stake

#### 3. **Registry Chain**
- **Role**: Central coordination and shared state
- **Action**: Store queries, votes, resolutions, voter registry
- **Owner**: Protocol governance (admin chain)

#### 4. **User Chains (Voter Chains)**
- **Role**: Individual identity and operation execution
- **Action**: Execute vote operations via cross-chain messages
- **Owner**: Individual voters (Microcard pattern)

---

## Architecture Components

### Component Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Alethea Dashboard (Vite + React)           │  │
│  │                                                      │  │
│  │  - HomePage (Stats)      - QueriesPage (Voting)     │  │
│  │  - VotersPage (Registry) - ProfilePage (Stake)      │  │
│  │  - TokenPage (ALTH)      - DocsPage (API)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                            │  SDK LAYER                     │
│                            │                                │
│  ┌─────────────────┐  ┌───▼─────────────┐  ┌────────────┐  │
│  │ @linera/client  │  │ LineraContext   │  │ @linera/   │  │
│  │                 │  │                 │  │ signer     │  │
│  │ - WASM Client   │  │ - Wallet Mgmt   │  │            │  │
│  │ - Application   │  │ - Query/Mutate  │  │ - Mnemonic │  │
│  │ - Chain Conn    │  │ - Cross-Chain   │  │ - Signing  │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                            │  BLOCKCHAIN LAYER              │
│                            ▼                                │
│         ┌────────────────────────────┐                     │
│         │   Linera Validators        │                     │
│         │   (Conway Testnet)         │                     │
│         └──────────┬─────────────────┘                     │
│                    │                                        │
│     ┌──────────────┼──────────────────┐                    │
│     │              │                  │                     │
│     ▼              ▼                  ▼                     │
│ ┌────────┐   ┌──────────┐      ┌──────────┐               │
│ │Registry│   │User Chain│ ...  │User Chain│               │
│ │ Chain  │   │    1     │      │    N     │               │
│ └────────┘   └──────────┘      └──────────┘               │
│                                                             │
│  Smart Contracts (Rust/WebAssembly):                       │
│  - oracle-registry-v2 (Main Contract)                      │
│  - alethea-token (ALTH Token)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Architecture

### Oracle Registry v2 Contract

**Location**: `alethea-contract/oracle-registry-v2/`

#### State Structure

```rust
pub struct OracleRegistryV2 {
    // Voter management (chain-based - Microcard pattern)
    pub voters: MapView<ChainId, VoterInfo>,
    pub total_stake: RegisterView<Amount>,
    pub voter_count: RegisterView<u64>,
    
    // Query management
    pub next_query_id: RegisterView<u64>,
    pub queries: MapView<u64, Query>,
    pub active_queries: RegisterView<Vec<u64>>,
    
    // Voting records
    pub votes: MapView<(u64, ChainId), Vote>,
    pub vote_counts: MapView<u64, usize>,
    
    // Rewards
    pub reward_pool: RegisterView<Amount>,
    pub pending_rewards: MapView<ChainId, Amount>,
    pub total_rewards_distributed: RegisterView<Amount>,
    
    // Protocol
    pub parameters: RegisterView<ProtocolParameters>,
    pub protocol_treasury: RegisterView<Amount>,
    pub is_paused: RegisterView<bool>,
    pub admin: RegisterView<Option<ChainId>>,
}
```

#### Voter Info Structure

```rust
pub struct VoterInfo {
    pub chain_id: ChainId,           // Voter's chain ID (Microcard pattern)
    pub stake: Amount,               // Total staked amount
    pub locked_stake: Amount,        // Locked for active votes
    pub reputation: u32,             // 0-100 score
    pub total_votes: u64,            // Total votes submitted
    pub correct_votes: u64,          // Correct votes count
    pub registered_at: Timestamp,    // Registration time
    pub is_active: bool,             // Active status
    pub name: Option<String>,        // Display name
    pub metadata_url: Option<String>,// Profile metadata
}
```

#### Query Structure

```rust
pub struct Query {
    pub id: u64,
    pub description: String,
    pub outcomes: Vec<String>,
    pub strategy: DecisionStrategy,
    pub min_votes: usize,
    pub reward_amount: Amount,
    pub creator: ChainId,
    pub created_at: Timestamp,
    pub deadline: Timestamp,
    pub commit_phase_end: Timestamp,
    pub reveal_phase_end: Timestamp,
    pub phase: VotingPhase,
    pub status: QueryStatus,
    pub result: Option<String>,
    pub resolved_at: Option<Timestamp>,
    pub commits: BTreeMap<ChainId, VoteCommit>,
    pub votes: BTreeMap<ChainId, Vote>,
    pub selected_voters: Vec<ChainId>,
}
```

#### Decision Strategies

```rust
pub enum DecisionStrategy {
    Majority,              // Simple majority vote
    Median,                // Median value (numeric)
    WeightedByStake,       // Stake-proportional (DEFAULT)
    WeightedByReputation,  // Reputation-proportional
}
```

#### Operations

```rust
pub enum Operation {
    // Voter Operations
    RegisterVoter { stake, name, metadata_url },
    UpdateStake { additional_stake },
    WithdrawStake { amount },
    DeregisterVoter,
    
    // Query Operations
    CreateQuery { description, outcomes, strategy, min_votes, reward_amount, duration_secs },
    
    // Voting Operations (Commit-Reveal)
    CommitVote { query_id, commit_hash },
    RevealVote { query_id, value, salt, confidence },
    
    // Resolution
    ResolveQuery { query_id },
    AutoResolveQueries,
    
    // Rewards
    ClaimRewards,
    
    // Cross-Chain Messages
    SendRegisterVoterMessage { target_chain, stake, name, metadata_url },
    SendCommitVoteMessage { target_chain, query_id, commit_hash },
    SendRevealVoteMessage { target_chain, query_id, value, salt, confidence },
    SendCreateQueryMessage { target_chain, description, outcomes, strategy, ... },
    
    // Admin
    UpdateParameters { params },
    PauseProtocol,
    UnpauseProtocol,
}
```

#### Cross-Chain Messages

```rust
pub enum Message {
    RegisterVoter { sender_chain, stake, name, metadata_url },
    UpdateStake { sender_chain, additional_stake },
    SubmitVote { sender_chain, query_id, value, confidence },
    CommitVote { sender_chain, query_id, commit_hash },
    RevealVote { sender_chain, query_id, value, salt, confidence },
    CreateQuery { sender_chain, description, outcomes, strategy, ... },
    ClaimRewards,
    QueryResolutionCallback { query_id, resolved_outcome, resolved_at, callback_data },
}
```

#### Oracle Events (Cross-Chain Streaming)

```rust
pub enum OracleEvent {
    QueryCreated { query_id, description, outcomes, deadline, creator, min_votes },
    QueryResolved { query_id, result, resolved_at, total_votes, correct_voters },
    QueryExpired { query_id, expired_at, votes_received, min_votes_required },
    VoterRegistered { voter_chain, stake, name },
    VoterDeregistered { voter_chain, stake_returned },
    VoteCommitted { query_id, voter_chain, commit_hash },
    VoteRevealed { query_id, voter_chain, value },
    RewardsClaimed { voter_chain, amount },
    StakeUpdated { voter_chain, new_stake, change, is_increase },
}
```

### Protocol Parameters

```rust
pub struct ProtocolParameters {
    pub min_stake: Amount,           // 100 tokens default
    pub min_votes_default: usize,    // 3 votes default
    pub default_query_duration: u64, // 3600 seconds (1 hour)
    pub reward_percentage: u32,      // 1000 basis points (10%)
    pub slash_percentage: u32,       // 500 basis points (5%)
    pub protocol_fee: u32,           // 100 basis points (1%)
}
```

---

## Oracle Resolution Protocol

### Commit-Reveal Voting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY RESOLUTION LIFECYCLE                   │
└─────────────────────────────────────────────────────────────────┘

Phase 1: QUERY CREATION
│
│   Consumer creates query with:
│   - Description (question)
│   - Outcomes (e.g., ["Yes", "No"])
│   - Strategy (WeightedByStake default)
│   - Reward amount
│   - Duration (split 50/50 commit/reveal)
│
├─────────────────────────────────────────────────────────────────

Phase 2: COMMIT PHASE (50% of duration)
│
│   Voters submit commit hashes:
│   commit_hash = keccak256(outcome + salt)
│   
│   - Votes are hidden (only hash visible)
│   - 10% of available stake locked per vote
│   - No one knows others' votes yet
│
├─────────────────────────────────────────────────────────────────

Phase 3: REVEAL PHASE (50% of duration)
│
│   Voters reveal their votes:
│   - Submit (outcome + salt)
│   - Contract verifies hash matches commit
│   - Invalid reveals rejected
│
├─────────────────────────────────────────────────────────────────

Phase 4: RESOLUTION (Auto or Manual)
│
│   After reveal phase ends:
│   - Auto-resolve runs every 30 seconds
│   - Count votes per outcome (weighted by stake)
│   - Determine winning outcome
│   - Distribute rewards to correct voters
│   - Slash incorrect voters (5% stake)
│   - Update reputation scores
│   - Unlock locked stakes
│
└─────────────────────────────────────────────────────────────────
```

### Voting Timeline Example

```
Query Created: 10:00
Duration: 10 minutes (600 seconds)

10:00 - 10:05  │  COMMIT PHASE (5 min)
               │  Voters submit commit hashes
               │
10:05 - 10:10  │  REVEAL PHASE (5 min)
               │  Voters reveal votes
               │
10:10+         │  RESOLUTION
               │  Auto-resolve triggered
               │  Rewards distributed
```

---

## Economic Model

### Stake System

| Parameter | Value | Description |
|-----------|-------|-------------|
| Minimum Stake | 100 ALTH | Required to register as voter |
| Stake Lock | 10% | Locked per active vote |
| Slash Rate | 5% | Slashed for incorrect votes |
| Max Slash | 50% | Maximum total slash |

### Reward Distribution (WeightedByStake)

Rewards are distributed proportionally based on voter stake:

```
voter_reward = (voter_stake / total_correct_voters_stake) × total_reward
```

**Example with 100 token reward:**
- Voter A (500 stake): 500/700 × 100 = ~71 tokens
- Voter B (200 stake): 200/700 × 100 = ~29 tokens

### Reputation System

Reputation is calculated based on voting accuracy:

```
reputation = (correct_votes / total_votes) × 100 + participation_bonus
```

| Tier | Range | Weight Multiplier |
|------|-------|-------------------|
| Novice | 0-40 | 0.5x - 1.1x |
| Intermediate | 41-70 | 1.1x - 1.55x |
| Expert | 71-90 | 1.55x - 1.85x |
| Master | 91-100 | 1.85x - 2.0x |

### Voting Power

```
voting_power = stake × reputation
```

Higher voting power = more influence in weighted voting strategies.

### Slashing Mechanism

Incorrect voters are penalized:
- 5% of total stake slashed per incorrect vote
- Slashed tokens go to protocol treasury
- If remaining stake < minimum, voter deactivated

---

## Frontend Dashboard

### Technology Stack

- **Vite**: Fast build tool with HMR
- **React 19**: UI framework
- **TailwindCSS**: Styling
- **@linera/client**: WASM client for blockchain
- **react-router-dom**: Client-side routing
- **ethers**: Wallet generation (mnemonic)

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Network stats, active queries |
| `/voters` | VotersPage | Voter leaderboard, registration |
| `/queries` | QueriesPage | Create/vote on queries |
| `/token` | TokenPage | ALTH token management |
| `/profile` | ProfilePage | Stake, rewards, slashing info |
| `/docs` | DocsPage | API documentation |

### Key Components

| Component | Purpose |
|-----------|---------|
| LineraContext | WASM client, wallet, app connections |
| TokenBalance | Display ALTH balance |
| StakeInterface | Register/add stake |
| ClaimRewards | Claim pending rewards |
| VoteModal | Commit-reveal voting UI |
| WithdrawStake | Withdraw available stake |
| SlashingInfo | View slashing history |

### Auto-Resolve Feature

The dashboard automatically resolves queries:
- Runs every 30 seconds in background
- Calls `executeAutoResolveQueries` mutation
- Silent operation (no UI refresh)
- Handles queries past reveal phase

---

## API Reference

### GraphQL Queries

#### Get All Voters
```graphql
query {
  voters(limit: 100, offset: 0, activeOnly: true) {
    address
    stake
    lockedStake
    availableStake
    pendingRewards
    reputation
    reputationTier
    reputationWeight
    totalVotes
    correctVotes
    isActive
    name
  }
}
```

#### Get All Queries
```graphql
query {
  queries {
    id
    description
    outcomes
    deadline
    commitEnd
    revealEnd
    status
    voteCount
    result
  }
}
```

#### Get Statistics
```graphql
query {
  statistics {
    totalVoters
    activeVoters
    totalStake
    totalQueries
    activeQueries
    resolvedQueries
    rewardPoolBalance
    protocolTreasury
    totalRewardsDistributed
  }
}
```

### GraphQL Mutations

#### Register Voter (Cross-Chain)
```graphql
mutation {
  sendRegisterVoterMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    stake: "100"
    name: "MyVoter"
  )
}
```

#### Create Query (Cross-Chain)
```graphql
mutation {
  sendCreateQueryMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    description: "Will ETH reach $5000 by Q1 2025?"
    outcomes: ["Yes", "No"]
    strategy: "WeightedByStake"
    rewardAmount: "100"
    minVotes: 3
    durationSecs: 600
  )
}
```

#### Commit Vote (Cross-Chain)
```graphql
mutation {
  sendCommitVoteMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    queryId: 1
    commitHash: "0x..."
  )
}
```

#### Reveal Vote (Cross-Chain)
```graphql
mutation {
  sendRevealVoteMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    queryId: 1
    value: "Yes"
    salt: "random_salt_string"
    confidence: 100
  )
}
```

#### Resolve Query (Direct)
```graphql
mutation {
  executeResolveQuery(queryId: 1)
}
```

#### Auto-Resolve Queries
```graphql
mutation {
  executeAutoResolveQueries
}
```

#### Claim Rewards
```graphql
mutation {
  executeClaimRewards
}
```

---

## Deployment Information

### Current Deployment (Dec 17, 2025)

| Item | Value |
|------|-------|
| Network | Conway Testnet |
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| ALTH Token | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |
| Oracle Registry v2 | `053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730` |
| Faucet | `https://faucet.testnet-conway.linera.net` |

### Build Requirements

- Rust 1.86.0
- linera-sdk 0.15.6 (default-features = false)
- wasm32-unknown-unknown target

### Build Commands

```bash
# Build WASM contract
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

# Publish module
linera publish-module \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm

# Create application
linera create-application <MODULE_ID>
```

### Dashboard Setup

```bash
cd alethea-dashboard-vite
npm install
npm run dev
# Dashboard at http://localhost:4002
```

### Environment Configuration

```env
# .env.local
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
VITE_REGISTRY_APP_ID=053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730
VITE_SERVICE_URL=
VITE_TOKEN_APP_ID=0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0
VITE_TOKEN_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
```

---

## Recent Updates (Dec 17, 2025)

### Contract Fixes
- Fixed `Amount::from_tokens()` double conversion bugs
- Fixed reward pool and treasury calculations
- Fixed slashing calculations using Amount operations
- Fixed reward distribution with `Amount::from_attos()`
- Added `pendingRewards` field to GraphQL schema

### Dashboard Updates
- Added real `pendingRewards` from GraphQL
- Added auto-resolve queries (every 30 seconds)
- Fixed vote status display (committed vs revealed)
- Changed default strategy to `WeightedByStake`
- Fixed page refresh issue with auto-resolve

### Architecture Improvements
- Microcard pattern for voter identification (ChainId)
- Cross-chain messaging for all voter operations
- Event streaming for real-time notifications
- Callback support for market integration

---

## Future Roadmap

1. **Token Integration**: Full ALTH token staking with real transfers
2. **Market Integration**: Automatic query creation from prediction markets
3. **Governance**: DAO-based protocol parameter updates
4. **Multi-Chain**: Support for multiple Linera chains
5. **Mobile App**: React Native dashboard
6. **Analytics**: Historical voting data and performance metrics

---

*Document maintained by Alethea Network Team*

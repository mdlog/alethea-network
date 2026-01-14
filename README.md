# 🎮 Alethea Dashboard - Production Ready Oracle Interface

**Fully Functional Decentralized Oracle Dashboard with Linera Standard Token Integration**

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Token](https://img.shields.io/badge/ALTH%20token-Linera%20Standard-gold)]()
[![Staking](https://img.shields.io/badge/staking%20system-functional-blue)]()
[![Cross-chain](https://img.shields.io/badge/cross--chain-secure%20messaging-purple)]()

## ✅ **FULLY FUNCTIONAL FEATURES**

### 🔮 **Oracle Operations**
- ✅ **Voter Registration**: Register with real ALTH token staking
- ✅ **Query Creation**: Create data queries with token rewards
- ✅ **Commit-Reveal Voting**: Secure two-phase voting system
- ✅ **Auto-Resolution**: Automatic query resolution and reward distribution
- ✅ **Reputation System**: Accuracy-based voter scoring

### 💰 **Token Integration (Linera Standard Fungible Token)**
- ✅ **Real Token Staking**: Actual ALTH tokens backing stakes
- ✅ **Token Faucet**: Request test tokens from treasury
- ✅ **Add Stake**: Increase voting power with more tokens
- ✅ **Withdraw Stake**: Secure token recovery via cross-chain messaging
- ✅ **Token Transfers**: Cross-chain ALTH token transfers (WASM signed)
- ✅ **Balance Tracking**: Real-time token balance per chain
- ✅ **Process Inbox**: Automatic cross-chain message processing

### 🔐 **Security & Architecture**
- ✅ **Cross-chain Messaging**: Secure Linera protocol communication
- ✅ **WASM Integration**: Direct blockchain connection via `@linera/client`
- ✅ **Owner-based Accounts**: Public key (0x prefix) as account identifier
- ✅ **Per-chain Balances**: Token balances stored on user's chain
- ✅ **Error Recovery**: Robust failure handling and retry mechanisms

## 📊 **Current Network Status (Production)**

| Contract | Status | Value |
|----------|--------|-------|
| **Chain ID** | ✅ Active | `268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f` |
| **ALTH Token** | ✅ Linera Standard | `aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57` |
| **Oracle Registry** | ✅ Functional | `d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2` |
| **Treasury Owner** | ✅ Active | `0x5b2ca02bb9c5369e2c501953ba7a40a90b28f21d6364dbba91bc69a1c411a73d` |

### 🏦 **Live Network Stats**
- **Token Standard**: Linera Standard Fungible Token
- **Token Supply**: 1,000,000 ALTH (treasury)
- **Faucet Amount**: 1,000 ALTH per request (24h cooldown)
- **Staking System**: ✅ Fully functional with cross-chain messaging

### 🎯 **Recent Achievements**
- ✅ **Linera Standard Token**: Migrated to official Linera fungible token
- ✅ **Cross-chain Transfers**: WASM-signed token transfers working
- ✅ **Process Inbox**: Automatic inbox processing for cross-chain messages
- ✅ **Token Faucet**: Treasury-based token distribution
- ✅ **Production Ready**: Stable and reliable oracle operations

## 🚀 **Quick Start**

### Prerequisites
- Node.js 20+
- Linera service running on `localhost:8080`

### Setup & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Dashboard will be available at `http://localhost:5173`

## ⚙️ **Configuration**

Current production configuration in `.env.local`:

```env
# Production Configuration (Linera Standard Token)
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net

# Hub Chain (Registry Chain)
VITE_CHAIN_ID=268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f
VITE_REGISTRY_APP_ID=d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2

# Service URL (empty for Vite proxy)
VITE_SERVICE_URL=

# Token Configuration (Linera Standard Fungible Token)
VITE_TOKEN_APP_ID=aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57
VITE_TOKEN_CHAIN_ID=268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f
```

## Architecture

- **Vite**: Fast build tool with HMR
- **React 19**: UI framework
- **TailwindCSS**: Styling
- **@linera/client**: WASM client for blockchain interaction
- **react-router-dom**: Client-side routing
- **ethers**: Wallet generation (mnemonic)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with network stats |
| `/voters` | Voter leaderboard and registration |
| `/queries` | Oracle queries and voting |
| `/token` | ALTH token management and faucet |
| `/profile` | User profile, stake management, rewards |
| `/about` | Vision, use cases, and quality assurance |
| `/docs` | API documentation |

## Stake & Voting System

### Stake Locking Mechanism
When a voter commits to a query, 10% of their available stake is locked:

```
stake_to_lock = available_stake / 10
available_stake = total_stake - locked_stake
```

**Impact of Stake Size:**
| Aspect | Impact |
|--------|--------|
| Voting Power | `stake × reputation` = higher influence in weighted voting |
| Rewards | Proportional to stake (WeightedByStake strategy) |
| Slashing Risk | 5% of stake slashed if vote is incorrect |
| Participation | More stake = can vote on more queries simultaneously |

### Reward Distribution (WeightedByStake)
Rewards are distributed proportionally based on voter stake:

```
voter_reward = (voter_stake / total_correct_voters_stake) × total_reward
```

Example with 100 token reward:
- Voter A (500 stake): 500/700 × 100 = ~71 tokens
- Voter B (200 stake): 200/700 × 100 = ~29 tokens

### Reputation System
Reputation is calculated based on voting accuracy:

```
reputation = (correct_votes / total_votes) × 100 + participation_bonus
```

| Tier | Range | Weight |
|------|-------|--------|
| Novice | 0-25 | 0.5x - 0.875x |
| Intermediate | 26-50 | 0.89x - 1.25x |
| Expert | 51-75 | 1.26x - 1.625x |
| Master | 76-100 | 1.64x - 2.0x |

### Commit-Reveal Voting
The oracle uses a two-phase commit-reveal voting system:

1. **Commit Phase**: Voters submit a hash of their vote (`keccak256(outcome + salt)`)
2. **Reveal Phase**: Voters reveal their actual vote and salt for verification
3. **Resolution**: Auto-resolved after reveal phase ends (every 30 seconds)

### Auto-Resolve
Queries are automatically resolved when reveal phase ends:
- Dashboard checks every 30 seconds for ended queries
- Calls `executeAutoResolveQueries` mutation
- Rewards distributed to correct voters
- Locked stake released

## Key Components

- **LineraContext**: WASM client, wallet management, and application connections
- **TokenBalance**: Display user's ALTH balance
- **StakeInterface**: Register voter with cross-chain token staking
- **ClaimRewards**: Claim pending voting rewards
- **VoteModal**: Commit-reveal voting interface
- **TokenFaucet**: Auto-transfer testnet tokens from admin

## GraphQL API Reference

### Endpoint

Base URL: `http://localhost:8080`

```
# Registry endpoint (Oracle queries, voting, voters)
POST http://localhost:8080/chains/268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f/applications/d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2

# Token endpoint (Linera Standard Fungible Token)
# Note: Query on USER's chain for balance, not token chain
POST http://localhost:8080/chains/{USER_CHAIN_ID}/applications/aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57

# Process Inbox (root endpoint)
POST http://localhost:8080
{ "query": "mutation { processInbox(chainId: \"USER_CHAIN_ID\") }" }

Content-Type: application/json
{ "query": "{ ... }" }
```

| Resource | Chain ID | App ID |
|----------|----------|--------|
| Registry | `268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f` | `d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2` |
| Token | `268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f` | `aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57` |

### Queries

#### statistics
Get network statistics:
```graphql
query {
  statistics {
    totalVoters
    activeVoters
    totalStake
    totalQueriesCreated
    totalQueriesResolved
  }
}
```

#### voters
List registered voters with stake info:
```graphql
query {
  voters {
    address
    stake
    lockedStake
    availableStake
    reputation
    reputationTier
    totalVotes
    isActive
  }
}
```

#### queries
List oracle queries with voting status:
```graphql
query {
  queries {
    id
    description
    outcomes
    status
    phase
    commitCount
    voteCount
    deadline
    result
  }
}
```

#### voterProfile
Get specific voter profile:
```graphql
query {
  voterProfile(address: "0x...") {
    address
    stake
    lockedStake
    availableStake
    reputation
    reputationTier
    totalVotes
  }
}
```

### Mutations

#### createQuery
Create new oracle query (admin):
```graphql
mutation {
  createQuery(
    description: "Will BTC reach $150k?",
    outcomes: ["Yes", "No"],
    strategy: "Majority",
    minVotes: 1,
    rewardAmount: "100",
    durationSecs: 3600
  )
}
```

#### sendCommitVoteMessage
Submit vote commitment (via WASM):
```graphql
mutation {
  sendCommitVoteMessage(
    targetChain: "36dd869...",
    queryId: 1,
    commitHash: "abc123..."
  )
}
```

#### sendRevealVoteMessage
Reveal committed vote (via WASM):
```graphql
mutation {
  sendRevealVoteMessage(
    targetChain: "36dd869...",
    queryId: 1,
    value: "Yes",
    salt: "random_salt",
    confidence: 80
  )
}
```

#### sendRegisterVoterMessage
Register as voter (via WASM):
```graphql
mutation {
  sendRegisterVoterMessage(
    targetChain: "36dd869...",
    stake: "100",
    name: "MyVoter"
  )
}
```

## Recent Changes (Dec 17, 2025)

### Contract Fixes
- **Fixed Amount::from_tokens bugs**: Values in internal representation no longer double-converted
- **Fixed reward pool/treasury**: Now shows correct values (not Amount::MAX)
- **Fixed slashing calculations**: Uses Amount operations directly
- **Fixed reward distribution**: Uses Amount::from_attos for proper conversion

### Dashboard Updates
- **Added pendingRewards**: Real value from GraphQL instead of simulated
- **Added auto-resolve**: Queries auto-resolved every 30 seconds after reveal phase
- **Fixed vote status display**: Correctly shows "Committed" vs "Vote revealed"
- **Changed default strategy**: New queries use WeightedByStake (proportional rewards)

### New Registry App ID
```
053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730
```

## Troubleshooting

### Vote not recorded
- Ensure you're using WASM (not HTTP) for voting
- Cross-chain messages need time to propagate
- Check browser console for errors

### "Insufficient available stake"
- Your stake is locked in active queries
- Wait for queries to resolve to unlock stake
- Or add more stake via Profile page

### Pending rewards showing 0
- Rewards are only distributed after query resolution
- Vote correctly to earn rewards
- Check if query has been resolved

### Token balance not updating
- Wait for cross-chain message processing
- Refresh the page or click refresh button

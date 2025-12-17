# Alethea Dashboard (Vite)

Decentralized Oracle Dashboard built with Vite + React + Linera WASM Client.

## Features

- **WASM Integration**: Direct connection to Linera blockchain via `@linera/client`
- **Wallet Management**: Create and manage Linera wallets with mnemonic backup
- **ALTH Token**: Native token with cross-chain transfer support
- **Voter Registration**: Register as oracle voter with real token staking
- **Stake Management**: Add/withdraw stake with locked stake tracking
- **Cross-Chain Messaging**: Token transfers and voter registration via authenticated WASM calls
- **Commit-Reveal Voting**: Secure two-phase voting system
- **Query Management**: Create and vote on oracle queries with auto-resolve
- **Token Faucet**: Auto-transfer testnet tokens for testing
- **Real-time Stats**: Live statistics from blockchain
- **Pending Rewards**: Track and claim voting rewards from GraphQL

## Deployed Contracts (Testnet Conway - Dec 17, 2025)

| Contract | Value |
|----------|-------|
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| ALTH Token | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |
| Oracle Registry v2 | `053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730` |

> **Note**: Registry deployed with fixed Amount calculations, pendingRewards field, and WeightedByStake strategy (Dec 17, 2025).

## Prerequisites

- Node.js 20+
- Linera service running on `localhost:8080`

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Dashboard will be available at `http://localhost:4002`

## Configuration

Edit `.env.local`:

```env
# Testnet Configuration
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
VITE_REGISTRY_APP_ID=053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730
VITE_SERVICE_URL=

# Token Configuration
VITE_TOKEN_APP_ID=0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0
VITE_TOKEN_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
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

Base URL: `https://alethea.network`

```
# Registry endpoint (Oracle queries, voting, voters)
POST https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730

# Token endpoint (ALTH token balance, transfers)
POST https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0

Content-Type: application/json
{ "query": "{ ... }" }
```

| Resource | Chain ID | App ID |
|----------|----------|--------|
| Registry | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` | `053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730` |
| Token | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |

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

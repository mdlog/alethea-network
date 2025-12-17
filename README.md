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
- **Query Management**: Create and vote on oracle queries
- **Token Faucet**: Auto-transfer testnet tokens for testing
- **Real-time Stats**: Live statistics from blockchain

## Deployed Contracts (Testnet Conway - Dec 17, 2025)

| Contract | Value |
|----------|-------|
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| ALTH Token | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |
| Oracle Registry v2 | `a537c7c3b018751544bfc6bfb7beefc40200ac068a78efe3c9bf661a9ec18362` |

> **Note**: Registry deployed with fixed stake locking mechanism (Dec 17, 2025). Cross-chain voting fully functional.

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
VITE_REGISTRY_APP_ID=a537c7c3b018751544bfc6bfb7beefc40200ac068a78efe3c9bf661a9ec18362
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
| Rewards | Proportional to stake - larger stake = larger rewards |
| Slashing Risk | 5% of stake slashed if vote is incorrect |
| Participation | More stake = can vote on more queries simultaneously |

### Commit-Reveal Voting
The oracle uses a two-phase commit-reveal voting system to prevent vote copying:

1. **Commit Phase**: Voters submit a hash of their vote (`keccak256(outcome + salt)`)
2. **Reveal Phase**: Voters reveal their actual vote and salt for verification
3. **Resolution**: Consensus calculated, rewards distributed, stake unlocked

### Cross-Chain Voting Flow
1. User calls `sendCommitVoteMessage` via WASM from their chain
2. Message is sent to registry chain with sender authentication
3. Registry validates voter, locks 10% of available stake, records commit
4. After commit phase ends, user calls `sendRevealVoteMessage`
5. Registry verifies hash matches and records vote
6. After resolution, locked stake is released

## Key Components

- **LineraContext**: WASM client, wallet management, and application connections
- **TokenBalance**: Display user's ALTH balance
- **StakeInterface**: Register voter with cross-chain token staking, add/withdraw stake
- **RegisterModal**: Quick voter registration from Voters page (with token transfer)
- **VoteModal**: Commit-reveal voting interface
- **TokenFaucet**: Auto-transfer testnet tokens from admin
- **TransferToken**: Send tokens to other addresses

## Cross-Chain Architecture

### Token Staking Flow
1. User calls `sendTransferMessage` via WASM (authenticated with private key)
2. Token contract receives cross-chain message `RequestTransfer`
3. Tokens are debited from user and credited to treasury
4. User calls `sendRegisterVoterMessage` to register as voter
5. Registry receives message and registers voter with stake

### Why Cross-Chain?
- Token contract lives on the main chain
- Users have their own chains (claimed from faucet)
- WASM client provides authentication via private key
- Cross-chain messages carry authentication proof

## WASM Client Features

The dashboard connects to two applications via WASM:

1. **Registry Application** (`application`)
   - `executeMutation`: Send cross-chain voter operations
   - `executeQuery`: Query voter/query data

2. **Token Application** (`tokenApplication`)
   - `executeTokenMutation`: Send cross-chain token transfers

## HTTP Fallback

For read-only queries, HTTP endpoints are used:
- `executeAppChainQuery`: Query registry data via HTTP
- `executeAppChainMutation`: Mutations via HTTP (for admin operations on registry chain)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Wallet Storage

Wallet data (mnemonic, chainId, owner) is stored in IndexedDB (`alethea_wallet`).

To reset wallet:
```javascript
// In browser console
indexedDB.deleteDatabase('alethea_wallet');
location.reload();
```

## Registry Contract Operations

### Register Voter (via WASM)
```graphql
mutation {
  sendRegisterVoterMessage(
    targetChain: "REGISTRY_CHAIN_ID",
    stake: "100",
    name: "VoterName"
  )
}
```

### Commit Vote (via WASM)
```graphql
mutation {
  sendCommitVoteMessage(
    targetChain: "REGISTRY_CHAIN_ID",
    queryId: 1,
    commitHash: "0x..."
  )
}
```

### Reveal Vote (via WASM)
```graphql
mutation {
  sendRevealVoteMessage(
    targetChain: "REGISTRY_CHAIN_ID",
    queryId: 1,
    value: "Yes",
    salt: "random_salt",
    confidence: 80
  )
}
```

### Create Query (HTTP - admin)
```graphql
mutation {
  createQuery(
    description: "Will BTC reach $150k?",
    outcomes: ["Yes", "No"],
    strategy: "Majority",
    minVotes: 2,
    rewardAmount: "100",
    durationSecs: 3600
  )
}
```

### Query Voters
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
    name
    isActive
  }
}
```

### Query Details
```graphql
query {
  queries {
    id
    description
    status
    phase
    commitCount
    voteCount
    selectedVoters
  }
}
```

## Token Contract Operations

### Faucet (Auto-transfer from admin)
```graphql
mutation {
  transfer(
    owner: "ADMIN_ADDRESS",
    amount: "1000.",
    targetChain: "USER_CHAIN_ID",
    targetOwner: "USER_ADDRESS"
  )
}
```

### Cross-Chain Transfer (via WASM)
```graphql
mutation {
  sendTransferMessage(
    tokenChain: "TOKEN_CHAIN_ID",
    amount: "100.",
    targetOwner: "RECIPIENT_ADDRESS"
  )
}
```

### Check Balance
```graphql
query {
  balance(owner: "0x...")
}
```

## Troubleshooting

### Vote not recorded
- Ensure you're using WASM (not HTTP) for voting
- Cross-chain messages need time to propagate
- Check browser console for errors
- Verify your chain is registered as a voter
- Check if you have sufficient available stake (not locked)

### "Insufficient available stake"
- Your stake is locked in active queries
- Wait for queries to resolve to unlock stake
- Or add more stake via Profile page

### Token balance not updating
- Wait for cross-chain message processing
- Refresh the page or click refresh button
- Check if transaction was successful in console

## Recent Changes (Dec 17, 2025)

- **Fixed Stake Locking**: `calculate_stake_to_lock` now uses `Amount::saturating_div(10)` directly
- **Fixed Available Stake**: `get_available_stake` uses `stake.saturating_sub(locked_stake)` 
- **Cross-Chain Voting Working**: Commits and votes now properly recorded
- **New Registry Deployed**: App ID `a537c7c3b018751544bfc6bfb7beefc40200ac068a78efe3c9bf661a9ec18362`
- **Added GraphQL Fields**: `phase`, `commitCount`, `availableStake` for better debugging

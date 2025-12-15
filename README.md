# Alethea Dashboard (Vite)

Decentralized Oracle Dashboard built with Vite + React + Linera WASM Client.

## Features

- **WASM Integration**: Direct connection to Linera blockchain via `@linera/client`
- **Wallet Management**: Create and manage Linera wallets with mnemonic backup
- **ALTH Token**: Native token with cross-chain transfer support
- **Voter Registration**: Register as oracle voter with real token staking
- **Cross-Chain Messaging**: Token transfers and voter registration via authenticated WASM calls
- **Commit-Reveal Voting**: Secure two-phase voting system
- **Query Management**: Create and vote on oracle queries
- **Token Faucet**: Auto-transfer testnet tokens for testing
- **Real-time Stats**: Live statistics from blockchain

## Deployed Contracts (Testnet Conway)

| Contract | App ID |
|----------|--------|
| ALTH Token | `bc9272e95177834f00d617d2996e1979fb77c5e77eede964c3239019f6454a0d` |
| Oracle Registry v2 | `e821a9aa94d38eb40cd9da7914aa06607c7d3a27f11fa065aa71dbbfc35ea62d` |
| Chain ID | `208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91` |
| Admin/Treasury | `0x403bc4052a40835697d74411322cec087a55a7fb81a791ed7a590e7cfd5f612a` |

> **Note**: Registry App ID updated on Dec 15, 2025 with voter selection temporarily disabled for testing.

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
VITE_CHAIN_ID=208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91
VITE_REGISTRY_APP_ID=e821a9aa94d38eb40cd9da7914aa06607c7d3a27f11fa065aa71dbbfc35ea62d
VITE_SERVICE_URL=http://localhost:8080

# Token Configuration
VITE_TOKEN_APP_ID=bc9272e95177834f00d617d2996e1979fb77c5e77eede964c3239019f6454a0d
VITE_TOKEN_CHAIN_ID=208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91
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

## Voting System

### Commit-Reveal Voting
The oracle uses a two-phase commit-reveal voting system to prevent vote copying:

1. **Commit Phase**: Voters submit a hash of their vote (`keccak256(outcome + salt)`)
2. **Reveal Phase**: Voters reveal their actual vote and salt for verification

### Voter Selection
- ~~Voters are selected based on stake × reputation power~~
- **TEMPORARY**: All registered voters can participate in any query (selection disabled for testing)

### Cross-Chain Voting Flow
1. User calls `sendCommitVoteMessage` via WASM from their chain
2. Message is sent to registry chain with sender authentication
3. Registry validates voter and records commit
4. After commit phase ends, user calls `sendRevealVoteMessage`
5. Registry verifies hash matches and records vote

## Key Components

- **LineraContext**: WASM client, wallet management, and application connections
- **TokenBalance**: Display user's ALTH balance
- **StakeInterface**: Register voter with cross-chain token staking
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

Headers include `Bypass-Tunnel-Reminder: true` for localtunnel compatibility.

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
    durationSecs: 300
  )
}
```

### Query Voters
```graphql
query {
  voters(limit: 100, offset: 0, activeOnly: true) {
    address
    stake
    reputation
    reputationTier
    name
    isActive
  }
}
```

### Query Details
```graphql
query {
  query(id: 1) {
    id
    description
    status
    commitEnd
    revealEnd
    selectedVoters
    voteCount
    commitCount
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

### "Client not configured to propose on chain"
- This error occurs when using HTTP to mutate on a chain you don't own
- Use WASM client which has your private key for authentication

### Token balance not updating
- Wait for cross-chain message processing
- Refresh the page or click refresh button
- Check if transaction was successful in console

## Recent Changes (Dec 15, 2025)

- **Voter Selection Disabled**: All registered voters can now vote on any query (temporary for testing)
- **RegisterModal Updated**: Now includes token transfer to treasury (same as Profile page)
- **New Registry Deployed**: App ID `e821a9aa94d38eb40cd9da7914aa06607c7d3a27f11fa065aa71dbbfc35ea62d`

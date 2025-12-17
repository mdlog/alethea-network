# Alethea Token Integration

This dashboard is fully integrated with the `alethea-token` contract to support all token features including staking, claiming rewards, withdrawing, treasury management, and slashing.

## Current Deployment (Dec 17, 2025)

| Contract | App ID |
|----------|--------|
| ALTH Token | `0d024bdc17d9f4a3fb65793b40d3e6da9722d5b56af2d14ac6773079e870a2e0` |
| Oracle Registry v2 | `053e39a7bb6c3fe0c034da47a7a3591cc03d110c5e964c34f693c7fed2123730` |
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |

## Integrated Features

### 1. Token Balance
- Displays user's token balance in header (compact view)
- Full details on Token page
- Real-time balance updates

### 2. Stake Management
- **Add Stake**: Increase stake to boost voting weight
- **Withdraw Stake**: Withdraw unlocked stake
- **Locked Stake**: Shows stake locked due to active votes
- **Minimum Stake**: 100 ALTH tokens required to register

### 3. Rewards System
- **Pending Rewards**: Real value from GraphQL `pendingRewards` field
- **Claim Rewards**: Claim rewards from correct voting
- **Reward Pool**: Protocol reward pool balance
- **WeightedByStake**: Rewards distributed proportionally to stake

### 4. Treasury
- **Protocol Treasury**: Total protocol treasury funds
- **Reward Pool Balance**: Available funds for rewards
- **Total Distributed**: Total rewards already distributed
- **Total Staked**: Total stake from all voters

### 5. Slashing
- **Risk Level**: Slashing risk indicator (Low/Medium/High)
- **Potential Slash**: Estimated slash amount (5% of stake)
- **Slashing Rules**: Explanation of slashing mechanics
- **Max Slash**: Capped at 50% of total stake

### 6. Token Transfer
- Transfer tokens to other addresses
- Quick amount buttons
- Max button to transfer entire balance

## Configuration

Add the following environment variables to `.env.local`:

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

## Components

| Component | Location | Description |
|-----------|----------|-------------|
| `LineraContext` | `src/contexts/LineraContext.tsx` | WASM client, wallet, token app connection |
| `TokenBalance` | `src/components/TokenBalance.tsx` | Display token balance |
| `ClaimRewards` | `src/components/ClaimRewards.tsx` | UI for claiming rewards |
| `WithdrawStake` | `src/components/WithdrawStake.tsx` | UI for withdrawing stake |
| `TreasuryInfo` | `src/components/TreasuryInfo.tsx` | Protocol treasury info |
| `TransferToken` | `src/components/TransferToken.tsx` | Token transfer UI |
| `SlashingInfo` | `src/components/SlashingInfo.tsx` | Slashing risk info |
| `StakeInterface` | `src/components/StakeInterface.tsx` | Register/add stake UI |

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | HomePage | Main dashboard with stats |
| `/voters` | VotersPage | Voter leaderboard |
| `/queries` | QueriesPage | Query list and voting |
| `/profile` | ProfilePage | User profile with stake/rewards/slashing |
| `/token` | TokenPage | Token management page |
| `/docs` | DocsPage | API documentation |

## GraphQL Schema

### Voter Fields
```graphql
type Voter {
  address: String!
  stake: String!
  lockedStake: String!
  availableStake: String!
  pendingRewards: String!  # Real rewards from contract
  reputation: Int!
  reputationTier: String!
  reputationWeight: Float!
  totalVotes: Int!
  correctVotes: Int!
  isActive: Boolean!
  name: String
}
```

### Statistics Fields
```graphql
type Statistics {
  totalVoters: Int!
  activeVoters: Int!
  totalStake: String!
  totalQueries: Int!
  activeQueries: Int!
  resolvedQueries: Int!
  rewardPoolBalance: String!
  protocolTreasury: String!
  totalRewardsDistributed: String!
}
```

### Token Contract Queries
```graphql
# Get token info
query {
  tokenInfo {
    name
    symbol
    decimals
    totalSupply
    totalMinted
    totalBurned
  }
}

# Get balance
query {
  balance(owner: "chain-id")
}
```

### Registry Contract Mutations
```graphql
# Register as voter (cross-chain)
mutation {
  sendRegisterVoterMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    stake: "100"
    name: "MyVoter"
  )
}

# Add stake (cross-chain)
mutation {
  sendUpdateStakeMessage(
    targetChain: "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
    additionalStake: "50"
  )
}

# Claim rewards
mutation {
  executeClaimRewards
}

# Withdraw stake
mutation {
  executeWithdrawStake(amount: "100")
}
```

## Integration Flow

1. **Wallet Connection**
   - User creates/connects wallet → Chain ID stored
   - WASM client connects to token and registry applications

2. **Balance Loading**
   - Token balance queried from token contract via WASM
   - Voter profile loaded from registry contract via HTTP

3. **User Actions**
   - **Add Stake**: Cross-chain message to registry
   - **Withdraw Stake**: Direct operation on registry
   - **Claim Rewards**: Direct operation on registry
   - **Transfer Token**: Direct operation on token contract
   - **View Slashing Risk**: Calculated from accuracy percentage

## Stake & Reward Mechanics

### Stake Locking
When a voter commits to a query, 10% of available stake is locked:
```
stake_to_lock = available_stake / 10
available_stake = total_stake - locked_stake
```

### Reward Distribution (WeightedByStake)
Rewards are distributed proportionally based on voter stake:
```
voter_reward = (voter_stake / total_correct_voters_stake) × total_reward
```

**Example with 100 token reward:**
- Voter A (500 stake): 500/700 × 100 = ~71 tokens
- Voter B (200 stake): 200/700 × 100 = ~29 tokens

### Slashing Calculation
Incorrect voters are penalized:
```
slash_amount = voter_stake × 0.05 (5%)
max_slash = voter_stake × 0.50 (50% cap)
```

## Technical Notes

- Token balance queried directly from token contract via WASM
- Stake operations handled by registry contract via cross-chain messages
- Rewards calculated based on correct votes and stake weight
- Slashing risk calculated based on accuracy percentage
- Auto-resolve runs every 30 seconds to distribute rewards
- All Amount values use internal representation (attos, 10^18)

## Recent Updates (Dec 17, 2025)

- Fixed Amount::from_tokens double conversion bugs
- Added real `pendingRewards` field to GraphQL schema
- Changed default strategy to WeightedByStake
- Fixed reward pool and treasury calculations
- Added auto-resolve for automatic reward distribution

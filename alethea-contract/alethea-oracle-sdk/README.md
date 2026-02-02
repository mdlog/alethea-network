# Alethea Oracle SDK

TypeScript SDK for integrating with **Alethea Oracle Network** - a decentralized resolution oracle layer for prediction markets, insurance protocols, and other DApps.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ALETHEA ORACLE NETWORK                         │
│                     (Resolution Oracle Layer)                       │
│                                                                     │
│   ┌─────────────────────┐        ┌─────────────────────────────┐   │
│   │  Alethea Dashboard  │        │     Oracle Registry         │   │
│   │  (Internal Only)    │        │     (Smart Contract)        │   │
│   │                     │        │                             │   │
│   │  • Register Voters  │        │  • Process Queries          │   │
│   │  • Submit Votes     │        │  • Resolve via Voting       │   │
│   │  • Manage Stakes    │        │  • Send Callbacks           │   │
│   │  • Claim Rewards    │        │                             │   │
│   └─────────────────────┘        └─────────────────────────────┘   │
│                                             │                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                          Resolution Callbacks│ Query Requests
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DAPPS                              │
│                                                                     │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│   │  Prediction     │   │   Insurance     │   │    Gaming       │  │
│   │  Market         │   │   Protocol      │   │    DApp         │  │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘  │
│                                                                     │
│   Use ExternalDAppClient to request resolution from Alethea        │
└─────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install alethea-oracle-sdk
```

## Quick Start

### For External DApps (Prediction Markets, Insurance, etc.)

Use `ExternalDAppClient` to integrate your DApp with Alethea Oracle.

#### Hybrid Model (Recommended)

The hybrid model uses **bonds** instead of direct reward payments:
- **Bond**: Refundable deposit, returned if no dispute
- **Priority Fee**: Optional, non-refundable, speeds up resolution
- **Voter Rewards**: Come from protocol inflation, not your bond

```typescript
import { ExternalDAppClient } from 'alethea-oracle-sdk';

// Initialize client
const client = new ExternalDAppClient({
    registryId: 'oracle-registry-app-id',
    chainId: 'oracle-chain-id',
    callbackChainId: 'your-dapp-chain-id',
    callbackAppId: 'your-dapp-app-id',
});

// Create query with bond (RECOMMENDED)
const result = await client.createQueryWithBond({
    description: 'Did BTC close above $100,000 on January 5, 2026?',
    outcomes: ['Yes', 'No'],
    bondAmount: '100',       // 100 ALTH (refundable)
    priorityFee: '10',       // 10 ALTH (optional, non-refundable)
    durationSecs: 3600,      // 1 hour voting period
    referenceId: 'market-123',
});

console.log('Query created:', result.queryId);

// Subscribe to resolution
const unsubscribe = await client.subscribeToResolution(
    result.queryId,
    async (resolution, error) => {
        if (resolution) {
            console.log('Resolved:', resolution.result);
            
            // Claim your bond back after dispute window
            // (typically 1 hour after resolution)
            setTimeout(async () => {
                try {
                    await client.claimBondRefund(result.queryId);
                    console.log('Bond refunded!');
                } catch (e) {
                    console.log('Bond claim failed (may be disputed)');
                }
            }, 3600000); // Wait 1 hour
        }
    }
);
```

#### Bond vs Reward Model Comparison

| Aspect | Legacy (Reward) | Hybrid (Bond) |
|--------|-----------------|---------------|
| Cost | Pay `rewardAmount` (lost) | Pay `bondAmount` (refundable) |
| Voter Incentive | From your payment | From protocol inflation |
| Dispute | Not available | Can dispute within window |
| Recommended | No | Yes |

### Available Methods for External DApps

| Method | Description |
|--------|-------------|
| `createResolutionQuery(params)` | Request oracle resolution for your market/event |
| `getQueryStatus(queryId)` | Check the status of a query |
| `checkResolution(queryId)` | Get resolution result if resolved |
| `subscribeToResolution(queryId, callback)` | Subscribe to resolution updates |
| `getQueries()` | Get all queries |
| `getActiveQueries()` | Get active queries |
| `getStatistics()` | Get oracle statistics |
| `getVoters()` | Get registered voters (for transparency) |

## API Reference

### ExternalDAppClient

#### Configuration

```typescript
interface ExternalDAppConfig {
    registryId: string;        // Oracle Registry application ID
    chainId: string;           // Oracle chain ID
    callbackChainId: string;   // Your DApp's chain ID
    callbackAppId: string;     // Your DApp's application ID
    endpoint?: string;         // Custom GraphQL endpoint
    retryAttempts?: number;    // Retry attempts (default: 3)
    retryDelay?: number;       // Retry delay ms (default: 1000)
}
```

#### createResolutionQuery

Request oracle resolution for your market/event.

```typescript
interface CreateResolutionQueryParams {
    description: string;           // Question for voters
    outcomes: string[];            // Possible outcomes (2-10)
    strategy?: DecisionStrategy;   // 'Majority' | 'WeightedByStake' (default)
    minVotes?: number;             // Minimum votes required
    rewardAmount: string;          // Reward for correct voters
    durationSecs?: number;         // Voting duration in seconds
    referenceId?: string;          // Your internal reference ID
    callbackData?: string;         // Additional callback data
}

interface QueryCreationResult {
    queryId: number;
    status: QueryStatus;
    estimatedResolution: Date;
    deadline: string;
}
```

#### subscribeToResolution

Subscribe to resolution updates with polling.

```typescript
const unsubscribe = await client.subscribeToResolution(
    queryId,
    (resolution, error) => {
        // Handle resolution or error
    },
    {
        pollInterval: 5000,    // Poll every 5 seconds
        timeout: 86400000,     // Timeout after 24 hours
    }
);
```

#### Resolution Result

```typescript
interface ResolutionResult {
    queryId: number;
    result: string;          // The resolved outcome
    resolvedAt: string;      // Resolution timestamp
    voteCount: number;       // Number of votes
    confidence: number;      // Confidence score (0-100)
    callbackData?: string;   // Your original reference
}
```

## Contract Integration (Rust)

For Rust contract integration, use the `alethea-oracle-messages` crate:

```rust
use alethea_oracle_messages::{OracleRequest, OracleCallback};

// Send resolution request
let request = OracleRequest::CreateQuery {
    request_id: market_id,
    description: question,
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    deadline: resolution_deadline,
    callback_chain: self.runtime.chain_id(),
    callback_app: self.runtime.application_id(),
    callback_data: encode_request_id(market_id),
};

// Handle callback
async fn execute_message(&mut self, message: Message) {
    if let Message::OracleCallback(callback) = message {
        match callback {
            OracleCallback::QueryResolved { result, callback_data, .. } => {
                let market_id = decode_request_id(&callback_data);
                self.resolve_market(market_id, result).await;
            }
            // Handle other callbacks...
        }
    }
}
```

## Error Handling

```typescript
import { 
    ValidationError, 
    NetworkError, 
    QueryNotFoundError 
} from 'alethea-oracle-sdk';

try {
    const result = await client.createResolutionQuery(params);
} catch (error) {
    if (error instanceof ValidationError) {
        console.error('Invalid parameters:', error.message);
    } else if (error instanceof NetworkError) {
        console.error('Network issue:', error.message);
    } else if (error instanceof QueryNotFoundError) {
        console.error('Query not found:', error.queryId);
    }
}
```

## Internal Dashboard Client

> ⚠️ **For Alethea Network internal use only.**

The `InternalDashboardClient` is used exclusively by Alethea Dashboard for voter operations. External DApps should NOT use this client.

### Voter Reward Flow (Updated)

Rewards now go through a two-step withdrawal process for security:

```
┌─────────────┐     claimRewards()     ┌────────────────────┐     claimWithdrawableTokens()     ┌─────────────┐
│  Pending    │ ─────────────────────► │  Withdrawable      │ ─────────────────────────────────► │   Wallet    │
│  Rewards    │                        │  Balance           │                                    │   (Tokens)  │
└─────────────┘                        └────────────────────┘                                    └─────────────┘
```

1. **Vote correctly** → Rewards added to `pendingRewards`
2. **Claim rewards** → Rewards move to `withdrawableBalance`
3. **Claim tokens** → Tokens sent to your wallet via token contract

### Available Voter Operations

| Method | Description |
|--------|-------------|
| `registerVoter(params)` | Register as a voter with initial stake |
| `getMyVoterInfo()` | Get your voter info including withdrawableBalance |
| `addStake(amount)` | Add more stake to increase voting power |
| `withdrawStake(amount)` | Withdraw stake (moves to withdrawableBalance) |
| `submitVote(params)` | Submit a vote on a query |
| `commitVote(params)` | Commit phase of commit-reveal voting |
| `revealVote(params)` | Reveal phase of commit-reveal voting |
| `getPendingRewards()` | Check pending rewards |
| `claimRewards()` | Move pending rewards to withdrawableBalance |
| `claimWithdrawableTokens()` | Send withdrawable tokens to wallet |
| `deregisterVoter()` | Deregister and return all stake |

## Support

- Documentation: [docs.alethea.network](https://docs.alethea.network)
- GitHub: [github.com/alethea-network](https://github.com/alethea-network)
- Dashboard: [dashboard.alethea.network](https://dashboard.alethea.network)

## License

MIT

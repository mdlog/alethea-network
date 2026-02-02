# Alethea Oracle SDK - API Reference

## Overview

The SDK is divided into two distinct clients based on use case:

| Client | Purpose | Use Case |
|--------|---------|----------|
| `ExternalDAppClient` | Resolution oracle integration | Prediction markets, insurance, gaming DApps |
| `InternalDashboardClient` | Voter operations | Alethea Dashboard only |

```
┌────────────────────────────────────────────────────────────────────┐
│                     ALETHEA ORACLE SDK                              │
├────────────────────────────────┬───────────────────────────────────┤
│        ExternalDAppClient      │     InternalDashboardClient       │
│    (Prediction Markets, etc.)  │      (Alethea Dashboard)          │
├────────────────────────────────┼───────────────────────────────────┤
│ • createResolutionQuery()      │ • registerVoter()                 │
│ • getQueryStatus()             │ • submitVote()                    │
│ • checkResolution()            │ • commitVote() / revealVote()     │
│ • subscribeToResolution()      │ • addStake() / withdrawStake()    │
│ • getActiveQueries()           │ • claimRewards()                  │
│ • getStatistics()              │ • getMyVoterInfo()                │
│ • getVoters()                  │ • getPendingRewards()             │
└────────────────────────────────┴───────────────────────────────────┘
```

---

## ExternalDAppClient

For prediction markets, insurance protocols, gaming DApps, and any external application that needs decentralized resolution.

### Import

```typescript
import { ExternalDAppClient } from 'alethea-oracle-sdk';
```

### Constructor

```typescript
const client = new ExternalDAppClient(config: ExternalDAppConfig);
```

#### ExternalDAppConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `registryId` | `string` | Yes | Oracle Registry application ID |
| `chainId` | `string` | Yes | Oracle chain ID |
| `callbackChainId` | `string` | Yes | Your DApp's chain ID for receiving callbacks |
| `callbackAppId` | `string` | Yes | Your DApp's application ID |
| `endpoint` | `string` | No | Custom GraphQL endpoint |
| `retryAttempts` | `number` | No | Retry attempts (default: 3) |
| `retryDelay` | `number` | No | Delay between retries in ms (default: 1000) |

### Methods

#### createResolutionQuery()

Request oracle resolution for your market or event.

```typescript
async createResolutionQuery(params: CreateResolutionQueryParams): Promise<QueryCreationResult>
```

##### CreateResolutionQueryParams

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `description` | `string` | Yes | Question for voters to resolve |
| `outcomes` | `string[]` | Yes | Possible outcomes (2-10) |
| `strategy` | `DecisionStrategy` | No | `'Majority'`, `'WeightedByStake'` (default), `'WeightedByReputation'`, `'Median'` |
| `minVotes` | `number` | No | Minimum votes required |
| `rewardAmount` | `string` | Yes | Reward for correct voters (ALTH) |
| `durationSecs` | `number` | No | Voting duration in seconds |
| `referenceId` | `string` | No | Your internal reference ID |
| `callbackData` | `string` | No | Additional callback data (hex) |

##### QueryCreationResult

```typescript
interface QueryCreationResult {
    queryId: number;
    status: QueryStatus;
    estimatedResolution: Date;
    deadline: string;
}
```

##### Example

```typescript
const result = await client.createResolutionQuery({
    description: 'Did BTC reach $100,000 on January 5, 2026?',
    outcomes: ['Yes', 'No'],
    rewardAmount: '100',
    durationSecs: 3600,
    referenceId: 'market-btc-100k',
});

console.log('Query ID:', result.queryId);
```

---

#### getQueryStatus()

Get detailed information about a query.

```typescript
async getQueryStatus(queryId: number): Promise<QueryInfo | null>
```

##### QueryInfo

```typescript
interface QueryInfo {
    id: number;
    description: string;
    outcomes: string[];
    strategy: DecisionStrategy;
    minVotes: number;
    rewardAmount: string;
    creator: string;
    createdAt: string;
    deadline: string;
    status: QueryStatus;  // 'Active' | 'Resolved' | 'Expired' | 'Cancelled'
    phase?: VotingPhase;  // 'Commit' | 'Reveal' | 'Completed'
    result?: string;
    resolvedAt?: string;
    voteCount: number;
    timeRemaining: number;
}
```

---

#### checkResolution()

Check if a query has been resolved and get the result.

```typescript
async checkResolution(queryId: number): Promise<ResolutionResult | null>
```

Returns `null` if not yet resolved.

##### ResolutionResult

```typescript
interface ResolutionResult {
    queryId: number;
    result: string;         // The resolved outcome
    resolvedAt: string;     // Resolution timestamp
    voteCount: number;      // Number of votes
    confidence: number;     // Confidence score (0-100)
    callbackData?: string;  // Your original reference
}
```

---

#### subscribeToResolution()

Subscribe to resolution updates using polling.

```typescript
async subscribeToResolution(
    queryId: number,
    callback: ResolutionCallback,
    options?: SubscriptionOptions
): Promise<Unsubscribe>
```

##### ResolutionCallback

```typescript
type ResolutionCallback = (
    resolution: ResolutionResult | null,
    error: Error | null
) => void;
```

##### SubscriptionOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pollInterval` | `number` | 5000 | Polling interval in ms |
| `timeout` | `number` | 86400000 | Timeout in ms (24h) |

##### Example

```typescript
const unsubscribe = await client.subscribeToResolution(
    queryId,
    (resolution, error) => {
        if (error) {
            console.error('Error:', error);
            return;
        }
        if (resolution) {
            console.log('Resolved:', resolution.result);
            // Update your market
            myMarket.resolve(resolution.result);
        }
    },
    { pollInterval: 10000, timeout: 86400000 }
);

// Later, to stop:
unsubscribe();
```

---

#### getActiveQueries()

Get all active queries.

```typescript
async getActiveQueries(options?: { limit?: number; offset?: number }): Promise<QueryInfo[]>
```

---

#### getQueries()

Get queries with filtering.

```typescript
async getQueries(options?: {
    limit?: number;
    offset?: number;
    status?: 'Active' | 'Resolved' | 'Expired' | 'Cancelled';
}): Promise<QueryInfo[]>
```

---

#### getStatistics()

Get oracle protocol statistics.

```typescript
async getStatistics(): Promise<Statistics>
```

##### Statistics

```typescript
interface Statistics {
    totalVoters: number;
    activeVoters: number;
    totalStake: string;
    totalQueriesCreated: number;
    totalQueriesResolved: number;
    activeQueriesCount: number;
    totalVotesSubmitted: number;
    resolutionRate: number;
    // ... and more
}
```

---

#### getVoters()

Get registered voters (for transparency).

```typescript
async getVoters(options?: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
}): Promise<VoterInfo[]>
```

---

## InternalDashboardClient

**⚠️ For Alethea Dashboard internal use only.**

External DApps should NOT use this client.

### Import

```typescript
import { InternalDashboardClient } from 'alethea-oracle-sdk';
```

### Constructor

```typescript
const client = new InternalDashboardClient(config: InternalDashboardConfig);
```

#### InternalDashboardConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `registryId` | `string` | Yes | Oracle Registry application ID |
| `chainId` | `string` | Yes | Oracle chain ID |
| `voterChainId` | `string` | Yes | Voter's chain ID |
| `endpoint` | `string` | No | Custom GraphQL endpoint |

### Voter Registration Methods

```typescript
// Register as voter
async registerVoter(params: RegisterVoterParams): Promise<boolean>

// Get own voter info
async getMyVoterInfo(): Promise<VoterInfo | null>

// Deregister as voter
async deregisterVoter(): Promise<boolean>
```

### Voting Methods

```typescript
// Direct voting
async submitVote(params: SubmitVoteParams): Promise<boolean>

// Commit-reveal voting
async commitVote(params: CommitVoteParams): Promise<boolean>
async revealVote(params: RevealVoteParams): Promise<boolean>
```

### Stake Management Methods

```typescript
// Add stake
async addStake(amount: string): Promise<boolean>

// Withdraw stake
async withdrawStake(amount: string): Promise<boolean>

// Claim withdrawable tokens
async claimWithdrawableTokens(): Promise<boolean>
```

### Reward Methods

```typescript
// Get pending rewards
async getPendingRewards(): Promise<string>

// Claim rewards
async claimRewards(): Promise<boolean>
```

---

## Error Types

All errors extend `OracleError`:

```typescript
try {
    await client.createResolutionQuery(params);
} catch (error) {
    if (error instanceof ValidationError) {
        // Invalid parameters
    } else if (error instanceof NetworkError) {
        // Connection issues
    } else if (error instanceof QueryNotFoundError) {
        // Query doesn't exist
    } else if (error instanceof SubscriptionTimeoutError) {
        // Subscription timed out
    }
}
```

### Available Errors

| Error | Code | Description |
|-------|------|-------------|
| `ValidationError` | `VALIDATION_ERROR` | Invalid input parameters |
| `NetworkError` | `NETWORK_ERROR` | Connection/communication failure |
| `QueryNotFoundError` | `QUERY_NOT_FOUND` | Query doesn't exist |
| `MaxRetriesExceededError` | `MAX_RETRIES_EXCEEDED` | All retry attempts failed |
| `SubscriptionTimeoutError` | `SUBSCRIPTION_TIMEOUT` | Subscription timed out |
| `InsufficientFeeError` | `INSUFFICIENT_FEE` | Not enough fee |
| `InsufficientStakeError` | `INSUFFICIENT_STAKE` | Not enough stake |
| `VoterNotRegisteredError` | `VOTER_NOT_REGISTERED` | Voter not registered |
| `VoterAlreadyRegisteredError` | `VOTER_ALREADY_REGISTERED` | Already a voter |
| `AlreadyVotedError` | `ALREADY_VOTED` | Already voted on query |
| `ProtocolPausedError` | `PROTOCOL_PAUSED` | Protocol is paused |

---

## Type Definitions

### Decision Strategies

```typescript
type DecisionStrategy = 
    | 'Majority'           // Simple majority vote
    | 'Median'             // Median value (for numeric outcomes)
    | 'WeightedByStake'    // Votes weighted by stake amount
    | 'WeightedByReputation'; // Votes weighted by voter reputation
```

### Query Status

```typescript
type QueryStatus = 'Active' | 'Resolved' | 'Expired' | 'Cancelled';
```

### Voting Phase

```typescript
type VotingPhase = 'Commit' | 'Reveal' | 'Completed';
```

---

## Best Practices

### For External DApps

1. **Always use `ExternalDAppClient`** - Never use `InternalDashboardClient`

2. **Handle all error types** - Implement proper error handling for network issues and validation errors

3. **Use `referenceId`** - Pass your internal ID (e.g., market_id) to correlate resolution with your records

4. **Subscribe with appropriate timeout** - Set timeout based on expected resolution time

5. **Implement fallback** - If subscription times out, manually check resolution

### For Alethea Dashboard

1. **Validate voter registration** - Check if user is registered before showing voting UI

2. **Display stake requirements** - Show minimum stake (100 ALTH) clearly

3. **Handle commit-reveal phases** - Track which phase is active and guide voters accordingly

4. **Show pending rewards** - Display claimable rewards prominently

# Best Practices

Recommended patterns and practices for using the Alethea Oracle SDK.

## Configuration

### Use Environment Variables

Store sensitive configuration in environment variables:

```typescript
// .env
REGISTRY_ID=your-registry-id
CHAIN_ID=your-chain-id
CALLBACK_CHAIN_ID=your-callback-chain
CALLBACK_APP_ID=your-callback-app

// app.ts
import dotenv from 'dotenv';
dotenv.config();

const client = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
});
```

### Singleton Pattern

Create a single client instance and reuse it:

```typescript
// oracle-client.ts
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';

let clientInstance: AletheaOracleClient | null = null;

export function getOracleClient(): AletheaOracleClient {
  if (!clientInstance) {
    clientInstance = new AletheaOracleClient({
      registryId: process.env.REGISTRY_ID!,
      chainId: process.env.CHAIN_ID!,
      retryAttempts: 5,
      retryDelay: 2000,
    });
  }
  return clientInstance;
}

// Usage in other files
import { getOracleClient } from './oracle-client';

const client = getOracleClient();
await client.registerMarket(params);
```

### Configure Retry Behavior

Adjust retry settings based on your needs:

```typescript
// For critical operations - more retries
const criticalClient = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
  retryAttempts: 10,
  retryDelay: 3000,
});

// For non-critical operations - fewer retries
const normalClient = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
  retryAttempts: 3,
  retryDelay: 1000,
});
```

## Market Registration

### Validate Before Registering

Validate parameters before making API calls:

```typescript
function validateMarketParams(params: RegisterMarketParams): void {
  if (!params.question || params.question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (params.outcomes.length < 2 || params.outcomes.length > 10) {
    throw new Error('Must have 2-10 outcomes');
  }

  const deadline = parseInt(params.deadline);
  if (deadline <= Date.now() * 1000) {
    throw new Error('Deadline must be in the future');
  }

  // Check for duplicate outcomes
  const uniqueOutcomes = new Set(params.outcomes);
  if (uniqueOutcomes.size !== params.outcomes.length) {
    throw new Error('Outcomes must be unique');
  }
}

// Usage
try {
  validateMarketParams(params);
  await client.registerMarket(params);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Use Descriptive Questions

Write clear, unambiguous questions:

```typescript
// ❌ Bad
question: 'BTC price?'

// ✅ Good
question: 'Will Bitcoin (BTC) close above $100,000 on December 31, 2024?'

// ❌ Bad
question: 'Will it happen?'

// ✅ Good
question: 'Will the Federal Reserve raise interest rates in Q1 2024?'
```

### Set Appropriate Deadlines

Give enough time for voting and resolution:

```typescript
// ❌ Too short (1 hour)
deadline: String(Date.now() * 1000 + 3600000000)

// ✅ Good (24 hours minimum)
deadline: String(Date.now() * 1000 + 86400000000)

// ✅ Better (7 days for important markets)
deadline: String(Date.now() * 1000 + 7 * 86400000000)
```

### Calculate Fees Appropriately

Consider market complexity when setting fees:

```typescript
function calculateFee(outcomes: string[], durationDays: number): string {
  const baseFee = 100;
  const outcomeMultiplier = outcomes.length;
  const durationMultiplier = Math.ceil(durationDays / 7);
  
  const totalFee = baseFee * outcomeMultiplier * durationMultiplier;
  return String(totalFee);
}

// Usage
const fee = calculateFee(params.outcomes, 30);
await client.registerMarket({ ...params, fee });
```

## Subscription Management

### Always Unsubscribe

Prevent memory leaks by unsubscribing when done:

```typescript
// ✅ Good
const unsubscribe = await client.subscribeToResolution(
  marketId,
  (resolution, error) => {
    if (resolution) {
      handleResolution(resolution);
      unsubscribe();  // Clean up
    }
  }
);

// In React
useEffect(() => {
  let unsubscribe: (() => void) | null = null;

  const subscribe = async () => {
    unsubscribe = await client.subscribeToResolution(marketId, callback);
  };

  subscribe();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [marketId]);
```

### Set Reasonable Timeouts

Match timeout to market deadline:

```typescript
// Market resolves in 24 hours
const deadline = Date.now() * 1000 + 86400000000;

await client.subscribeToResolution(
  marketId,
  callback,
  {
    pollInterval: 10000,  // Poll every 10 seconds
    timeout: 90000000,    // Timeout after 25 hours (deadline + buffer)
  }
);
```

### Handle Subscription Errors

Always handle errors in subscription callbacks:

```typescript
await client.subscribeToResolution(
  marketId,
  (resolution, error) => {
    if (error) {
      console.error('Subscription error:', error);
      
      // Log for monitoring
      logger.error('Market subscription failed', {
        marketId,
        error: error.message,
      });
      
      // Maybe retry or notify admin
      return;
    }

    // Handle resolution
    handleResolution(resolution);
  }
);
```

## Error Handling

### Use Typed Error Handling

Check error types for appropriate handling:

```typescript
import {
  ValidationError,
  NetworkError,
  InsufficientFeeError,
} from 'alethea-network-oracle-sdk';

try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof ValidationError) {
    // User error - show message
    showUserError(error.message);
  } else if (error instanceof NetworkError) {
    // Transient error - retry
    await retryOperation();
  } else if (error instanceof InsufficientFeeError) {
    // Fee error - adjust and retry
    params.fee = error.required;
    await client.registerMarket(params);
  } else {
    // Unexpected error - log and alert
    logger.error('Unexpected error', { error });
    alertAdmin(error);
  }
}
```

### Implement Graceful Degradation

Handle failures gracefully:

```typescript
async function getMarketWithFallback(marketId: number) {
  try {
    return await client.getMarketStatus(marketId);
  } catch (error) {
    // Log error
    logger.warn('Failed to fetch market status', { marketId, error });
    
    // Return cached data or default
    return getCachedMarketStatus(marketId) || {
      id: marketId,
      status: 'UNKNOWN',
      message: 'Unable to fetch current status',
    };
  }
}
```

## Performance

### Batch Operations

When creating multiple markets, batch them:

```typescript
async function createMarkets(marketParams: RegisterMarketParams[]) {
  const results = await Promise.allSettled(
    marketParams.map(params => client.registerMarket(params))
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<any>).value);

  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason);

  return { successful, failed };
}
```

### Cache Market Status

Cache frequently accessed market data:

```typescript
class MarketCache {
  private cache = new Map<number, { status: MarketStatus; timestamp: number }>();
  private ttl = 10000; // 10 seconds

  async getStatus(marketId: number): Promise<MarketStatus> {
    const cached = this.cache.get(marketId);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.status;
    }

    const status = await client.getMarketStatus(marketId);
    this.cache.set(marketId, { status, timestamp: Date.now() });
    
    return status;
  }

  invalidate(marketId: number) {
    this.cache.delete(marketId);
  }
}
```

### Optimize Polling Intervals

Adjust polling based on market status:

```typescript
async function smartSubscribe(marketId: number) {
  const status = await client.getMarketStatus(marketId);
  
  let pollInterval: number;
  
  if (status.status === 'ACTIVE') {
    pollInterval = 60000; // Poll every minute
  } else if (status.status === 'VOTING') {
    pollInterval = 10000; // Poll every 10 seconds
  } else {
    pollInterval = 5000; // Poll every 5 seconds
  }

  return client.subscribeToResolution(
    marketId,
    callback,
    { pollInterval }
  );
}
```

## Security

### Validate Callback Data

Always validate data received in callbacks:

```typescript
function isValidResolution(resolution: any): resolution is Resolution {
  return (
    typeof resolution === 'object' &&
    typeof resolution.marketId === 'number' &&
    typeof resolution.outcome === 'number' &&
    typeof resolution.resolvedAt === 'string'
  );
}

await client.subscribeToResolution(marketId, (resolution, error) => {
  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!isValidResolution(resolution)) {
    console.error('Invalid resolution data');
    return;
  }

  // Safe to use resolution
  handleResolution(resolution);
});
```

### Sanitize User Input

Sanitize user-provided data:

```typescript
function sanitizeQuestion(question: string): string {
  return question
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 500); // Limit length
}

function sanitizeOutcomes(outcomes: string[]): string[] {
  return outcomes
    .map(o => o.trim())
    .filter(o => o.length > 0)
    .slice(0, 10); // Max 10 outcomes
}

// Usage
const params = {
  question: sanitizeQuestion(userInput.question),
  outcomes: sanitizeOutcomes(userInput.outcomes),
  // ...
};
```

### Use HTTPS Endpoints

Always use HTTPS for production:

```typescript
// ❌ Bad
endpoint: 'http://node.example.com/graphql'

// ✅ Good
endpoint: 'https://node.example.com/graphql'
```

## Monitoring

### Log Important Events

Log key operations for monitoring:

```typescript
async function registerMarketWithLogging(params: RegisterMarketParams) {
  const startTime = Date.now();
  
  logger.info('Registering market', { params });

  try {
    const result = await client.registerMarket(params);
    
    logger.info('Market registered', {
      marketId: result.marketId,
      duration: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    logger.error('Market registration failed', {
      error: error.message,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

### Track Metrics

Monitor SDK performance:

```typescript
class MetricsCollector {
  private metrics = {
    registrations: { success: 0, failure: 0 },
    subscriptions: { active: 0, completed: 0, failed: 0 },
    averageResponseTime: 0,
  };

  recordRegistration(success: boolean, duration: number) {
    if (success) {
      this.metrics.registrations.success++;
    } else {
      this.metrics.registrations.failure++;
    }
    this.updateAverageResponseTime(duration);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

## Testing

### Mock the Client

Mock the SDK for testing:

```typescript
// __mocks__/alethea-network-oracle-sdk.ts
export class AletheaOracleClient {
  async registerMarket(params: any) {
    return { marketId: 123, registeredAt: new Date(), estimatedResolution: new Date() };
  }

  async getMarketStatus(marketId: number) {
    return { id: marketId, status: 'ACTIVE' };
  }

  async subscribeToResolution(marketId: number, callback: any) {
    setTimeout(() => {
      callback({ marketId, outcome: 0, resolvedAt: new Date().toISOString() }, null);
    }, 100);
    return () => {};
  }
}

// test.ts
jest.mock('alethea-network-oracle-sdk');

test('creates market', async () => {
  const result = await service.createMarket(params);
  expect(result.marketId).toBe(123);
});
```

### Test Error Scenarios

Test error handling:

```typescript
test('handles validation error', async () => {
  const client = new AletheaOracleClient(config);
  
  await expect(
    client.registerMarket({
      question: '',
      outcomes: ['Yes'],
      // ...
    })
  ).rejects.toThrow(ValidationError);
});
```

## Voter Reward Management (Internal Dashboard Only)

### Two-Step Reward Withdrawal

Rewards now follow a two-step process for security:

```typescript
// Step 1: Move pending rewards to withdrawable balance
await client.claimRewards();

// Check withdrawable balance
const info = await client.getMyVoterInfo();
console.log('Withdrawable:', info.withdrawableBalance);

// Step 2: Send tokens to wallet
await client.claimWithdrawableTokens();
```

### Understand Stake vs Withdrawable Balance

```typescript
// stake: Locked in system, used for voting power
// withdrawableBalance: Ready to claim as actual tokens

const info = await client.getMyVoterInfo();

// Total voting power = stake
console.log('Voting Power:', info.stake);

// Can withdraw stake (if not locked)
console.log('Available to Unstake:', info.availableStake);

// Tokens ready to send to wallet
console.log('Ready to Claim:', info.withdrawableBalance);

// Rewards waiting to be claimed
console.log('Pending Rewards:', info.pendingRewards);
```

### Claim Flow Summary

```
┌─────────────┐   vote correctly   ┌─────────────┐   claimRewards()   ┌──────────────┐   claimWithdrawableTokens()   ┌─────────┐
│   Voting    │ ─────────────────► │  Pending    │ ─────────────────► │ Withdrawable │ ────────────────────────────► │ Wallet  │
│             │                    │  Rewards    │                    │   Balance    │                               │ (Tokens)│
└─────────────┘                    └─────────────┘                    └──────────────┘                               └─────────┘
```

## See Also

- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [Error Handling](./error-handling.md)
- [Troubleshooting](./troubleshooting.md)

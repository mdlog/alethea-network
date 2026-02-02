# Error Handling

Guide to handling errors in the Alethea Oracle SDK.

## Error Types

The SDK provides typed errors that extend the base `OracleError` class. This allows you to handle different error scenarios appropriately.

### Error Hierarchy

```
OracleError (base)
├── ValidationError
├── NetworkError
├── MarketNotFoundError
├── InsufficientFeeError
├── MaxRetriesExceededError
└── SubscriptionTimeoutError
```

## Common Error Scenarios

### 1. Validation Errors

Occur when input parameters don't meet requirements.

```typescript
import { AletheaOracleClient, ValidationError } from 'alethea-network-oracle-sdk';

try {
  await client.registerMarket({
    question: '',  // Empty question
    outcomes: ['Yes'],  // Only 1 outcome (need 2-10)
    deadline: String(Date.now() - 1000),  // Past deadline
    // ...
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    // Fix the parameters and retry
  }
}
```

**Common causes:**
- Empty question string
- Less than 2 outcomes
- More than 10 outcomes
- Deadline in the past
- Invalid fee format

### 2. Network Errors

Occur when network requests fail.

```typescript
import { NetworkError } from 'alethea-network-oracle-sdk';

try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    
    // Retry logic
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Retry the operation
  }
}
```

**Common causes:**
- No internet connection
- Invalid endpoint URL
- Server is down
- Request timeout
- GraphQL errors

### 3. Insufficient Fee Errors

Occur when the registration fee is too low.

```typescript
import { InsufficientFeeError } from 'alethea-network-oracle-sdk';

try {
  await client.registerMarket({
    // ...
    fee: '10',  // Too low
  });
} catch (error) {
  if (error instanceof InsufficientFeeError) {
    console.error(`Fee too low!`);
    console.error(`Required: ${error.required}`);
    console.error(`Provided: ${error.provided}`);
    
    // Retry with correct fee
    await client.registerMarket({
      // ...
      fee: error.required,
    });
  }
}
```

### 4. Market Not Found Errors

Occur when querying a non-existent market.

```typescript
import { MarketNotFoundError } from 'alethea-network-oracle-sdk';

try {
  const status = await client.getMarketStatus(999999);
} catch (error) {
  if (error instanceof MarketNotFoundError) {
    console.error('Market does not exist');
    // Handle gracefully - maybe show error to user
  }
}
```

### 5. Max Retries Exceeded

Occur when all retry attempts fail.

```typescript
import { MaxRetriesExceededError } from 'alethea-network-oracle-sdk';

try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof MaxRetriesExceededError) {
    console.error('All retry attempts failed');
    // Log for investigation
    // Maybe notify admin
  }
}
```

### 6. Subscription Timeout

Occur when waiting too long for resolution.

```typescript
import { SubscriptionTimeoutError } from 'alethea-network-oracle-sdk';

const unsubscribe = await client.subscribeToResolution(
  marketId,
  (resolution, error) => {
    if (error instanceof SubscriptionTimeoutError) {
      console.log('Subscription timed out');
      // Check market status manually
      // Or extend timeout and resubscribe
    }
  },
  {
    timeout: 3600000,  // 1 hour
  }
);
```

## Best Practices

### 1. Always Use Try-Catch

Wrap all SDK calls in try-catch blocks:

```typescript
async function safeOperation() {
  try {
    const result = await client.registerMarket(params);
    return result;
  } catch (error) {
    // Handle error
    console.error('Operation failed:', error);
    throw error;  // Re-throw if needed
  }
}
```

### 2. Check Error Types

Use `instanceof` to handle specific errors:

```typescript
try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  } else if (error instanceof NetworkError) {
    // Handle network error
  } else {
    // Handle unexpected error
  }
}
```

### 3. Provide User-Friendly Messages

Don't expose technical errors to end users:

```typescript
try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof ValidationError) {
    showUserMessage('Please check your input and try again');
  } else if (error instanceof NetworkError) {
    showUserMessage('Connection error. Please try again later');
  } else {
    showUserMessage('Something went wrong. Please contact support');
    logError(error);  // Log for debugging
  }
}
```

### 4. Implement Retry Logic

For transient errors, implement retry with backoff:

```typescript
async function registerWithRetry(params, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.registerMarket(params);
    } catch (error) {
      if (error instanceof NetworkError && attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt);  // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 5. Log Errors Properly

Include context in error logs:

```typescript
try {
  await client.registerMarket(params);
} catch (error) {
  console.error('Market registration failed', {
    error: error.message,
    code: error.code,
    params: params,
    timestamp: new Date().toISOString(),
  });
}
```

## Error Response Format

All errors have a consistent structure:

```typescript
{
  name: string;      // Error class name
  code: string;      // Error code
  message: string;   // Human-readable message
  cause?: any;       // Original error (if any)
}
```

## Error Codes

| Code | Error Type | Description |
|------|-----------|-------------|
| `VALIDATION_ERROR` | ValidationError | Invalid input parameters |
| `NETWORK_ERROR` | NetworkError | Network request failed |
| `MARKET_NOT_FOUND` | MarketNotFoundError | Market doesn't exist |
| `INSUFFICIENT_FEE` | InsufficientFeeError | Registration fee too low |
| `MAX_RETRIES_EXCEEDED` | MaxRetriesExceededError | All retries failed |
| `SUBSCRIPTION_TIMEOUT` | SubscriptionTimeoutError | Subscription timed out |

## Debugging Tips

### 1. Enable Verbose Logging

```typescript
const client = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
});

// Wrap methods to log calls
const originalRegister = client.registerMarket.bind(client);
client.registerMarket = async (params) => {
  console.log('Registering market:', params);
  try {
    const result = await originalRegister(params);
    console.log('Registration successful:', result);
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

### 2. Check Network Connectivity

```typescript
async function checkConnectivity() {
  try {
    const response = await fetch(client.endpoint);
    console.log('Endpoint reachable:', response.ok);
  } catch (error) {
    console.error('Endpoint unreachable:', error);
  }
}
```

### 3. Validate Parameters Before Calling

```typescript
function validateParams(params: RegisterMarketParams): string[] {
  const errors: string[] = [];
  
  if (!params.question || params.question.trim().length === 0) {
    errors.push('Question is required');
  }
  
  if (!params.outcomes || params.outcomes.length < 2) {
    errors.push('At least 2 outcomes required');
  }
  
  if (params.outcomes && params.outcomes.length > 10) {
    errors.push('Maximum 10 outcomes allowed');
  }
  
  const deadline = parseInt(params.deadline);
  if (isNaN(deadline) || deadline <= Date.now() * 1000) {
    errors.push('Deadline must be in the future');
  }
  
  return errors;
}

// Usage
const errors = validateParams(params);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  return;
}

await client.registerMarket(params);
```

## Production Error Handling

Example of production-ready error handling:

```typescript
import { AletheaOracleClient, OracleError } from 'alethea-network-oracle-sdk';

class MarketService {
  private client: AletheaOracleClient;
  private logger: Logger;

  constructor(logger: Logger) {
    this.client = new AletheaOracleClient({
      registryId: process.env.REGISTRY_ID!,
      chainId: process.env.CHAIN_ID!,
    });
    this.logger = logger;
  }

  async createMarket(params: RegisterMarketParams): Promise<number> {
    const requestId = generateRequestId();
    
    this.logger.info('Creating market', { requestId, params });

    try {
      const { marketId } = await this.client.registerMarket(params);
      
      this.logger.info('Market created', { requestId, marketId });
      
      return marketId;

    } catch (error) {
      this.logger.error('Market creation failed', {
        requestId,
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error instanceof OracleError) {
        // Known error - handle appropriately
        throw new ApplicationError(
          `Failed to create market: ${error.message}`,
          error.code
        );
      } else {
        // Unknown error - log and alert
        this.logger.alert('Unexpected error', { requestId, error });
        throw new ApplicationError(
          'An unexpected error occurred',
          'UNKNOWN_ERROR'
        );
      }
    }
  }
}
```

## See Also

- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [Best Practices](./best-practices.md)
- [Troubleshooting](./troubleshooting.md)

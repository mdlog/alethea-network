# Troubleshooting

Common issues and solutions when using the Alethea Oracle SDK.

## Installation Issues

### Package Not Found

**Problem:** `npm install alethea-network-oracle-sdk@beta` fails with "404 Not Found"

**Solutions:**
1. Check package name spelling
2. Verify you're using the `@beta` tag
3. Check npm registry is accessible:
   ```bash
   npm config get registry
   ```
4. Try clearing npm cache:
   ```bash
   npm cache clean --force
   npm install alethea-network-oracle-sdk@beta
   ```

### TypeScript Errors

**Problem:** TypeScript can't find type definitions

**Solution:**
```bash
# Ensure TypeScript is installed
npm install --save-dev typescript

# Check tsconfig.json includes node_modules
{
  "compilerOptions": {
    "moduleResolution": "node"
  }
}
```

## Configuration Issues

### Invalid Registry ID

**Problem:** `NetworkError: 404 Not Found` when calling methods

**Cause:** Incorrect `registryId` in configuration

**Solution:**
1. Verify registry ID from deployment:
   ```bash
   linera project publish
   # Note the application ID
   ```
2. Update configuration:
   ```typescript
   const client = new AletheaOracleClient({
     registryId: 'correct-registry-id',
     chainId: 'your-chain-id',
   });
   ```

### Endpoint Connection Failed

**Problem:** `NetworkError: Failed to fetch`

**Solutions:**
1. Check endpoint URL is correct
2. Verify endpoint is accessible:
   ```bash
   curl https://your-endpoint.com/graphql
   ```
3. Check firewall/network settings
4. Try with explicit endpoint:
   ```typescript
   const client = new AletheaOracleClient({
     registryId: 'registry-id',
     chainId: 'chain-id',
     endpoint: 'https://your-node.com/graphql',
   });
   ```

## Market Registration Issues

### Validation Errors

**Problem:** `ValidationError: At least 2 outcomes are required`

**Solution:** Ensure outcomes array has 2-10 items:
```typescript
// ❌ Wrong
outcomes: ['Yes']

// ✅ Correct
outcomes: ['Yes', 'No']
```

**Problem:** `ValidationError: Deadline must be in the future`

**Solution:** Use microseconds and ensure future timestamp:
```typescript
// ❌ Wrong (milliseconds)
deadline: String(Date.now() + 86400000)

// ✅ Correct (microseconds)
deadline: String(Date.now() * 1000 + 86400000000)
```

### Insufficient Fee Error

**Problem:** `InsufficientFeeError: Fee too low`

**Solution:**
```typescript
try {
  await client.registerMarket(params);
} catch (error) {
  if (error instanceof InsufficientFeeError) {
    // Use the required fee
    params.fee = error.required;
    await client.registerMarket(params);
  }
}
```

### Network Timeout

**Problem:** Request times out during registration

**Solutions:**
1. Increase retry attempts:
   ```typescript
   const client = new AletheaOracleClient({
     registryId: 'registry-id',
     chainId: 'chain-id',
     retryAttempts: 10,
     retryDelay: 3000,
   });
   ```

2. Check network connectivity
3. Verify node is responsive

## Subscription Issues

### Subscription Never Resolves

**Problem:** Callback never called, market seems stuck

**Debugging steps:**
1. Check market status manually:
   ```typescript
   const status = await client.getMarketStatus(marketId);
   console.log('Status:', status);
   ```

2. Verify deadline has passed:
   ```typescript
   const deadline = parseInt(params.deadline);
   const now = Date.now() * 1000;
   console.log('Deadline passed:', now > deadline);
   ```

3. Check if enough voters have voted:
   ```typescript
   // Query voter status via GraphQL
   ```

4. Increase timeout:
   ```typescript
   await client.subscribeToResolution(
     marketId,
     callback,
     {
       timeout: 172800000, // 48 hours
     }
   );
   ```

### Subscription Timeout

**Problem:** `SubscriptionTimeoutError` thrown

**Solutions:**
1. Increase timeout to match market deadline:
   ```typescript
   const deadline = parseInt(params.deadline);
   const now = Date.now() * 1000;
   const timeUntilDeadline = (deadline - now) / 1000; // Convert to ms
   const timeout = timeUntilDeadline + 3600000; // Add 1 hour buffer

   await client.subscribeToResolution(
     marketId,
     callback,
     { timeout }
   );
   ```

2. Check market manually if timeout occurs:
   ```typescript
   await client.subscribeToResolution(
     marketId,
     async (resolution, error) => {
       if (error instanceof SubscriptionTimeoutError) {
         // Check status manually
         const status = await client.getMarketStatus(marketId);
         if (status.status === 'RESOLVED') {
           handleResolution({
             marketId,
             outcome: status.finalOutcome!,
             resolvedAt: status.resolvedAt!,
           });
         }
       }
     },
     { timeout: 3600000 }
   );
   ```

### Memory Leak from Subscriptions

**Problem:** Application memory grows over time

**Cause:** Not unsubscribing from completed subscriptions

**Solution:**
```typescript
// ✅ Always unsubscribe
const unsubscribe = await client.subscribeToResolution(
  marketId,
  (resolution, error) => {
    if (resolution || error) {
      unsubscribe(); // Clean up
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

## Query Issues

### Market Not Found

**Problem:** `MarketNotFoundError` when querying market

**Solutions:**
1. Verify market ID is correct
2. Check market was created successfully:
   ```typescript
   const { marketId } = await client.registerMarket(params);
   console.log('Created market:', marketId);
   
   // Wait a moment for propagation
   await new Promise(resolve => setTimeout(resolve, 1000));
   
   const status = await client.getMarketStatus(marketId);
   ```

3. Ensure querying correct chain/registry

### Stale Data

**Problem:** `getMarketStatus()` returns outdated information

**Cause:** Caching or propagation delay

**Solutions:**
1. Add delay before querying:
   ```typescript
   await client.registerMarket(params);
   await new Promise(resolve => setTimeout(resolve, 2000));
   const status = await client.getMarketStatus(marketId);
   ```

2. Implement retry logic:
   ```typescript
   async function getStatusWithRetry(marketId: number, maxAttempts = 5) {
     for (let i = 0; i < maxAttempts; i++) {
       try {
         return await client.getMarketStatus(marketId);
       } catch (error) {
         if (i === maxAttempts - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   ```

## Performance Issues

### Slow Response Times

**Problem:** API calls take too long

**Solutions:**
1. Check network latency:
   ```bash
   ping your-node-domain.com
   ```

2. Use closer endpoint if available

3. Implement caching:
   ```typescript
   const cache = new Map<number, { status: MarketStatus; timestamp: number }>();
   
   async function getCachedStatus(marketId: number) {
     const cached = cache.get(marketId);
     if (cached && Date.now() - cached.timestamp < 10000) {
       return cached.status;
     }
     
     const status = await client.getMarketStatus(marketId);
     cache.set(marketId, { status, timestamp: Date.now() });
     return status;
   }
   ```

4. Batch operations:
   ```typescript
   const results = await Promise.all([
     client.getMarketStatus(1),
     client.getMarketStatus(2),
     client.getMarketStatus(3),
   ]);
   ```

### High Polling Frequency

**Problem:** Too many requests from subscriptions

**Solution:** Increase poll interval:
```typescript
await client.subscribeToResolution(
  marketId,
  callback,
  {
    pollInterval: 30000, // Poll every 30 seconds instead of 5
  }
);
```

## Error Debugging

### Enable Verbose Logging

Add logging to track issues:

```typescript
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  console.log('Fetch request:', args[0]);
  const response = await originalFetch(...args);
  console.log('Fetch response:', response.status);
  return response;
};
```

### Inspect GraphQL Errors

Log full error details:

```typescript
try {
  await client.registerMarket(params);
} catch (error) {
  console.error('Full error:', JSON.stringify(error, null, 2));
  console.error('Stack trace:', error.stack);
}
```

### Check SDK Version

Ensure you're using the latest version:

```bash
npm list alethea-network-oracle-sdk
npm update alethea-network-oracle-sdk@beta
```

## Common Error Messages

### "You may not perform that action with these credentials"

**Cause:** Authentication issue (not applicable for SDK, but for npm publish)

**Solution:** This is an npm publishing error, not SDK usage error

### "Cannot read property 'registerMarket' of undefined"

**Cause:** Client not initialized properly

**Solution:**
```typescript
// ❌ Wrong
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';
const client = AletheaOracleClient({ ... }); // Missing 'new'

// ✅ Correct
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';
const client = new AletheaOracleClient({ ... });
```

### "Module not found: Can't resolve 'alethea-network-oracle-sdk'"

**Cause:** Package not installed

**Solution:**
```bash
npm install alethea-network-oracle-sdk@beta
```

## Getting Help

If you're still experiencing issues:

1. **Check Documentation:**
   - [API Reference](./api-reference.md)
   - [Examples](./examples.md)
   - [Best Practices](./best-practices.md)

2. **Search Issues:**
   - Check [GitHub Issues](https://github.com/alethea-network/alethea-oracle-sdk/issues)
   - Search for similar problems

3. **Create Issue:**
   - Provide SDK version
   - Include error messages
   - Share minimal reproduction code
   - Describe expected vs actual behavior

4. **Community Support:**
   - Join Discord/Telegram
   - Ask in community forums

## Diagnostic Checklist

When reporting issues, include:

- [ ] SDK version (`npm list alethea-network-oracle-sdk`)
- [ ] Node.js version (`node --version`)
- [ ] Operating system
- [ ] Full error message and stack trace
- [ ] Minimal code to reproduce
- [ ] Configuration (without sensitive data)
- [ ] Network connectivity status
- [ ] Endpoint accessibility

## See Also

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Error Handling](./error-handling.md)
- [Best Practices](./best-practices.md)

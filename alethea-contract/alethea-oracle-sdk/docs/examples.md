# Examples

Practical examples demonstrating common use cases for the Alethea Oracle SDK.

## Table of Contents

- [Basic Market Registration](#basic-market-registration)
- [Subscription with Timeout](#subscription-with-timeout)
- [Error Handling](#error-handling)
- [Multiple Markets](#multiple-markets)
- [Integration with Express.js](#integration-with-expressjs)
- [React Integration](#react-integration)

## Basic Market Registration

Simple example of registering a market and waiting for resolution.

```typescript
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';

async function createMarket() {
  const client = new AletheaOracleClient({
    registryId: process.env.REGISTRY_ID!,
    chainId: process.env.CHAIN_ID!,
  });

  const { marketId } = await client.registerMarket({
    question: 'Will Bitcoin reach $100k in 2024?',
    outcomes: ['Yes', 'No'],
    deadline: String(Date.now() * 1000 + 30 * 86400000000), // 30 days
    callbackChainId: process.env.CALLBACK_CHAIN_ID!,
    callbackApplicationId: process.env.CALLBACK_APP_ID!,
    callbackMethod: 'handleResolution',
    fee: '100',
  });

  console.log(`Market created with ID: ${marketId}`);
  return marketId;
}

createMarket().catch(console.error);
```

## Subscription with Timeout

Example showing how to handle subscription timeouts.

```typescript
import { 
  AletheaOracleClient,
  SubscriptionTimeoutError 
} from 'alethea-network-oracle-sdk';

async function monitorMarket(marketId: number) {
  const client = new AletheaOracleClient({
    registryId: process.env.REGISTRY_ID!,
    chainId: process.env.CHAIN_ID!,
  });

  try {
    const unsubscribe = await client.subscribeToResolution(
      marketId,
      (resolution, error) => {
        if (error) {
          if (error instanceof SubscriptionTimeoutError) {
            console.log('Market resolution timed out');
            // Handle timeout - maybe check manually
          } else {
            console.error('Subscription error:', error);
          }
          return;
        }

        console.log('Market resolved!');
        console.log(`Outcome: ${resolution.outcome}`);
        console.log(`Confidence: ${resolution.confidence}%`);
        
        // Clean up
        unsubscribe();
      },
      {
        pollInterval: 10000, // Poll every 10 seconds
        timeout: 3600000,    // Timeout after 1 hour
      }
    );

    console.log('Monitoring market...');
  } catch (error) {
    console.error('Failed to subscribe:', error);
  }
}

monitorMarket(123).catch(console.error);
```

## Error Handling

Comprehensive error handling example.

```typescript
import { 
  AletheaOracleClient,
  ValidationError,
  NetworkError,
  InsufficientFeeError,
  MarketNotFoundError 
} from 'alethea-network-oracle-sdk';

async function robustMarketCreation() {
  const client = new AletheaOracleClient({
    registryId: process.env.REGISTRY_ID!,
    chainId: process.env.CHAIN_ID!,
    retryAttempts: 5,
    retryDelay: 2000,
  });

  try {
    const { marketId } = await client.registerMarket({
      question: 'Will it rain tomorrow?',
      outcomes: ['Yes', 'No'],
      deadline: String(Date.now() * 1000 + 86400000000),
      callbackChainId: process.env.CALLBACK_CHAIN_ID!,
      callbackApplicationId: process.env.CALLBACK_APP_ID!,
      callbackMethod: 'handleResolution',
      fee: '100',
    });

    console.log(`Success! Market ID: ${marketId}`);
    return marketId;

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Invalid parameters:', error.message);
      // Fix parameters and retry
      
    } else if (error instanceof InsufficientFeeError) {
      console.error(`Fee too low. Required: ${error.required}`);
      // Increase fee and retry
      
    } else if (error instanceof NetworkError) {
      console.error('Network error:', error.message);
      // Check connectivity, retry later
      
    } else {
      console.error('Unexpected error:', error);
      // Log for debugging
    }
    
    throw error;
  }
}

robustMarketCreation().catch(console.error);
```

## Multiple Markets

Managing multiple markets simultaneously.

```typescript
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';

class MarketManager {
  private client: AletheaOracleClient;
  private subscriptions: Map<number, () => void> = new Map();

  constructor() {
    this.client = new AletheaOracleClient({
      registryId: process.env.REGISTRY_ID!,
      chainId: process.env.CHAIN_ID!,
    });
  }

  async createMarket(question: string, outcomes: string[], deadline: string) {
    const { marketId } = await this.client.registerMarket({
      question,
      outcomes,
      deadline,
      callbackChainId: process.env.CALLBACK_CHAIN_ID!,
      callbackApplicationId: process.env.CALLBACK_APP_ID!,
      callbackMethod: 'handleResolution',
      fee: '100',
    });

    console.log(`Created market ${marketId}: ${question}`);
    
    // Start monitoring
    await this.monitorMarket(marketId);
    
    return marketId;
  }

  async monitorMarket(marketId: number) {
    const unsubscribe = await this.client.subscribeToResolution(
      marketId,
      (resolution, error) => {
        if (error) {
          console.error(`Market ${marketId} error:`, error);
          return;
        }

        console.log(`Market ${marketId} resolved: outcome ${resolution.outcome}`);
        
        // Clean up subscription
        this.subscriptions.delete(marketId);
        unsubscribe();
      }
    );

    this.subscriptions.set(marketId, unsubscribe);
  }

  async getMarketStatus(marketId: number) {
    return await this.client.getMarketStatus(marketId);
  }

  cleanup() {
    // Unsubscribe from all markets
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}

// Usage
async function main() {
  const manager = new MarketManager();

  try {
    // Create multiple markets
    await manager.createMarket(
      'Will Bitcoin reach $100k?',
      ['Yes', 'No'],
      String(Date.now() * 1000 + 30 * 86400000000)
    );

    await manager.createMarket(
      'Will Ethereum reach $5k?',
      ['Yes', 'No'],
      String(Date.now() * 1000 + 30 * 86400000000)
    );

    // Keep process alive
    process.on('SIGINT', () => {
      manager.cleanup();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    manager.cleanup();
  }
}

main();
```

## Integration with Express.js

REST API example using Express.js.

```typescript
import express from 'express';
import { AletheaOracleClient, ValidationError } from 'alethea-network-oracle-sdk';

const app = express();
app.use(express.json());

const client = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
});

// Store active subscriptions
const subscriptions = new Map<number, () => void>();

// Create market endpoint
app.post('/api/markets', async (req, res) => {
  try {
    const { question, outcomes, deadline, fee } = req.body;

    const { marketId } = await client.registerMarket({
      question,
      outcomes,
      deadline,
      callbackChainId: process.env.CALLBACK_CHAIN_ID!,
      callbackApplicationId: process.env.CALLBACK_APP_ID!,
      callbackMethod: 'handleResolution',
      fee: fee || '100',
    });

    // Start monitoring
    const unsubscribe = await client.subscribeToResolution(
      marketId,
      (resolution, error) => {
        if (error) {
          console.error(`Market ${marketId} error:`, error);
          return;
        }

        console.log(`Market ${marketId} resolved`);
        subscriptions.delete(marketId);
        unsubscribe();

        // Notify via webhook, database update, etc.
      }
    );

    subscriptions.set(marketId, unsubscribe);

    res.json({
      success: true,
      marketId,
      message: 'Market created successfully',
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
});

// Get market status endpoint
app.get('/api/markets/:id', async (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const status = await client.getMarketStatus(marketId);

    res.json({
      success: true,
      market: status,
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Market not found',
    });
  }
});

// Cleanup on shutdown
process.on('SIGINT', () => {
  subscriptions.forEach(unsubscribe => unsubscribe());
  process.exit(0);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## React Integration

Example React hook for market management.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { 
  AletheaOracleClient,
  MarketStatus,
  Resolution 
} from 'alethea-network-oracle-sdk';

// Initialize client (do this once, outside component)
const client = new AletheaOracleClient({
  registryId: process.env.REACT_APP_REGISTRY_ID!,
  chainId: process.env.REACT_APP_CHAIN_ID!,
});

// Custom hook for market management
export function useMarket(marketId: number | null) {
  const [status, setStatus] = useState<MarketStatus | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!marketId) return;

    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        setLoading(true);
        
        // Get initial status
        const initialStatus = await client.getMarketStatus(marketId);
        setStatus(initialStatus);

        // Subscribe to updates
        unsubscribe = await client.subscribeToResolution(
          marketId,
          (res, err) => {
            if (err) {
              setError(err);
              return;
            }

            setResolution(res);
            setLoading(false);
          }
        );

      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [marketId]);

  return { status, resolution, loading, error };
}

// Example component
export function MarketDisplay({ marketId }: { marketId: number }) {
  const { status, resolution, loading, error } = useMarket(marketId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!status) return <div>No market data</div>;

  return (
    <div>
      <h2>Market {marketId}</h2>
      <p>Status: {status.status}</p>
      
      {resolution && (
        <div>
          <h3>Resolved!</h3>
          <p>Outcome: {resolution.outcome}</p>
          <p>Confidence: {resolution.confidence}%</p>
        </div>
      )}
    </div>
  );
}
```

## See Also

- [API Reference](./api-reference.md)
- [Error Handling](./error-handling.md)
- [Best Practices](./best-practices.md)

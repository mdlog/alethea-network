# Getting Started

This guide will help you integrate the Alethea Oracle SDK into your application.

## Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- Basic understanding of TypeScript/JavaScript
- Access to a Linera node (or use the default endpoint)

## Installation

Install the SDK using npm:

```bash
npm install alethea-network-oracle-sdk@beta
```

Or using yarn:

```bash
yarn add alethea-network-oracle-sdk@beta
```

## Basic Setup

### 1. Import the SDK

```typescript
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';
```

### 2. Initialize the Client

```typescript
const client = new AletheaOracleClient({
  registryId: 'your-registry-application-id',
  chainId: 'your-chain-id',
  endpoint: 'https://your-node.com/graphql', // optional
  retryAttempts: 3, // optional, default: 3
  retryDelay: 1000, // optional, default: 1000ms
});
```

#### Configuration Options

- **registryId** (required): The application ID of the Oracle Registry on Linera
- **chainId** (required): Your application's chain ID
- **endpoint** (optional): GraphQL endpoint URL. If not provided, will be auto-generated from registryId
- **retryAttempts** (optional): Number of retry attempts for failed requests (default: 3)
- **retryDelay** (optional): Base delay in milliseconds between retries (default: 1000)

### 3. Register Your First Market

```typescript
try {
  const registration = await client.registerMarket({
    question: 'Will Bitcoin reach $100k by end of 2024?',
    outcomes: ['Yes', 'No'],
    deadline: String(Date.now() * 1000 + 86400000000), // 24 hours from now
    callbackChainId: 'your-callback-chain-id',
    callbackApplicationId: 'your-callback-app-id',
    callbackMethod: 'handleResolution',
    fee: '100', // Registration fee in tokens
  });

  console.log('Market registered with ID:', registration.marketId);
  console.log('Estimated resolution:', registration.estimatedResolution);
} catch (error) {
  console.error('Failed to register market:', error);
}
```

### 4. Subscribe to Resolution Updates

```typescript
const unsubscribe = await client.subscribeToResolution(
  registration.marketId,
  (resolution, error) => {
    if (error) {
      console.error('Subscription error:', error);
      return;
    }

    console.log('Market resolved!');
    console.log('Winning outcome:', resolution.outcome);
    console.log('Confidence:', resolution.confidence);
    console.log('Resolved at:', resolution.resolvedAt);

    // Handle the resolution in your application
    handleMarketResolution(resolution);
  },
  {
    pollInterval: 5000, // Poll every 5 seconds
    timeout: 86400000, // Timeout after 24 hours
  }
);

// Later, to stop polling
unsubscribe();
```

## Complete Example

Here's a complete example integrating all the steps:

```typescript
import { 
  AletheaOracleClient,
  ValidationError,
  NetworkError 
} from 'alethea-network-oracle-sdk';

async function main() {
  // Initialize client
  const client = new AletheaOracleClient({
    registryId: process.env.REGISTRY_ID!,
    chainId: process.env.CHAIN_ID!,
  });

  try {
    // Register market
    const { marketId } = await client.registerMarket({
      question: 'Will it rain tomorrow in San Francisco?',
      outcomes: ['Yes', 'No', 'Uncertain'],
      deadline: String(Date.now() * 1000 + 86400000000),
      callbackChainId: process.env.CALLBACK_CHAIN_ID!,
      callbackApplicationId: process.env.CALLBACK_APP_ID!,
      callbackMethod: 'handleResolution',
      fee: '100',
    });

    console.log(`Market ${marketId} registered successfully`);

    // Subscribe to resolution
    const unsubscribe = await client.subscribeToResolution(
      marketId,
      (resolution, error) => {
        if (error) {
          console.error('Error:', error.message);
          return;
        }

        console.log(`Market ${marketId} resolved:`);
        console.log(`- Outcome: ${resolution.outcome}`);
        console.log(`- Confidence: ${resolution.confidence}%`);
        
        // Clean up subscription
        unsubscribe();
      }
    );

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Invalid parameters:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('Network error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
```

## Environment Variables

It's recommended to store configuration in environment variables:

```bash
# .env file
REGISTRY_ID=your-registry-application-id
CHAIN_ID=your-chain-id
CALLBACK_CHAIN_ID=your-callback-chain-id
CALLBACK_APP_ID=your-callback-application-id
```

Then load them in your application:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const client = new AletheaOracleClient({
  registryId: process.env.REGISTRY_ID!,
  chainId: process.env.CHAIN_ID!,
});
```

## Next Steps

- Read the [API Reference](./api-reference.md) for detailed method documentation
- Check out [Examples](./examples.md) for more use cases
- Learn about [Error Handling](./error-handling.md)
- Review [Best Practices](./best-practices.md)

## Common Issues

If you encounter issues, check the [Troubleshooting Guide](./troubleshooting.md).

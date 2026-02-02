# Alethea Oracle SDK Documentation

Welcome to the Alethea Oracle SDK documentation. This SDK enables developers to integrate decentralized oracle services into their applications.

## Quick Links

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [Error Handling](./error-handling.md)
- [Best Practices](./best-practices.md)
- [Troubleshooting](./troubleshooting.md)

## What is Alethea Oracle?

Alethea Oracle is a decentralized oracle service built on the Linera blockchain that provides reliable, consensus-based resolution for prediction markets and other applications requiring external data verification.

## Key Features

- **Decentralized Resolution**: Markets are resolved through voter consensus
- **TypeScript Support**: Full TypeScript types for type-safe development
- **Automatic Polling**: Built-in subscription mechanism for resolution updates
- **Error Handling**: Comprehensive error types with actionable messages
- **Retry Logic**: Automatic retry with exponential backoff
- **Flexible Configuration**: Customizable endpoints and retry behavior

## Installation

```bash
npm install alethea-network-oracle-sdk@beta
```

## Quick Example

```typescript
import { AletheaOracleClient } from 'alethea-network-oracle-sdk';

const client = new AletheaOracleClient({
  registryId: 'your-registry-id',
  chainId: 'your-chain-id',
});

// Register a market
const { marketId } = await client.registerMarket({
  question: 'Will it rain tomorrow?',
  outcomes: ['Yes', 'No'],
  deadline: String(Date.now() * 1000 + 86400000000),
  callbackChainId: 'callback-chain',
  callbackApplicationId: 'callback-app',
  callbackMethod: 'handleResolution',
  fee: '100',
});

// Subscribe to resolution
await client.subscribeToResolution(marketId, (resolution, error) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Resolved:', resolution.outcome);
});
```

## Documentation Structure

This documentation is organized into the following sections:

### For New Users
- **Getting Started**: Installation, setup, and your first integration
- **Examples**: Common use cases and code samples

### For Developers
- **API Reference**: Complete API documentation
- **Error Handling**: Understanding and handling errors
- **Best Practices**: Recommended patterns and practices

### For Troubleshooting
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/alethea-network/alethea-oracle-sdk/issues)
- **Documentation**: You're reading it!
- **Examples**: Check the [examples directory](../examples/)

## License

MIT License - see [LICENSE](../LICENSE) for details

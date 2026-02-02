# Market Chain Deployment Guide

## Deployment Information

**Application ID:** `03725cc7a857eb5612f9bcb984ff7dfde7da79e7e5c171ffc535d3789d5ca365`  
**Chain ID:** `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef`  
**Deployment Date:** 2025-11-20  
**Status:** ✅ Successfully Deployed

## Quick Start

### 1. Start the Service

```bash
linera service --port 8080
```

### 2. Run Tests

```bash
./test_market_chain.sh
```

## Features

### Core Functionality

1. **Market Creation**
   - Create prediction markets with custom questions
   - Set resolution times
   - Automatic liquidity initialization

2. **Trading**
   - Buy YES/NO shares
   - Sell shares back to the market
   - Automated Market Maker (AMM) pricing

3. **Market Resolution**
   - Automatic resolution via Alethea Oracle
   - Manual resolution fallback
   - Claim winnings after resolution

4. **Queries**
   - View all markets
   - Check user positions
   - Get market statistics

## API Reference

### Mutations

#### Create Market
```graphql
mutation {
  createMarket(
    question: "Your question here"
    description: "Market description"
    resolutionTime: 1735689600
  )
}
```

#### Buy Shares
```graphql
mutation {
  buyShares(
    marketId: 0
    isYes: true
    amount: "1000000"
  )
}
```

#### Sell Shares
```graphql
mutation {
  sellShares(
    marketId: 0
    isYes: true
    shares: "500000"
  )
}
```

#### Resolve Market
```graphql
mutation {
  resolveMarket(
    marketId: 0
    outcome: true
  )
}
```

#### Claim Winnings
```graphql
mutation {
  claimWinnings(marketId: 0)
}
```

### Queries

#### Get All Markets
```graphql
query {
  markets {
    id
    question
    description
    status
    yesShares
    noShares
    totalLiquidity
    resolutionTime
    outcome
  }
}
```

#### Get Single Market
```graphql
query {
  market(id: 0) {
    id
    question
    yesShares
    noShares
    totalLiquidity
    status
  }
}
```

#### Get User Positions
```graphql
query {
  userPositions {
    marketId
    yesShares
    noShares
  }
}
```

## Testing Examples

### Example 1: Create and Trade

```bash
# Create a market
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createMarket(question: \"Will Bitcoin reach $100k?\", description: \"BTC price prediction\", resolutionTime: 1735689600) }"
  }'

# Buy YES shares
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { buyShares(marketId: 0, isYes: true, amount: \"1000000\") }"
  }'
```

### Example 2: Check Market Status

```bash
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { market(id: 0) { question status yesShares noShares } }"
  }'
```

## Architecture

### Components

1. **Contract** (`market-chain/src/contract.rs`)
   - Handles all state mutations
   - Validates transactions
   - Manages market lifecycle

2. **Service** (`market-chain/src/service.rs`)
   - GraphQL API endpoint
   - Query processing
   - Data formatting

3. **State** (`market-chain/src/state.rs`)
   - Market data storage
   - User positions tracking
   - Oracle integration

### Integration with Alethea Oracle

The market chain integrates with Alethea Oracle Registry for:
- Automatic market resolution
- Decentralized outcome verification
- Cross-chain oracle queries

## Troubleshooting

### Common Issues

1. **Service not starting**
   ```bash
   # Check if port is already in use
   lsof -i :8080
   
   # Use different port
   linera service --port 8081
   ```

2. **Transaction failed**
   - Check wallet balance
   - Verify chain ID
   - Ensure application is deployed

3. **Market not resolving**
   - Check resolution time has passed
   - Verify oracle registry connection
   - Try manual resolution

## Next Steps

1. **Deploy Oracle Registry** (if not already deployed)
   ```bash
   cd oracle-registry-v2
   linera project publish-and-create
   ```

2. **Connect Market to Oracle**
   - Update registry ID in market chain
   - Test automatic resolution

3. **Add More Features**
   - Multiple outcome markets
   - Liquidity pools
   - Market maker incentives

## Resources

- [Linera Documentation](https://docs.linera.io)
- [Alethea Oracle Docs](./ALETHEA_VISION_ORACLE_RESOLUTION_LAYER.md)
- [Economic Model](./ALETHEA_ECONOMIC_MODEL.md)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the implementation summary
3. Test with the provided test script

# GraphQL Correct Format - Alethea Oracle

## ⚠️ Format yang Benar untuk Mutations

Berdasarkan implementasi Rust, berikut adalah format GraphQL yang benar:

## 🔧 Market Chain Mutations

### Create Market (Format Benar)

**GraphQL Mutation:**
```graphql
mutation {
  createMarket(
    question: "Will it rain tomorrow?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600,
    initialLiquidity: "1000000"
  )
}
```

**Parameter Details:**
- `question`: String - Pertanyaan market
- `outcomes`: [String!]! - Array outcomes (minimal 2)
- `resolutionDeadline`: Int - Unix timestamp (dalam detik, bukan milliseconds!)
- `initialLiquidity`: String - Amount dalam string format

**cURL Example:**
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createMarket(question: \"Will it rain?\", outcomes: [\"Yes\", \"No\"], resolutionDeadline: 1735689600, initialLiquidity: \"1000000\") }"
  }'
```

**Important Notes:**
1. ⚠️ `resolutionDeadline` adalah Unix timestamp dalam **DETIK**, bukan milliseconds
2. ⚠️ `initialLiquidity` adalah **String**, bukan number
3. ⚠️ Response adalah langsung value, bukan object dengan fields

### Buy Shares

```graphql
mutation {
  buyShares(
    marketId: 1,
    outcomeIndex: 0,
    amount: "100000"
  )
}
```

### Request Resolution

```graphql
mutation {
  requestResolution(marketId: 1)
}
```

### Claim Winnings

```graphql
mutation {
  claimWinnings(marketId: 1)
}
```

### Set Oracle Chain

```graphql
mutation {
  setOracleChain(oracleChainId: "app-id-here")
}
```

## 📊 Queries

### Get Market

```graphql
query {
  getMarket(marketId: 1)
}
```

### Get Position

```graphql
query {
  getPosition(marketId: 1, owner: "account-owner-here")
}
```

## 🔍 Testing dengan cURL

### Test Create Market
```bash
# Set environment
source .env.conway

# Create market dengan timestamp yang benar (dalam detik)
DEADLINE=$(date -d "+1 day" +%s)

curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createMarket(question: \\\"Will it rain tomorrow?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: $DEADLINE, initialLiquidity: \\\"1000000\\\") }\"
  }"
```

### Test Buy Shares
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { buyShares(marketId: 1, outcomeIndex: 0, amount: \"100000\") }"
  }'
```

### Test Get Market
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getMarket(marketId: 1) }"
  }'
```

## 💡 Common Mistakes

### ❌ Wrong: Milliseconds timestamp
```graphql
mutation {
  createMarket(
    question: "Test?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600000,  # ❌ Too large!
    initialLiquidity: "1000000"
  )
}
```

### ✅ Correct: Seconds timestamp
```graphql
mutation {
  createMarket(
    question: "Test?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600,  # ✅ Correct!
    initialLiquidity: "1000000"
  )
}
```

### ❌ Wrong: Number for liquidity
```graphql
mutation {
  createMarket(
    question: "Test?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600,
    initialLiquidity: 1000000  # ❌ Should be string!
  )
}
```

### ✅ Correct: String for liquidity
```graphql
mutation {
  createMarket(
    question: "Test?",
    outcomes: ["Yes", "No"],
    resolutionDeadline: 1735689600,
    initialLiquidity: "1000000"  # ✅ Correct!
  )
}
```

## 🔧 Helper Functions

### JavaScript: Get Correct Timestamp
```javascript
// Get timestamp in seconds (not milliseconds)
const getDeadlineInSeconds = (hoursFromNow) => {
  return Math.floor(Date.now() / 1000) + (hoursFromNow * 3600);
};

// Usage
const deadline = getDeadlineInSeconds(24); // 24 hours from now
console.log(deadline); // e.g., 1735689600
```

### Bash: Get Correct Timestamp
```bash
# Get timestamp for tomorrow
DEADLINE=$(date -d "+1 day" +%s)

# Get timestamp for specific date
DEADLINE=$(date -d "2025-12-31" +%s)

# Get timestamp for 24 hours from now
DEADLINE=$(($(date +%s) + 86400))
```

## 📝 Complete Example

### Create Market with Correct Format
```bash
#!/bin/bash

# Load environment
source .env.conway

# Set deadline (24 hours from now, in seconds)
DEADLINE=$(($(date +%s) + 86400))

# Create market
curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { createMarket(question: \\\"Will Bitcoin reach \$100k in 2025?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: $DEADLINE, initialLiquidity: \\\"1000000\\\") }\"
  }" | jq .
```

## 🎯 Quick Reference

| Parameter | Type | Format | Example |
|-----------|------|--------|---------|
| question | String | Text | "Will it rain?" |
| outcomes | [String!]! | Array | ["Yes", "No"] |
| resolutionDeadline | Int | Unix seconds | 1735689600 |
| initialLiquidity | String | Amount string | "1000000" |
| marketId | Int | Number | 1 |
| outcomeIndex | Int | Number | 0 |
| amount | String | Amount string | "100000" |

## 🔗 Related

- [Market Chain Implementation](../market-chain/src/lib.rs)
- [Contract Implementation](../market-chain/src/contract.rs)
- [Service Implementation](../market-chain/src/service.rs)

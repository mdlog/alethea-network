# GraphQL Queries & Mutations Guide

Panduan lengkap untuk menggunakan GraphQL queries dan mutations di Alethea Oracle.

## 📡 Endpoints

```typescript
REGISTRY_URL    = "http://localhost:8001/graphql"
VOTER_URL       = "http://localhost:8002/graphql"
COORDINATOR_URL = "http://localhost:8003/graphql"
```

## 🔍 QUERIES

### Registry Queries

#### Get Single Market
```graphql
query {
  market(id: 1) {
    id
    question
    outcomes
    status
    createdAt
    deadline
    metadata
  }
}
```

#### Get All Active Markets
```graphql
query {
  activeMarkets {
    id
    question
    outcomes
    status
    createdAt
    deadline
  }
}
```

#### Get All Markets
```graphql
query {
  markets {
    id
    question
    outcomes
    status
    createdAt
    deadline
  }
}
```

#### Get Protocol Stats
```graphql
query {
  protocolStats {
    totalMarkets
    activeMarkets
    resolvedMarkets
    totalVoters
  }
}
```

#### Get Oracle Info
```graphql
query {
  oracle(id: "oracle-1") {
    id
    name
    endpoint
    publicKey
    isActive
    registeredAt
  }
}
```

### Voter Queries

#### Get Voter Info
```graphql
query {
  voter(address: "0x123...") {
    address
    reputation
    totalVotes
    correctVotes
    stake
    isActive
  }
}
```

#### Get Voter Stats
```graphql
query {
  voterStats(address: "0x123...") {
    totalVotes
    correctVotes
    accuracy
    reputation
  }
}
```

#### Get Market Votes
```graphql
query {
  marketVotes(marketId: 1) {
    marketId
    voter
    outcomeIndex
    confidence
    timestamp
  }
}
```

#### Get Voter History
```graphql
query {
  voterHistory(address: "0x123...") {
    marketId
    outcomeIndex
    timestamp
    wasCorrect
  }
}
```

### Coordinator Queries

#### Get Resolution Status
```graphql
query {
  resolutionStatus(marketId: 1) {
    marketId
    status
    requestedAt
    resolvedAt
  }
}
```

#### Get Vote Aggregation
```graphql
query {
  voteAggregation(marketId: 1) {
    marketId
    voteCount
    consensus
    aggregatedAt
    distribution
  }
}
```

#### Get Pending Resolutions
```graphql
query {
  pendingResolutions {
    marketId
    status
    requestedAt
    voteCount
  }
}
```

## ✏️ MUTATIONS

### Registry Mutations

#### Create Market
```graphql
mutation {
  createMarket(
    question: "Will Bitcoin reach $100k in 2025?",
    outcomes: ["Yes", "No"],
    deadline: 1735689600000,
    metadata: "Crypto prediction market"
  ) {
    id
    question
    outcomes
    status
    createdAt
    deadline
  }
}
```

**Variables:**
```json
{
  "question": "Will Bitcoin reach $100k in 2025?",
  "outcomes": ["Yes", "No"],
  "deadline": 1735689600000,
  "metadata": "Crypto prediction market"
}
```

**With Variables:**
```graphql
mutation CreateMarket($question: String!, $outcomes: [String!]!, $deadline: Int!, $metadata: String) {
  createMarket(
    question: $question,
    outcomes: $outcomes,
    deadline: $deadline,
    metadata: $metadata
  ) {
    id
    question
    outcomes
    status
  }
}
```

#### Update Market Status
```graphql
mutation {
  updateMarketStatus(
    marketId: 1,
    status: "CLOSED"
  ) {
    id
    status
    updatedAt
  }
}
```

#### Register Oracle
```graphql
mutation {
  registerOracle(
    name: "Weather Oracle",
    endpoint: "https://weather-oracle.example.com",
    publicKey: "0xabc123..."
  ) {
    id
    name
    endpoint
    isActive
    registeredAt
  }
}
```

#### Deactivate Oracle
```graphql
mutation {
  deactivateOracle(id: "oracle-1") {
    id
    isActive
  }
}
```

### Voter Mutations

#### Register Voter
```graphql
mutation {
  registerVoter(
    address: "0x123...",
    stake: 1000
  ) {
    address
    reputation
    totalVotes
    stake
    isActive
  }
}
```

#### Submit Vote
```graphql
mutation {
  submitVote(
    marketId: 1,
    outcomeIndex: 0,
    confidence: 95
  ) {
    marketId
    voter
    outcomeIndex
    confidence
    timestamp
  }
}
```

**With Variables:**
```graphql
mutation SubmitVote($marketId: Int!, $outcomeIndex: Int!, $confidence: Int) {
  submitVote(
    marketId: $marketId,
    outcomeIndex: $outcomeIndex,
    confidence: $confidence
  ) {
    marketId
    voter
    outcomeIndex
    timestamp
  }
}
```

**Variables:**
```json
{
  "marketId": 1,
  "outcomeIndex": 0,
  "confidence": 95
}
```

#### Update Voter Stake
```graphql
mutation {
  updateVoterStake(
    address: "0x123...",
    stake: 2000
  ) {
    address
    stake
    reputation
  }
}
```

#### Withdraw Stake
```graphql
mutation {
  withdrawStake(
    address: "0x123...",
    amount: 500
  ) {
    address
    stake
    reputation
  }
}
```

### Coordinator Mutations

#### Request Resolution
```graphql
mutation {
  requestResolution(marketId: 1) {
    marketId
    status
    requestedAt
  }
}
```

#### Aggregate Votes
```graphql
mutation {
  aggregateVotes(marketId: 1) {
    marketId
    voteCount
    consensus
    aggregatedAt
    distribution
  }
}
```

#### Finalize Market
```graphql
mutation {
  finalizeMarket(
    marketId: 1,
    winningOutcome: 0
  ) {
    marketId
    winningOutcome
    finalizedAt
    status
  }
}
```

**With Variables:**
```graphql
mutation FinalizeMarket($marketId: Int!, $winningOutcome: Int!) {
  finalizeMarket(
    marketId: $marketId,
    winningOutcome: $winningOutcome
  ) {
    marketId
    winningOutcome
    finalizedAt
    status
  }
}
```

**Variables:**
```json
{
  "marketId": 1,
  "winningOutcome": 0
}
```

#### Cancel Resolution
```graphql
mutation {
  cancelResolution(marketId: 1) {
    marketId
    status
  }
}
```

## 🔧 Using with cURL

### Query Example
```bash
curl -X POST http://localhost:8001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { activeMarkets { id question outcomes status } }"
  }'
```

### Mutation Example
```bash
curl -X POST http://localhost:8001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createMarket(question: \"Test?\", outcomes: [\"Yes\", \"No\"], deadline: 1735689600000) { id question } }"
  }'
```

### With Variables
```bash
curl -X POST http://localhost:8002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation SubmitVote($marketId: Int!, $outcomeIndex: Int!) { submitVote(marketId: $marketId, outcomeIndex: $outcomeIndex) { marketId voter } }",
    "variables": {
      "marketId": 1,
      "outcomeIndex": 0
    }
  }'
```

## 🚀 Using with JavaScript/TypeScript

### Fetch API
```typescript
async function queryGraphQL(query: string, endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  
  const result = await response.json();
  return result.data;
}

// Usage
const markets = await queryGraphQL(`
  query {
    activeMarkets {
      id
      question
      outcomes
    }
  }
`, 'http://localhost:8001/graphql');
```

### With Variables
```typescript
async function mutateGraphQL(query: string, variables: any, endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const result = await response.json();
  return result.data;
}

// Usage
const vote = await mutateGraphQL(
  `mutation SubmitVote($marketId: Int!, $outcomeIndex: Int!) {
    submitVote(marketId: $marketId, outcomeIndex: $outcomeIndex) {
      marketId
      voter
      timestamp
    }
  }`,
  { marketId: 1, outcomeIndex: 0 },
  'http://localhost:8002/graphql'
);
```

## 📊 Common Workflows

### 1. Create and Vote on Market

```graphql
# Step 1: Create market
mutation {
  createMarket(
    question: "Will it rain tomorrow?",
    outcomes: ["Yes", "No"],
    deadline: 1735689600000
  ) {
    id
  }
}

# Step 2: Register as voter
mutation {
  registerVoter(address: "0x123...", stake: 1000) {
    address
  }
}

# Step 3: Submit vote
mutation {
  submitVote(marketId: 1, outcomeIndex: 0, confidence: 90) {
    marketId
    voter
  }
}
```

### 2. Resolve Market

```graphql
# Step 1: Request resolution
mutation {
  requestResolution(marketId: 1) {
    marketId
    status
  }
}

# Step 2: Aggregate votes
mutation {
  aggregateVotes(marketId: 1) {
    marketId
    consensus
    voteCount
  }
}

# Step 3: Finalize market
mutation {
  finalizeMarket(marketId: 1, winningOutcome: 0) {
    marketId
    winningOutcome
    finalizedAt
  }
}
```

### 3. Check Market Status

```graphql
# Get market details
query {
  market(id: 1) {
    id
    question
    status
    deadline
  }
}

# Get votes
query {
  marketVotes(marketId: 1) {
    voter
    outcomeIndex
    confidence
  }
}

# Get aggregation
query {
  voteAggregation(marketId: 1) {
    voteCount
    consensus
    distribution
  }
}
```

## 🎯 Best Practices

1. **Always handle errors**
```typescript
try {
  const result = await queryGraphQL(query, endpoint);
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

2. **Use variables for dynamic values**
```graphql
# Good
mutation SubmitVote($marketId: Int!) {
  submitVote(marketId: $marketId, outcomeIndex: 0) { ... }
}

# Avoid
mutation {
  submitVote(marketId: 1, outcomeIndex: 0) { ... }
}
```

3. **Request only needed fields**
```graphql
# Good - only what you need
query {
  market(id: 1) {
    id
    question
    status
  }
}

# Avoid - requesting everything
query {
  market(id: 1) {
    id
    question
    outcomes
    status
    createdAt
    deadline
    metadata
    # ... etc
  }
}
```

4. **Use aliases for multiple queries**
```graphql
query {
  market1: market(id: 1) {
    id
    question
  }
  market2: market(id: 2) {
    id
    question
  }
}
```

## 🔗 Related Documentation

- [Services Documentation](lib/services/README.md)
- [Quick Start Guide](SERVICES_QUICK_START.md)
- [Implementation Details](MUTATIONS_IMPLEMENTATION.md)

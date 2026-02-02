# API Reference

```
    ◉─────◉
     ╲   ╱      GraphQL API
      ◉─◉       Complete Reference
```

> Complete GraphQL API documentation for Alethea Network

---

## 🌐 Endpoints

### Market Chain
```
http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b
```

### Voter Chain
```
http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/333197de9bd7426b327b41f8f342537a6160d3de521917d71ca6ed1a14a7bc40
```

### Oracle Coordinator
```
http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/d6e3e0e891120936967ea0f877d135cf6839d7e8b312930f3c15b0a4e44f2209
```

---

## ⚠️ Critical Requirements

Before using the API:

1. **Amount fields MUST be strings:**
   ```graphql
   # ✅ CORRECT
   initialLiquidity: "1000000"
   amount: "10000"
   
   # ❌ WRONG - Will return error
   initialLiquidity: 1000000
   amount: 10000
   ```

2. **Timestamps in microseconds:**
   - Multiply seconds × 1,000,000
   - Example: `1735689600000000`

3. **Outcome indices start at 0:**
   - 0 = First outcome
   - 1 = Second outcome

---

## 📊 Market Chain API

### Mutations

#### createMarket

Create a new prediction market.

```graphql
mutation {
  createMarket(
    question: "Will Bitcoin reach $100k in 2025?"
    outcomes: ["Yes", "No"]
    resolutionDeadline: 1735689600000000
    initialLiquidity: "1000000"
  )
}
```

**Parameters:**
- `question` (String!): Market question
- `outcomes` ([String!]!): Array of possible outcomes
- `resolutionDeadline` (Timestamp!): Deadline in microseconds
- `initialLiquidity` (Amount!): Initial liquidity as **STRING**

**Response:**
```json
{
  "data": "transaction_hash"
}
```

#### buyShares

Purchase shares for a specific outcome.

```graphql
mutation {
  buyShares(
    marketId: 0
    outcomeIndex: 0
    amount: "10000"
  )
}
```

**Parameters:**
- `marketId` (u64!): Market ID
- `outcomeIndex` (usize!): Outcome to buy (0, 1, ...)
- `amount` (Amount!): Amount to spend as **STRING**

#### requestResolution

Request oracle resolution for a market (must be past deadline).

```graphql
mutation {
  requestResolution(marketId: 0)
}
```

**Parameters:**
- `marketId` (u64!): Market ID

**Effect:**
- Changes market status from `OPEN` to `WAITING_RESOLUTION`
- Sends message to Oracle Coordinator

#### claimWinnings

Claim winnings after market is resolved.

```graphql
mutation {
  claimWinnings(marketId: 0)
}
```

**Parameters:**
- `marketId` (u64!): Market ID

**Prerequisites:**
- Market status must be `RESOLVED`
- User must hold winning shares

#### setOracleChain

Set the Oracle Coordinator chain ID (admin only).

```graphql
mutation {
  setOracleChain(oracleChainId: "d6e3e0e891120936967ea0f877d135cf6839d7e8b312930f3c15b0a4e44f2209")
}
```

### Queries

#### markets

Get all markets.

```graphql
{
  markets {
    id
    question
    outcomes
    status
    totalLiquidity
    resolutionDeadline
    creator
    finalOutcome
  }
}
```

#### market

Get specific market details.

```graphql
{
  market(id: 0) {
    id
    question
    outcomes
    status
    totalLiquidity
    outcomePools
    resolutionDeadline
    creator
    finalOutcome
  }
}
```

**Parameters:**
- `id` (u64!): Market ID

#### position

Get user position in a market.

```graphql
{
  position(marketId: 0, owner: "0x...") {
    marketId
    owner
    shares
    averagePrice
  }
}
```

**Parameters:**
- `marketId` (u64!): Market ID
- `owner` (AccountOwner!): User address

---

## 🗳️ Voter Chain API

### Mutations

#### initialize

Initialize voter account (first-time only).

```graphql
mutation {
  initialize
}
```

**Effect:**
- Creates voter account
- Sets initial stake (default on testnet)
- Enables voting

#### submitVote

Submit a vote on a market (direct voting mode).

```graphql
mutation {
  submitVote(
    marketId: 0
    outcomeIndex: 0
  )
}
```

**Parameters:**
- `marketId` (u64!): Market ID
- `outcomeIndex` (usize!): Your vote (0, 1, ...)

**Prerequisites:**
- Market status must be `WAITING_RESOLUTION`
- Voter must be initialized

**Note:** NO `confidence` parameter in testnet mode!

#### addStake

Add voting stake to your account.

```graphql
mutation {
  addStake(amount: "1000")
}
```

**Parameters:**
- `amount` (Amount!): Stake amount as **STRING**

### Queries

#### voterInfo

Get voter account information.

```graphql
{
  voterInfo {
    owner
    oracleChain
    totalStake
    reputation {
      score
      totalVotes
      correctVotes
      accuracy
      streak
    }
  }
}
```

#### voteHistory

Get voting history.

```graphql
{
  voteHistory {
    marketId
    question
    outcomeIndex
    timestamp
    wasCorrect
    rewardReceived
  }
}
```

#### totalStake

Get total stake amount.

```graphql
{
  totalStake
}
```

#### reputationScore

Get reputation score.

```graphql
{
  reputationScore
}
```

#### totalVotes

Get total number of votes submitted.

```graphql
{
  totalVotes
}
```

---

## 🔗 Oracle Coordinator API

### Mutations

#### aggregateVotes

Aggregate votes for a market and determine outcome.

```graphql
mutation {
  aggregateVotes(marketId: 0)
}
```

**Parameters:**
- `marketId` (u64!): Market ID

**Effect:**
- Counts all votes
- Calculates weighted consensus
- Updates market status to `RESOLVED`
- Sends result back to Market Chain

### Queries

#### market

Get oracle's view of a market.

```graphql
{
  market(id: 0) {
    id
    status
    totalReveals
    winningOutcome
  }
}
```

#### nextMarketId

Get next market ID counter.

```graphql
{
  nextMarketId
}
```

#### totalMarketsCreated

Get total markets created.

```graphql
{
  totalMarketsCreated
}
```

#### totalMarketsResolved

Get total markets resolved.

```graphql
{
  totalMarketsResolved
}
```

---

## 📋 Type Definitions

### MarketStatus

```graphql
enum MarketStatus {
  OPEN
  CLOSED
  WAITING_RESOLUTION
  RESOLVED
}
```

### Amount

**String representation of token amounts.**

```graphql
# Examples
"1000000"    # 1M tokens
"10000"      # 10K tokens
"1"          # 1 token
```

### Timestamp

**Microseconds since Unix epoch (NOT seconds!).**

```graphql
# Examples
1735689600000000  # Dec 31, 2025
1767139200000000  # Dec 31, 2025 (alternative)
```

---

## 🔍 Common Queries

### Check Market Lifecycle

```graphql
{
  market(id: 0) {
    id
    question
    status
    resolutionDeadline
    finalOutcome
  }
}
```

### Monitor Voting Progress

```graphql
{
  voterInfo {
    totalVotes
    reputation {
      accuracy
      streak
    }
  }
  voteHistory {
    marketId
    outcomeIndex
    wasCorrect
  }
}
```

### Calculate Market Prices

```graphql
{
  market(id: 0) {
    totalLiquidity
    outcomePools
    outcomes
  }
}
```

Price formula:
```
Price_Outcome_X = Pool_X / TotalLiquidity
```

---

## 🐛 Error Responses

### "Failed to parse Amount: invalid type: integer"

**Cause:** Amount field passed as integer instead of string.

**Solution:**
```graphql
# Change from:
initialLiquidity: 1000000

# To:
initialLiquidity: "1000000"
```

### "Unknown argument confidence"

**Cause:** Using production voting parameters on testnet.

**Solution:**
```graphql
# Remove confidence parameter
submitVote(marketId: 0, outcomeIndex: 0)
```

### "Market not in WAITING_RESOLUTION status"

**Cause:** Trying to vote on market that hasn't requested resolution.

**Solution:**
```graphql
# First request resolution
mutation { requestResolution(marketId: 0) }

# Then vote
mutation { submitVote(marketId: 0, outcomeIndex: 0) }
```

---

## 💡 Best Practices

1. **Always use strings for Amount fields**
2. **Calculate timestamps in microseconds**
3. **Check market status before operations**
4. **Initialize voter before first vote**
5. **Wait for deadline before requesting resolution**
6. **Use GraphiQL IDE for testing**

---

## 📚 Related Documentation

{% content-ref url="quick-start.md" %}
[quick-start.md](quick-start.md)
{% endcontent-ref %}

{% content-ref url="key-concepts.md" %}
[key-concepts.md](key-concepts.md)
{% endcontent-ref %}

---

**Alethea Network API** - GraphQL Excellence 🎯


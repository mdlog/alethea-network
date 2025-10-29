# Quick Start Guide

```
    ◉─────◉
     ╲   ╱      2-Minute Quick Start
      ◉─◉       Create Your First Market
```

> Get started with Alethea Network in under 2 minutes!

---

## 🚀 Prerequisites

Ensure you have access to the deployed Alethea Network:

* **GraphQL Service**: Running at `http://localhost:8080`
* **Chain ID**: `8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16`
* **Market App**: `dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b`

```bash
# Check if GraphQL service is running
ps aux | grep "linera service"

# If not running, start it:
linera service --port 8080
```

---

## ⚡ Quick 2-Minute Test

Complete the entire market lifecycle in 2 minutes:

```bash
# 1. Calculate deadline (2 minutes from now)
DEADLINE=$(( ($(date +%s) + 120) * 1000000 ))

# 2. Create market
curl -X POST http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(question: \\\"[TEST 2MIN] Quick test\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: $DEADLINE, initialLiquidity: \\\"100000\\\") }\"}"

# 3. Wait 2 minutes...
sleep 120

# 4. Request resolution (replace marketId with actual ID from step 2)
curl -X POST http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 0) }"}'

# 5. Submit vote
curl -X POST http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/333197de9bd7426b327b41f8f342537a6160d3de521917d71ca6ed1a14a7bc40 \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0) }"}'
```

---

## 📋 Step-by-Step Walkthrough

### STEP 1: Create a Market

**Via GraphiQL IDE:**

1. Open: `http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b`

2. Paste this mutation:
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

3. Click Play ▶

**⚠️ Important:**
- `initialLiquidity` MUST be a string: `"1000000"` not `1000000`
- `resolutionDeadline` is in microseconds (not seconds!)

**Expected Response:**
```json
{
  "data": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
}
```

**Verify:**
```graphql
{
  markets {
    id
    question
    status
    totalLiquidity
  }
}
```

---

### STEP 2: Buy Shares (Optional)

Trade on the market by buying shares:

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
- `marketId`: The market ID (0, 1, 2, etc.)
- `outcomeIndex`: 0 = "Yes", 1 = "No"
- `amount`: Amount in tokens - **MUST be a string**: `"10000"` not `10000`

---

### STEP 3: Wait for Deadline

Check if the market deadline has passed:

```graphql
{
  market(id: 0) {
    resolutionDeadline
    status
  }
}
```

**Current time in microseconds:**
```bash
date +%s%6N
```

---

### STEP 4: Request Resolution

After the deadline passes, request oracle resolution:

```graphql
mutation {
  requestResolution(marketId: 0)
}
```

This changes the market status from `OPEN` to `WAITING_RESOLUTION`.

**Verify:**
```graphql
{
  market(id: 0) {
    status
  }
}
```

---

### STEP 5: Vote on Outcome

**Voter Chain Endpoint:**
```
http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/333197de9bd7426b327b41f8f342537a6160d3de521917d71ca6ed1a14a7bc40
```

**Submit Vote:**
```graphql
mutation {
  submitVote(
    marketId: 0
    outcomeIndex: 0
  )
}
```

**Parameters:**
- `marketId`: Market to vote on
- `outcomeIndex`: Your vote (0 = "Yes", 1 = "No")
- **NO** `confidence` parameter needed!

**Verify:**
```graphql
{
  voteHistory {
    marketId
    outcomeIndex
    timestamp
  }
}
```

---

### STEP 6: Aggregate Votes

**Oracle Coordinator Endpoint:**
```
http://localhost:8080/chains/8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16/applications/d6e3e0e891120936967ea0f877d135cf6839d7e8b312930f3c15b0a4e44f2209
```

**Aggregate:**
```graphql
mutation {
  aggregateVotes(marketId: 0)
}
```

This calculates the consensus and updates the market status to `RESOLVED`.

**Verify:**
```graphql
{
  market(id: 0) {
    status
    finalOutcome
  }
}
```

---

## 🎯 Common Operations

### Query All Markets
```graphql
{
  allMarkets {
    id
    question
    status
    totalLiquidity
    outcomes
  }
}
```

### Check Voter Info
```graphql
{
  totalStake
  reputationScore
  totalVotes
}
```

### Check Market Details
```graphql
{
  market(id: 0) {
    id
    question
    outcomes
    status
    totalLiquidity
    resolutionDeadline
    finalOutcome
  }
}
```

---

## ⚠️ Important Notes

1. **Amount fields MUST be strings:**
   - Use `"100000"` not `100000`
   - Applies to: `initialLiquidity`, `amount`, `stake`

2. **Timestamps are in microseconds:**
   - Multiply seconds by 1,000,000
   - Example: Dec 31, 2025 = `1735689600000000`

3. **Market status flow:**
   - `OPEN` → `WAITING_RESOLUTION` → `RESOLVED`

4. **Outcome indices:**
   - 0 = First outcome (usually "Yes")
   - 1 = Second outcome (usually "No")

5. **No confidence parameter:**
   - `submitVote` only needs `marketId` and `outcomeIndex`

---

## 🐛 Troubleshooting

### Error: "Failed to parse Amount: invalid type: integer"

**Problem:** Amount field passed as integer instead of string.

**Solution:**
```graphql
# ❌ WRONG
createMarket(initialLiquidity: 100000)

# ✅ CORRECT
createMarket(initialLiquidity: "100000")
```

### Market Status Stuck at OPEN

**Problem:** Deadline not reached yet.

**Solution:**
```bash
# Check current time vs deadline
date +%s%6N  # Current time in microseconds

# Compare with market's resolutionDeadline
```

### Vote Not Working

**Problem:** Market not in `WAITING_RESOLUTION` status.

**Solution:**
```graphql
# 1. Check market status
{ market(id: 0) { status } }

# 2. If OPEN, run requestResolution first
mutation { requestResolution(marketId: 0) }

# 3. Then vote
mutation { submitVote(marketId: 0, outcomeIndex: 0) }
```

---

## 🚀 Next Steps

Now that you've created your first market:

{% content-ref url="key-concepts.md" %}
[key-concepts.md](key-concepts.md)
{% endcontent-ref %}

{% content-ref url="deployment.md" %}
[deployment.md](deployment.md)
{% endcontent-ref %}

---

**Alethea Network** - Your First Market is Live! 🎉


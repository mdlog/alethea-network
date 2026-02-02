# Alethea Oracle - DApp Integration Test Guide

## Overview

This guide explains how to integrate a prediction market DApp with Alethea Oracle Network as the resolution layer.

## Current Production Status (Jan 7, 2026)

### Oracle Registry
| Field | Value |
|-------|-------|
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| App ID | `b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c` |
| Endpoint | `https://alethea.network` |
| Voters | 4 registered |
| Queries | 10 created, 1 resolved |

### Simple Market (Test DApp)
| Field | Value |
|-------|-------|
| App ID | `67e742bbe065559b9c2fbb37f68c491d18dd9421325bec10e70e3d44d94e6022` |
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| Markets | 1 created |
| Status | Integrated with Oracle ✅ |

## Verified Integration Test

On January 7, 2026, we successfully tested the full integration:

```
Simple Market                          Alethea Oracle
     │                                       │
     │  CreateMarket                         │
     │  market_id: 1                         │
     │  "Did Bitcoin close above 95000       │
     │   USD on January 6, 2026?"            │
     │                                       │
     │  RequestResolution ─────────────────► │
     │  callback_data: [1]                   │
     │                                       │
     │                              CreateQuery
     │                              query_id: 10
     │                                       │
     │  ◄───────────────── QueryCreated      │
     │                                       │
     │  Market.queryId = 10 ✅               │
     │  Market.status = Voting ✅            │
```

**Results:**
- ✅ Market created with ID 1
- ✅ RequestResolution sent to Oracle
- ✅ Query #10 created in Oracle Registry
- ✅ Market linked to Query (queryId: 10)
- ✅ Market status changed to "Voting"

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PREDICTION MARKET DAPP                       │
│  (e.g., simple-market)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User creates market: "Did BTC close above $95k on Jan 6?"   │
│  2. Market stores question, outcomes, deadline                  │
│  3. Users place bets (Yes/No)                                   │
│  4. When ready, market calls RequestResolution                  │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ call_application() or cross-chain message
                             │ CreateQueryWithCallback
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ALETHEA ORACLE NETWORK                       │
│  (oracle-registry-v2)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5. Oracle creates query from market request                    │
│  6. Voters commit votes (hash of vote + salt)                   │
│  7. Voters reveal votes (actual vote + salt)                    │
│  8. Oracle resolves query based on majority/weighted votes      │
│  9. Oracle sends QueryResolved callback to market               │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ OracleCallback::QueryResolved
                             │ (query_id, result, vote_count, confidence)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PREDICTION MARKET DAPP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  10. Market receives callback with resolution                   │
│  11. Market updates status to Resolved                          │
│  12. Market sets winning_outcome based on oracle result         │
│  13. Winners can claim payouts                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start: Deploy Your Own Market

### Step 1: Build the Contract

```bash
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown -p simple-market
```

### Step 2: Deploy with Oracle Integration

```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2 \
  --json-argument '{"registry_app_id":"b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c","registry_chain_id":"36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2","use_local_instance":true}' \
  --required-application-ids b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c
```

### Step 3: Create a Market

```bash
# Set deadline (1 hour from now in microseconds)
DEADLINE=$(($(date +%s) * 1000000 + 3600000000))

# Create market
curl -s -X POST "https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(question: \\\"Did Bitcoin close above 95000 USD on January 6, 2026?\\\", endTime: $DEADLINE) }\"}"
```

### Step 4: Request Resolution

```bash
curl -s -X POST "https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 1) }"}'
```

### Step 5: Vote on Query

1. Open dashboard: http://localhost:4002
2. Go to Queries page
3. Find your query and vote
4. Once enough votes, query will resolve

### Step 6: Verify Market Resolved

```bash
curl -s -X POST "https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/YOUR_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ markets { id question status queryId winningOutcome } }"}'
```

## API Reference

### Simple Market Endpoints

**Base URL:** `https://alethea.network/chains/{CHAIN_ID}/applications/{APP_ID}`

#### Query: Get Markets
```graphql
{
  markets {
    id
    question
    status
    queryId
    winningOutcome
    yesPool
    noPool
    totalPool
  }
}
```

#### Query: Get Statistics
```graphql
{
  statistics {
    totalMarkets
    totalBets
    totalVolume
  }
}
```

#### Mutation: Create Market
```graphql
mutation {
  createMarket(
    question: "Did event X happen?",
    endTime: 1767769517000000
  )
}
```

#### Mutation: Place Bet
```graphql
mutation {
  placeBet(
    marketId: 1,
    outcome: "Yes",
    stake: "1000000"
  )
}
```

#### Mutation: Request Resolution
```graphql
mutation {
  requestResolution(marketId: 1)
}
```

#### Mutation: Claim Payout
```graphql
mutation {
  claimPayout(marketId: 1)
}
```

### Oracle Registry Endpoints

**Base URL:** `https://alethea.network/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID}`

#### Query: Get Queries
```graphql
{
  queries {
    id
    description
    status
    result
    voteCount
  }
}
```

#### Query: Get Statistics
```graphql
{
  statistics {
    totalVoters
    totalQueriesCreated
    totalQueriesResolved
  }
}
```

## Callback Message Types

Your contract must handle these callback messages:

```rust
pub enum OracleCallback {
    /// Query was created successfully
    QueryCreated {
        query_id: u64,
        request_id: u64,
        callback_data: Vec<u8>,
    },
    
    /// Query was resolved with a result
    QueryResolved {
        query_id: u64,
        result: String,           // "Yes" or "No"
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
        vote_count: u32,
        confidence: u8,           // 0-100
    },
    
    /// Query expired without enough votes
    QueryExpired {
        query_id: u64,
        callback_data: Vec<u8>,
        votes_received: u32,
        votes_required: u32,
    },
    
    /// Query was cancelled
    QueryCancelled {
        query_id: u64,
        callback_data: Vec<u8>,
        reason: String,
    },
}
```

## Understanding Market ID vs Query ID

| Field | Created By | Example | Purpose |
|-------|------------|---------|---------|
| `market_id` | Prediction Market | 1, 2, 3... | Internal market identifier |
| `query_id` | Alethea Oracle | 10, 11, 12... | Oracle query identifier |
| `callback_data` | Market → Oracle | `[1, 0, 0, 0, 0, 0, 0, 0]` | Links query back to market |

**Flow:**
1. Market created with `market_id = 1`
2. RequestResolution encodes `market_id` into `callback_data`
3. Oracle creates query with `query_id = 10`, stores `callback_data`
4. When resolved, Oracle sends callback with `query_id` and `callback_data`
5. Market decodes `callback_data` to get `market_id`, links with `query_id`

## Troubleshooting

### "Registry app ID not configured"
- Ensure you deployed with `--json-argument` containing `registry_app_id`
- Use `--required-application-ids` to ensure Registry is available

### Query Not Resolving
- Check if enough voters have voted (min_votes requirement)
- Verify deadline hasn't passed
- Check query phase (Commit → Reveal → Completed)

### Callback Not Received
- Verify callback_chain and callback_app are correct
- Check if market contract handles OracleCallback message type
- Look for errors in contract logs

## Files Reference

- `simple-market/src/contract.rs` - Market contract with callback handling
- `oracle-registry-v2/src/contract.rs` - Oracle with callback sending
- `alethea-oracle-messages/src/lib.rs` - Shared message types
- `alethea-consumer-sdk/src/lib.rs` - Integration helpers

## Configuration Files

### .env.simple-market-new
```bash
export SIMPLE_MARKET_APP_ID=67e742bbe065559b9c2fbb37f68c491d18dd9421325bec10e70e3d44d94e6022
export MARKET_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
export REGISTRY_APP_ID=b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c
export REGISTRY_CHAIN_ID=36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2
export SIMPLE_MARKET_URL="https://alethea.network/chains/36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2/applications/67e742bbe065559b9c2fbb37f68c491d18dd9421325bec10e70e3d44d94e6022"
```

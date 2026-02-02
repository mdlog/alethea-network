# Simple Market

A minimal prediction market implementation integrated with Alethea Oracle Network for trustless resolution.

## Production Status (Jan 7, 2026)

| Component | Value |
|-----------|-------|
| App ID | `67e742bbe065559b9c2fbb37f68c491d18dd9421325bec10e70e3d44d94e6022` |
| Chain ID | `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2` |
| Oracle Registry | `b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c` |
| Endpoint | `https://alethea.network` |

## Features

- ✅ Create binary (Yes/No) prediction markets
- ✅ Place bets on market outcomes
- ✅ Integrated with Alethea Oracle via `call_application()`
- ✅ Receive resolution callbacks from Oracle Registry
- ✅ Claim payouts based on oracle results

## Verified Integration Test

On January 7, 2026, we successfully tested the full integration:

```
Market #1: "Did Bitcoin close above 95000 USD on January 6, 2026?"
├── Status: Voting ✅
├── Query ID: 10 ✅
└── Flow: CreateMarket → RequestResolution → Query Created → Market Linked
```

## Architecture

### Hub-and-Spoke Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALETHEA CHAIN                                │
│                                                                 │
│  ┌───────────────────────────┐    ┌───────────────────────────┐ │
│  │   Oracle Registry (Hub)   │◄───│   Simple Market App       │ │
│  │ - Voter management        │    │ - Create markets          │ │
│  │ - Query resolution        │───►│ - Handle callbacks        │ │
│  │ - Callback dispatch       │    │ - Distribute payouts      │ │
│  └───────────────────────────┘    └───────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Flow

```
Simple Market                          Alethea Oracle
     │                                       │
     │  CreateMarket(question, endTime)      │
     │  market_id: 1                         │
     │                                       │
     │  RequestResolution(market_id) ──────► │
     │  callback_data: [market_id]           │
     │                                       │
     │                              CreateQuery(query_id: 10)
     │                                       │
     │  ◄────────────── QueryCreated         │
     │  market.queryId = 10                  │
     │  market.status = Voting               │
     │                                       │
     │              [Voters vote on query]   │
     │                                       │
     │  ◄────────────── QueryResolved        │
     │  result: "Yes"                        │
     │  market.status = Resolved             │
     │  market.winningOutcome = "Yes"        │
```

## Quick Start

### 1. Build

```bash
cargo build --release --target wasm32-unknown-unknown -p simple-market
```

### 2. Deploy

```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2 \
  --json-argument '{"registry_app_id":"b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c","registry_chain_id":"36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2","use_local_instance":true}' \
  --required-application-ids b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c
```

### 3. Create Market

```bash
DEADLINE=$(($(date +%s) * 1000000 + 3600000000))

curl -s -X POST "$SIMPLE_MARKET_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(question: \\\"Did BTC close above \$95k?\\\", endTime: $DEADLINE) }\"}"
```

### 4. Request Resolution

```bash
curl -s -X POST "$SIMPLE_MARKET_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 1) }"}'
```

### 5. Check Market Status

```bash
curl -s -X POST "$SIMPLE_MARKET_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ markets { id question status queryId winningOutcome } }"}'
```

## API Reference

### Queries

```graphql
# Get all markets
{ markets { id question status queryId winningOutcome yesPool noPool totalPool } }

# Get statistics
{ statistics { totalMarkets totalBets totalVolume } }
```

### Mutations

```graphql
# Create market
mutation { createMarket(question: "...", endTime: 1767769517000000) }

# Place bet
mutation { placeBet(marketId: 1, outcome: "Yes", stake: "1000000") }

# Request resolution
mutation { requestResolution(marketId: 1) }

# Claim payout
mutation { claimPayout(marketId: 1) }
```

## State Structure

```rust
pub struct MarketState {
    pub markets: MapView<u64, Market>,
    pub bets: MapView<(u64, ChainId), Bet>,
    pub next_market_id: RegisterView<u64>,
    pub registry_app_id: RegisterView<Option<ApplicationId>>,
    pub registry_chain_id: RegisterView<Option<ChainId>>,
    pub use_local_instance: RegisterView<bool>,
    pub total_markets_created: RegisterView<u64>,
    pub total_bets_placed: RegisterView<u64>,
    pub total_volume: RegisterView<u64>,
}
```

## Callback Handling

The contract handles these Oracle callbacks:

```rust
pub enum OracleCallback {
    QueryCreated { query_id, request_id, callback_data },
    QueryResolved { query_id, result, resolved_at, callback_data, vote_count, confidence },
    QueryExpired { query_id, callback_data, votes_received, votes_required },
    QueryCancelled { query_id, callback_data, reason },
}
```

## Configuration

Environment variables (`.env.simple-market`):

```bash
export SIMPLE_MARKET_APP_ID="67e742bbe065559b9c2fbb37f68c491d18dd9421325bec10e70e3d44d94e6022"
export MARKET_CHAIN_ID="36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
export REGISTRY_APP_ID="b77ebb76076c9aca8aac739107d26845b8c1ea36a84556749e23f98667b0ca1c"
export SIMPLE_MARKET_URL="https://alethea.network/chains/$MARKET_CHAIN_ID/applications/$SIMPLE_MARKET_APP_ID"
```

## Troubleshooting

### "Registry app ID not configured"
Deploy with correct `--json-argument` and `--required-application-ids`.

### Market not receiving callbacks
- Verify `callback_chain` and `callback_app` are correct
- Check contract handles `OracleCallback` message type

### Query not resolving
- Ensure enough voters have voted
- Check query phase (Commit → Reveal → Completed)

## License

MIT

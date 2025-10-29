# Deployment Guide

```
    ◉─────◉
     ╲   ╱      CONWAY TESTNET
      ◉─◉       Deployment Guide
```

> Complete guide for deploying Alethea Network to Linera Conway Testnet

---

## 🌐 Current Live Deployment

**Alethea Network is LIVE on Conway Testnet!**

* **Network**: Linera Conway Testnet (Public)
* **Chain ID**: `8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16`
* **Market App**: `dbdd35883b93d142d3ecd27d49aed23ca2d28e7607e35aa1858bf399bc40996b` ✅ INTEGRATED
* **Voter App**: `333197de9bd7426b327b41f8f342537a6160d3de521917d71ca6ed1a14a7bc40` ✅ VOTING OPERATIONAL
* **Oracle Coordinator**: `d6e3e0e891120936967ea0f877d135cf6839d7e8b312930f3c15b0a4e44f2209` ✅ INTEGRATED
* **Min Stake**: 1 token (testnet friendly!)
* **Block Height**: 83+
* **Validators**: 14 active nodes
* **Status**: ✅ FULLY INTEGRATED (Market ↔ Oracle ↔ Voter) 🎉
* **Voting Mode**: Direct voting (simplified for testnet)
* **Last Updated**: Oct 29, 2025

**Access**:
* 🖥️ Explorer: [http://localhost:3333](http://localhost:3333)
* 📊 GraphQL: [http://localhost:8080](http://localhost:8080)

---

## 🔧 Deployment Method

### ⚠️ Important: CLI Bug Workaround

The standard `linera project publish-and-create` command has a bug in Linera CLI v0.15.4. Use this **manual 2-step method** instead:

### Step-by-Step Deployment

#### Prerequisites

```bash
# Ensure Rust 1.86.0
rustup default 1.86.0

# Ensure Linera CLI v0.15.4
linera --version
```

#### 1. Initialize Wallet

```bash
# Remove old wallet if exists
rm -rf ~/.config/linera

# Initialize with Conway faucet
linera wallet init --faucet https://faucet.testnet-conway.linera.net
```

#### 2. Request Chain & Tokens

```bash
# Request new chain (includes 100 tokens)
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

**Output**: New chain ID received

#### 3. Set Default Chain

```bash
# Set newly created chain as default
linera wallet set-default <YOUR_CHAIN_ID>
```

#### 4. Build Contracts

```bash
cd /path/to/alethea-network
cargo build --release --target wasm32-unknown-unknown
```

**Output**: WASM files in `target/wasm32-unknown-unknown/release/`

#### 5. Deploy Market Chain

**5a. Publish Bytecode**:
```bash
linera publish-module \
  target/wasm32-unknown-unknown/release/market-chain-contract.wasm \
  target/wasm32-unknown-unknown/release/market-chain-service.wasm
```

**Output**: `<MARKET_BYTECODE_ID>`

**5b. Create Application**:
```bash
linera create-application <MARKET_BYTECODE_ID> \
  --json-parameters '{}' \
  --json-argument '{"markets":[]}'
```

**Output**: `<MARKET_APP_ID>`

#### 6. Deploy Voter Chain

**6a. Publish Bytecode**:
```bash
linera publish-module \
  target/wasm32-unknown-unknown/release/voter-chain-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-chain-service.wasm
```

**Output**: `<VOTER_BYTECODE_ID>`

**6b. Create Application**:
```bash
linera create-application <VOTER_BYTECODE_ID> \
  --json-parameters '{"min_stake":"1"}' \
  --json-argument '{"oracle_chain":null,"initial_stake":"10"}'
```

**Output**: `<VOTER_APP_ID>`

#### 7. Start GraphQL Service

```bash
# Start in background
nohup linera service --port 8080 > /tmp/graphql.log 2>&1 &

# Or foreground
linera service --port 8080
```

**Access**: GraphiQL IDE at `http://localhost:8080`

#### 8. Verify Deployment

```bash
# Check wallet
linera wallet show

# Check balance
linera query-balance

# Test GraphQL
curl http://localhost:8080/chains/<CHAIN_ID>/applications/<MARKET_APP_ID> \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ markets { id } }"}'
```

---

## ⚠️ Critical: API Requirements

Before testing, remember these requirements:

1. **Amount fields MUST be strings:**
   ```graphql
   # ✅ CORRECT
   initialLiquidity: "1000000"
   amount: "10000"
   
   # ❌ WRONG - Will fail with "invalid type: integer, expected a string"
   initialLiquidity: 1000000
   amount: 10000
   ```

2. **Timestamps are in microseconds** (not seconds!)
   - Calculate: `(date +%s) * 1000000`
   - Example: Dec 31, 2025 = `1735689600000000`

3. **Voter Chain uses direct voting** (simplified for testnet)

---

## 🧪 Testing

### Create Test Market

```graphql
mutation {
  createMarket(
    question: "Will Bitcoin reach $100k in 2025?"
    outcomes: ["Yes", "No"]
    resolutionDeadline: 1767139200000000
    initialLiquidity: "1000000"
  )
}
```

**Note:** `initialLiquidity` is a string `"1000000"`, not an integer!

### Query Markets

```graphql
{
  markets {
    id
    question
    totalLiquidity
    status
  }
}
```

### Initialize Voter

```graphql
mutation {
  initialize
}
```

**Note:** The voter chain is now automatically initialized on testnet with a default stake. You can vote immediately after deployment!

---

## 📊 Gas Costs

Based on Conway Testnet deployment:

| Operation | Cost (tokens) |
|-----------|---------------|
| Publish Module (Market) | ~0.05 |
| Create App (Market) | ~0.02 |
| Publish Module (Voter) | ~0.05 |
| Create App (Voter) | ~0.02 |
| **Total Deployment** | **~0.14** |
| Create Market | ~0.01 |

**Starting Balance**: 100 tokens (from faucet)  
**Enough for**: ~700 market creations!

---

## 🐛 Known Issues

### Issue: `linera project publish-and-create` fails

**Error**: 
```
persistence error: I/O error: No such file or directory
```

**Cause**: Bug in Linera CLI v0.15.4

**Solution**: Use manual 2-step deployment (shown above) ✅

### Issue: Pool overflow in queries

**Symptom**: `outcomePools` shows MAX values

**Impact**: Visual only

**Workaround**: Alethea Explorer uses `totalLiquidity / 2` fallback

---

## 🔗 Resources

* Main README: `../README.md`
* Full Deployment Guide: `../CONWAY_DEPLOYMENT.md`
* CLI Operations: `../CLI_OPERATIONS.md`
* GraphQL Queries: `../GRAPHQL_QUERIES.txt`

---

## 🆘 Troubleshooting

### GraphQL Connection Error

```bash
# Check if service is running
ps aux | grep "linera service"

# Restart if needed
pkill -f "linera service"
linera service --port 8080
```

### Out of Tokens

```bash
# Request more from faucet
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

### Chain Out of Sync

```bash
linera sync
```

---

**Deployment Guide** - Updated Oct 28, 2025

{% content-ref url="../README.md" %}
[README.md](../README.md)
{% endcontent-ref %}


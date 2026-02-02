# Troubleshooting Guide

```
    ◉─────◉
     ╲   ╱      Common Issues
      ◉─◉       & Solutions
```

> Solutions to common problems when using Alethea Network

---

## 🔴 GraphQL API Errors

### Error: "Failed to parse Amount: invalid type: integer, expected a string"

**Symptom:**
```json
{
  "errors": [
    {
      "message": "Failed to parse \"Amount\": invalid type: integer `100000`, expected a string"
    }
  ]
}
```

**Cause:** Amount fields must be strings, not integers.

**Solution:**

```graphql
# ❌ WRONG - Integer
mutation {
  createMarket(
    question: "Test"
    outcomes: ["Yes", "No"]
    resolutionDeadline: 1735689600000000
    initialLiquidity: 100000
  )
}

# ✅ CORRECT - String
mutation {
  createMarket(
    question: "Test"
    outcomes: ["Yes", "No"]
    resolutionDeadline: 1735689600000000
    initialLiquidity: "100000"
  )
}
```

**Applies to:**
- `initialLiquidity` in `createMarket`
- `amount` in `buyShares`
- `amount` in `addStake`
- All Amount fields across all APIs

---

### Error: "Unknown argument: confidence"

**Symptom:**
```json
{
  "errors": [
    {
      "message": "Unknown argument \"confidence\", expected one of: marketId, outcomeIndex"
    }
  ]
}
```

**Cause:** Trying to use production voting parameters on testnet.

**Solution:**

```graphql
# ❌ WRONG - Has confidence parameter
mutation {
  submitVote(
    marketId: 0
    outcomeIndex: 0
    confidence: 95
  )
}

# ✅ CORRECT - No confidence parameter
mutation {
  submitVote(
    marketId: 0
    outcomeIndex: 0
  )
}
```

**Explanation:** Testnet uses direct voting (simplified). Commit-reveal with confidence will be available in production.

---

### Error: "Market not in WAITING_RESOLUTION status"

**Symptom:**
Cannot vote on a market.

**Cause:** Market hasn't requested resolution yet.

**Solution:**

1. Check market status:
```graphql
{
  market(id: 0) {
    status
  }
}
```

2. If status is `OPEN`, request resolution first:
```graphql
mutation {
  requestResolution(marketId: 0)
}
```

3. Then vote:
```graphql
mutation {
  submitVote(marketId: 0, outcomeIndex: 0)
}
```

**Status Flow:**
```
OPEN → WAITING_RESOLUTION → RESOLVED
```

---

## 🔴 Timestamp Issues

### Error: "Market deadline not reached"

**Symptom:**
```
assertion failed: self.runtime.system_time() >= market.resolution_deadline
```

**Cause:** Trying to resolve market before deadline.

**Solution:**

1. Check current time vs deadline:
```bash
# Current time in microseconds
date +%s%6N

# Or via query
echo $(( $(date +%s) * 1000000 ))
```

2. Check market deadline:
```graphql
{
  market(id: 0) {
    resolutionDeadline
  }
}
```

3. Compare: Current time must be >= deadline

**Quick fix for testing:**
```graphql
# Create market with past deadline
mutation {
  createMarket(
    question: "[TEST] Immediate resolution"
    outcomes: ["Yes", "No"]
    resolutionDeadline: 1
    initialLiquidity: "100000"
  )
}
```

---

### Calculating Deadlines

**2 minutes from now:**
```bash
DEADLINE=$(( ($(date +%s) + 120) * 1000000 ))
echo $DEADLINE
```

**1 hour from now:**
```bash
DEADLINE=$(( ($(date +%s) + 3600) * 1000000 ))
echo $DEADLINE
```

**1 day from now:**
```bash
DEADLINE=$(( ($(date +%s) + 86400) * 1000000 ))
echo $DEADLINE
```

**Specific date (Dec 31, 2025):**
```bash
date -d "2025-12-31 23:59:59" +%s
# Output: 1735689599
# Multiply by 1000000: 1735689599000000
```

---

## 🔴 Network & Service Issues

### Issue: GraphQL service not responding

**Symptom:**
```bash
curl http://localhost:8080
# Connection refused
```

**Solution:**

1. Check if service is running:
```bash
ps aux | grep "linera service"
```

2. If not running, start it:
```bash
linera service --port 8080
```

3. Or run in background:
```bash
nohup linera service --port 8080 > /tmp/graphql.log 2>&1 &
```

4. Check logs:
```bash
tail -f /tmp/graphql.log
```

---

### Issue: "Failed to connect to validators"

**Symptom:**
Cannot sync or send transactions.

**Solution:**

1. Check wallet configuration:
```bash
linera wallet show --with-validators
```

2. Verify network:
```bash
# Should show Conway Testnet validators
cat ~/.config/linera/wallet.json | grep network_address
```

3. Sync with network:
```bash
linera sync
```

4. If still failing, reinitialize:
```bash
rm -rf ~/.config/linera
linera wallet init --with-new-chain --faucet https://faucet.testnet-conway.linera.net
```

---

## 🔴 Voting Issues

### Issue: "Voter not initialized"

**Symptom:**
Cannot submit votes.

**Solution:**

Initialize voter account first:
```graphql
mutation {
  initialize
}
```

Verify:
```graphql
{
  voterInfo {
    owner
    totalStake
  }
}
```

---

### Issue: Vote not showing in history

**Symptom:**
Vote appears successful but not in `voteHistory`.

**Solution:**

1. Check market status:
```graphql
{
  market(id: 0) {
    status
  }
}
```

2. If status is not `WAITING_RESOLUTION`, request it:
```graphql
mutation {
  requestResolution(marketId: 0)
}
```

3. Submit vote again:
```graphql
mutation {
  submitVote(marketId: 0, outcomeIndex: 0)
}
```

4. Check history:
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

## 🔴 Market Issues

### Issue: Market status stuck at OPEN

**Symptom:**
Market won't transition to `WAITING_RESOLUTION`.

**Causes & Solutions:**

1. **Deadline not reached:**
   ```bash
   # Check if deadline passed
   date +%s%6N
   ```

2. **Haven't called requestResolution:**
   ```graphql
   mutation {
     requestResolution(marketId: 0)
   }
   ```

3. **Oracle chain not set:**
   ```graphql
   mutation {
     setOracleChain(oracleChainId: "d6e3e0e891120936967ea0f877d135cf6839d7e8b312930f3c15b0a4e44f2209")
   }
   ```

---

### Issue: Cannot claim winnings

**Symptom:**
`claimWinnings` mutation fails.

**Causes & Solutions:**

1. **Market not resolved:**
   ```graphql
   {
     market(id: 0) {
       status
       finalOutcome
     }
   }
   ```
   Status must be `RESOLVED`.

2. **No winning shares:**
   ```graphql
   {
     position(marketId: 0, owner: "YOUR_ADDRESS") {
       shares
       outcomeIndex
     }
   }
   ```
   Your `outcomeIndex` must match `finalOutcome`.

3. **Haven't aggregated votes:**
   ```graphql
   mutation {
     aggregateVotes(marketId: 0)
   }
   ```

---

## 🔴 Deployment Issues

### Issue: "Invalid WASM module"

**Symptom:**
```
Error: Failed to deserialize bytecode
```

**Solution:**

1. Ensure SDK and CLI versions match:
```bash
linera --version  # Should be v0.15.4
cargo tree | grep linera-sdk  # Should be 0.15.4
```

2. Clean rebuild:
```bash
cargo clean
cargo build --release --target wasm32-unknown-unknown
```

3. Verify WASM files:
```bash
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

---

### Issue: "Failed to deserialize instantiation argument"

**Symptom:**
Application creation fails.

**Solution:**

Use correct Parameters and InstantiationArgument:

**Market Chain:**
```bash
linera create-application <BYTECODE_ID> \
  --json-parameters '{}' \
  --json-argument '{"markets":[]}'
```

**Voter Chain:**
```bash
linera create-application <BYTECODE_ID> \
  --json-parameters '{"min_stake":"1"}' \
  --json-argument '{"oracle_chain":null,"initial_stake":"10"}'
```

**Oracle Coordinator:**
```bash
linera create-application <BYTECODE_ID> \
  --json-parameters '{}' \
  --json-argument '{}'
```

---

## 🔴 Chain Issues

### Issue: Out of tokens

**Symptom:**
```
Error: Insufficient balance
```

**Solution:**

1. Check balance:
```bash
linera query-balance
```

2. Request more tokens:
```bash
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

3. Faucet gives 100 tokens per request

---

### Issue: Chain out of sync

**Symptom:**
Old block height, operations fail.

**Solution:**

```bash
# Sync with network
linera sync

# Check status
linera wallet show
```

---

## 📋 Debug Checklist

When something goes wrong:

1. ✅ Check service is running: `ps aux | grep linera`
2. ✅ Verify correct endpoint URL
3. ✅ Ensure Amount fields are strings
4. ✅ Check timestamps are in microseconds
5. ✅ Verify market status is correct
6. ✅ Check deadline has passed (for resolution)
7. ✅ Ensure voter is initialized
8. ✅ Check logs: `tail -f /tmp/graphql.log`
9. ✅ Sync chain: `linera sync`
10. ✅ Check balance: `linera query-balance`

---

## 🆘 Getting Help

If you're still stuck:

1. **Check the logs:**
   ```bash
   tail -f /tmp/graphql.log
   ```

2. **Verify deployment:**
   ```bash
   linera wallet show
   ```

3. **Test GraphQL connection:**
   ```bash
   curl http://localhost:8080
   ```

4. **Join the community:**
   - Linera Discord: https://discord.gg/linera
   - Alethea GitHub: Issues tab

5. **Review documentation:**
   - Quick Start Guide
   - API Reference
   - Key Concepts

---

## 💡 Pro Tips

1. **Use GraphiQL IDE** for testing - it shows errors clearly
2. **Always wrap Amount fields in quotes**
3. **Test with 2-minute markets** for quick iteration
4. **Check market status** before each operation
5. **Keep logs open** during development
6. **Use `linera wallet show`** frequently

---

{% content-ref url="quick-start.md" %}
[quick-start.md](quick-start.md)
{% endcontent-ref %}

{% content-ref url="api-reference.md" %}
[api-reference.md](api-reference.md)
{% endcontent-ref %}

---

**Alethea Network** - Troubleshooting Made Easy 🔧


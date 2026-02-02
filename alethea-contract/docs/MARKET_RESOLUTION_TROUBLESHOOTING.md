# Market Resolution Troubleshooting Guide

## Problem: Market Status "Voting" but Query ID is None

### Symptoms
- Market status changed to "Voting" after clicking "Request Resolution"
- Query ID remains `None` in market data
- No new query appears in Oracle Registry
- Market question does not match any queries in Registry

### Root Cause

The Simple Market was deployed with `use_local_instance: false`, which uses cross-chain messaging. However:

1. **Cross-chain messaging requires authentication** - Direct fetch (unauthenticated) cannot send authenticated cross-chain messages
2. **Mutation may not execute** - Direct fetch to GraphQL endpoint may return success but not actually execute the mutation
3. **Message not sent** - Even if mutation executes, the cross-chain message may not be sent without proper authentication

### Solution: Redeploy with `use_local_instance: true`

Since Market and Registry are on the same chain, we should use `call_application()` instead of cross-chain messaging:

```bash
cd alethea-contract
./scripts/deploy-simple-market-latest.sh
```

This will:
1. Redeploy Simple Market with `use_local_instance: true`
2. Update `alethea-market/.env.local` with new Market App ID
3. Use `call_application()` for same-chain communication (more reliable)

### Expected Behavior After Fix

1. **Request Resolution** → Uses `call_application()` to Registry
2. **Query Created** → Query immediately created in Registry
3. **Query ID Linked** → Query ID appears in market data (either via direct response or QueryCreated callback)
4. **Query Visible** → Query appears in Oracle Dashboard

### Verification Steps

After redeployment:

1. **Check Market Status:**
   ```bash
   ./scripts/check-market-query.sh 2
   ```

2. **Check Recent Queries:**
   ```bash
   ./scripts/check-recent-queries.sh
   ```

3. **Check Oracle Dashboard:**
   - Open http://localhost:4002
   - Go to Queries page
   - Look for query matching market question

### Alternative: Use Linera Client (WASM)

If you cannot redeploy, ensure mutations use Linera client:

1. **Connect Wallet** - Must be connected before requesting resolution
2. **Check Console** - Should see `✅ Using authenticated Linera client`
3. **Not Direct Fetch** - Should NOT see `⚠️ Using direct fetch (unauthenticated)`

### Why `use_local_instance: true`?

- **Same Chain**: Market and Registry are on the same chain
- **More Reliable**: `call_application()` is synchronous and immediate
- **No Cross-Chain Delay**: No need to wait for cross-chain message processing
- **Better Error Handling**: Immediate feedback if query creation fails

### Architecture Comparison

#### `use_local_instance: false` (Cross-Chain Messaging)
```
Market Chain → Cross-Chain Message → Registry Chain
     ↓                                    ↓
  Status: Voting                    Query Created
     ↓                                    ↓
  Wait for callback...            Send QueryCreated callback
     ↓                                    ↓
  Query ID Linked                 (May not arrive)
```

#### `use_local_instance: true` (Same-Chain Call)
```
Market Chain → call_application() → Registry (Same Chain)
     ↓                                    ↓
  Status: Voting                    Query Created
     ↓                                    ↓
  Query ID in Response              (Immediate)
     ↓
  Query ID Linked
```

### Next Steps

1. **Redeploy Simple Market** with `use_local_instance: true`
2. **Update Frontend** - Restart to pick up new Market App ID
3. **Test Request Resolution** - Should work immediately
4. **Verify Query Created** - Check Oracle Dashboard

---

**Status**: ⚠️ **Needs Redeployment** - Current deployment uses cross-chain messaging which requires authentication

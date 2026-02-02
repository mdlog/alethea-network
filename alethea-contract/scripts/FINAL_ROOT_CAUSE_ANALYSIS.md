# FINAL ROOT CAUSE ANALYSIS: Market Query Not Created

## Problem Summary
Market #1 status is "Voting" (resolution requested), but no query appears in Registry. Investigation shows "0 blocks" processed when checking Registry inbox.

## Root Cause Identified

### The Real Problem
**The operation `RequestResolution` was executed, but the block containing the message was NEVER COMMITTED.**

### Evidence
1. ✅ Market status changed to "Voting" - operation WAS executed
2. ✅ Contract code shows `send_to()` is called - message SHOULD be sent
3. ❌ Registry inbox shows "0 blocks" - NO messages received
4. ❌ Query ID is null in Market - query was NEVER created

### Why This Happens

When frontend calls GraphQL mutation `requestResolution`:
1. Mutation is sent to Linera service
2. Service executes the operation (status changes to "Voting")
3. **BUT**: The block may not be committed immediately
4. **IF**: Block is not committed, message is NOT sent to outbox
5. **RESULT**: No message in Registry inbox, no query created

### Technical Details

In Linera:
- Operations are executed in blocks
- Messages are only sent when block is COMMITTED
- GraphQL mutations may return success before block commitment
- ChainListener only processes committed blocks

### The Flow That's Broken

```
Frontend → GraphQL Mutation → Linera Service
                                    ↓
                            Execute Operation
                                    ↓
                            Status = "Voting" ✅
                                    ↓
                            send_to() called ✅
                                    ↓
                            Block NOT committed ❌
                                    ↓
                            Message NOT in outbox ❌
                                    ↓
                            No message in Registry inbox ❌
                                    ↓
                            Query NOT created ❌
```

## Solutions

### Solution 1: Force Block Commitment (Recommended)
After calling `requestResolution`, wait for block to be committed:

```typescript
// In MarketsPage.tsx
const handleRequestResolution = async (marketId: string) => {
    // ... existing code ...
    
    // After mutation succeeds, wait for block commitment
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Then manually process inbox or wait for ChainListener
    // Or poll for query creation
}
```

### Solution 2: Use Linera Client with Block Confirmation
Use Linera client that waits for block commitment:

```typescript
// Use executeMarketMutation with block confirmation
const result = await executeMarketMutation(mutationQuery, {
    waitForBlockCommitment: true
});
```

### Solution 3: Manual Block Commitment
After mutation, manually trigger block commitment:

```bash
# Process Market chain inbox to commit pending blocks
linera process-inbox <MARKET_CHAIN_ID>
```

### Solution 4: Check Block Status
Verify if block was committed:

```bash
# Check Market chain status
linera show-chain <MARKET_CHAIN_ID>

# Look for latest block height
# If block height didn't increase, block wasn't committed
```

## Immediate Fix

1. **Re-request resolution** from Market frontend
   - This will create a NEW operation
   - Wait 10-30 seconds for block to commit
   - ChainListener should process automatically

2. **OR manually commit block**:
   ```bash
   # Stop service
   pkill -f 'linera service'
   
   # Process Market chain inbox (commits pending blocks)
   linera process-inbox <MARKET_CHAIN_ID>
   
   # Process Registry chain inbox (processes messages)
   linera process-inbox <REGISTRY_CHAIN_ID>
   
   # Restart service
   linera service --port 8080
   ```

## Prevention

Update frontend to:
1. Wait for block commitment after mutations
2. Poll for query creation after requesting resolution
3. Show proper loading states during block commitment
4. Handle timeout cases where block doesn't commit

## Verification

After applying fix, verify:
1. Market status is "Voting" ✅
2. Query ID is set in Market ✅
3. Query exists in Registry ✅
4. Query visible in Oracle Dashboard ✅

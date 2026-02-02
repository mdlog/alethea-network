# Voter Registration Guide - Oracle Registry v2

## Current Status

⚠️ **Web dashboard registration is not working yet** because GraphQL mutations only schedule operations but don't execute them.

## Why Registration Fails

1. GraphQL `registerVoter` mutation calls `runtime.schedule_operation()`
2. Scheduled operations from GraphQL service are **not automatically executed**
3. Operations need to be executed in a block context with wallet access
4. Web dashboard cannot create blocks or execute operations directly

## Working Solutions

### Option 1: CLI Registration (Recommended for Testing)

Use the helper script to register as a voter:

```bash
# From your own chain, send a cross-chain message
# (This requires implementing cross-chain message sending)
```

### Option 2: Admin Registration (Workaround)

Admin can register voters using `RegisterVoterFor` operation:

```bash
# Register a voter on behalf of a chain ID
linera project run-operation \
  --application-id 9ee97b285979b8aa6aea7d70be372398e2081839f0ba2006031152a06231c03f \
  --operation '{"RegisterVoterFor": {
    "voter_address": "a98f820b097c07f4022a0d506d003a1314b38345aa90094b2594936fa4937c3f",
    "stake": "1000",
    "name": "TestVoter"
  }}'
```

### Option 3: Direct Operation Execution

Execute operation directly from your chain:

```bash
# This requires having the operation in your wallet context
# Not yet implemented in the dashboard
```

## Future Solution: Wallet Extension

The proper solution is to integrate with Linera wallet extension (when available) which can:
- Sign and execute operations on behalf of the user
- Create blocks with user's private keys
- Handle cross-chain messages properly

## Verification

Check if registration succeeded:

```bash
curl -X POST http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/9ee97b285979b8aa6aea7d70be372398e2081839f0ba2006031152a06231c03f \
  -H "Content-Type: application/json" \
  -d '{"query": "query { voterCount voters { address name stake } }"}' | jq .
```

## Registry Configuration

- **Registry Chain**: `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef`
- **Registry App**: `9ee97b285979b8aa6aea7d70be372398e2081839f0ba2006031152a06231c03f`
- **Deployed**: Nov 28, 2025 - 17:38 UTC
- **Features**: ✅ Callback mechanism for Market Chain integration

## Next Steps

1. Implement proper wallet integration in dashboard
2. Add Linera wallet extension support
3. Or use admin `RegisterVoterFor` for testing until wallet extension is available

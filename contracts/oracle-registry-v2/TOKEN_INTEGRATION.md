# Token Integration: Phase 2 Implementation

## Overview
Phase 2 implements actual ALETHEA token transfer for staking, moving from accounting-only to real token custody.

## Architecture

### Token Flow
```
User Chain (ALETHEA tokens)
    ↓ Transfer
Registry Chain (Hold tokens)
    ↓ Unstake
User Chain (Return tokens)
```

## State Changes

### Added Fields
```rust
pub struct OracleRegistryV2 {
    // NEW: Track actual token holdings
    pub token_holdings: MapView<ChainId, Amount>,  // Per-voter balance
    pub total_tokens_held: RegisterView<Amount>,   // Total in registry
}
```

## Message Types

### ReceiveTokens
Sent by ALETHEA token contract when tokens transferred to registry:
```rust
Message::ReceiveTokens {
    from: ChainId,      // Voter who sent tokens
    amount: Amount,     // Amount received
}
```

### TokensReturned
Internal tracking when tokens returned to user:
```rust
Message::TokensReturned {
    to: ChainId,        // Voter receiving tokens
    amount: Amount,     // Amount returned
}
```

## Operations

### UpdateStake (Enhanced)
```rust
Operation::UpdateStake {
    additional_stake: Amount,
    token_app_id: Option<ApplicationId>,  // ALETHEA token app
}
```

**Flow:**
1. User calls ALETHEA token contract to transfer tokens to registry
2. Token contract sends `ReceiveTokens` message to registry
3. Registry updates `token_holdings` and `stake`
4. User can now vote with increased power

### WithdrawStake (Enhanced)
```rust
Operation::WithdrawStake {
    amount: Amount,
}
```

**Flow:**
1. User calls `WithdrawStake` on registry
2. Registry checks available stake (not locked)
3. Registry calls ALETHEA token contract to transfer back
4. Registry updates `token_holdings` and `stake`

## Integration with ALETHEA Token

### Token Contract Interface
```rust
// ALETHEA token contract must support:
Operation::Transfer {
    owner: AccountOwner,
    amount: Amount,
    target_account: Account {
        chain_id: ChainId,  // Registry chain
        owner: AccountOwner, // Registry owner
    }
}
```

### Registry as Token Holder
- Registry chain holds tokens on behalf of voters
- Each voter's balance tracked in `token_holdings`
- Tokens locked when voting (moved to `locked_stake`)
- Tokens returned when unstaking (if not locked)

## Security

### Token Custody
- ✅ Tokens physically held by registry chain
- ✅ Cannot be spent by voters while staked
- ✅ Automatic accounting via messages
- ✅ Verifiable on-chain

### Withdrawal Protection
```rust
// Cannot withdraw locked stake
if voter_info.locked_stake > Amount::ZERO {
    return Error("Cannot withdraw while votes are active");
}

// Cannot withdraw more than available
let available = voter_info.stake - voter_info.locked_stake;
if amount > available {
    return Error("Insufficient available stake");
}
```

## Implementation Status

### Phase 2A: Accounting (Current)
- ✅ State fields added
- ✅ Message types defined
- ✅ Token receipt handlers implemented
- ⚠️ Actual token transfer not yet integrated

### Phase 2B: Full Integration (TODO)
- ⏳ Integrate with ALETHEA token contract
- ⏳ Implement actual token transfer calls
- ⏳ Add token contract address to parameters
- ⏳ Test cross-chain token transfers

## Usage Example

### Stake Tokens
```graphql
# 1. User transfers ALETHEA tokens to registry
mutation {
  # Call on ALETHEA token contract
  transfer(
    owner: "user_owner",
    amount: "100.",
    targetAccount: {
      chainId: "registry_chain_id",
      owner: "registry_owner"
    }
  )
}

# 2. Update stake in registry (after tokens received)
mutation {
  # Call on Registry contract
  updateStake(
    additionalStake: "100.",
    tokenAppId: "alethea_token_app_id"
  )
}
```

### Unstake Tokens
```graphql
mutation {
  # Call on Registry contract
  withdrawStake(amount: "50.")
}
# Registry automatically returns tokens to user
```

## Benefits

### Phase 1 (Accounting Only)
- ✅ Simple implementation
- ✅ Fast testing
- ❌ No enforcement
- ❌ Trust-based

### Phase 2 (Actual Tokens)
- ✅ Real token custody
- ✅ Verifiable on-chain
- ✅ Cannot double-spend
- ✅ Production-ready

## Migration Path

### From Phase 1 to Phase 2
1. Deploy Phase 2 contract
2. Existing voters keep accounting-based stakes
3. New stakes use actual token transfer
4. Gradually migrate old stakes to token-based

### Backward Compatibility
- Old voters: Accounting-based (stake field)
- New voters: Token-based (token_holdings field)
- Both work simultaneously
- Unified interface

## Next Steps

1. Deploy ALETHEA token contract
2. Get token application ID
3. Update registry parameters with token app ID
4. Implement token transfer calls in `update_stake`
5. Test cross-chain token transfers
6. Update dashboard to call token contract first

## Dashboard Integration

### Current Flow (Phase 2A)
```typescript
// Accounting-based
await updateStake({ amount: '100.' });
```

### Future Flow (Phase 2B)
```typescript
// 1. Transfer tokens
await aletheaToken.transfer({
  amount: '100.',
  to: registryChainId
});

// 2. Update stake
await registry.updateStake({
  amount: '100.',
  tokenAppId: aletheaTokenAppId
});
```

## Testing

### Unit Tests
- ✅ Token receipt handling
- ✅ Token return handling
- ✅ Balance tracking
- ⏳ Actual transfer integration

### Integration Tests
- ⏳ End-to-end stake flow
- ⏳ Cross-chain token transfer
- ⏳ Withdrawal with token return
- ⏳ Locked stake protection

## Conclusion

Phase 2 implementation provides the foundation for actual token custody. The accounting layer is complete and ready. Full integration with ALETHEA token contract is the next step for production deployment.

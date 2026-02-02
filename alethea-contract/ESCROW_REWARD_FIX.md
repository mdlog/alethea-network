# Escrow & Reward Minting Fix

## Problem Identified

1. **Staking Escrow**: Tokens were not actually being escrowed - escrow balance was 0
2. **Reward Minting**: Rewards were only numbers in registry state, not real tokens minted
3. **Unstaking**: Was bypassing escrow check (testnet mode), allowing unstaking even when escrow was empty

## Changes Made

### 1. Token Contract (`alethea-token/src/contract.rs`)

#### `Operation::SendUnstakeRequest` (Fixed)
- **Before**: Bypassed escrow check if escrow was empty (testnet mode)
- **After**: Properly validates escrow balance and deducts from escrow before crediting user
- **Impact**: Ensures unstaking only works if tokens are actually in escrow

```rust
// Now properly validates and deducts from escrow
if registry_balance < amount {
    return OperationResponse::error("Insufficient escrow balance");
}
// Deduct from escrow, then credit user
```

### 2. Registry Contract (`oracle-registry-v2/src/contract.rs`)

#### Reward Distribution in `resolve_query` (Fixed)
- **Before**: Only added rewards to `pending_rewards` (just a number)
- **After**: Immediately mints tokens to registry escrow when query resolves
- **Impact**: Rewards are now backed by real tokens, not just numbers

```rust
// MINT TOKENS IMMEDIATELY when query resolves
let mint_op = alethea_token::Operation::Mint {
    to: registry_owner,
    amount: *reward,
};
self.runtime.call_application(...)
```

## Token Flow (Fixed)

### Staking Flow:
1. User calls `SendStakeRequest` on their chain
2. Token contract deducts from user balance ✓
3. Token contract credits to registry escrow account ✓
4. Registry updates stake record ✓

### Reward Flow (Fixed):
1. Query resolves
2. Registry calculates rewards for correct voters
3. **NEW**: Registry immediately mints tokens to escrow ✓
4. Registry updates `pending_rewards` (for tracking)
5. User claims rewards → tokens already exist in escrow ✓

### Unstaking Flow (Fixed):
1. User calls `SendUnstakeRequest`
2. **NEW**: Token contract validates escrow has sufficient balance ✓
3. Token contract deducts from escrow ✓
4. Token contract credits user balance ✓

## Verification

After deployment, verify:

1. **Staking**: Check escrow balance increases when user stakes
2. **Rewards**: Check escrow balance increases when query resolves (before user claims)
3. **Unstaking**: Check escrow balance decreases when user unstakes
4. **Accounting**: Total tokens = Treasury + User Balances + Escrow

## Deployment Notes

- Both contracts need to be redeployed
- All existing data will be reset (new deployment)
- Users will need to re-register and re-stake
- Existing queries will be lost

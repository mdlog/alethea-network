# Deployment v3.3.0 - Escrow & Reward Minting Fix

**Deployment Date**: 2026-01-31  
**Network**: Conway Testnet  
**Version**: 3.3.0

## 🎯 Critical Fixes

### 1. Real Token Escrow
- **Problem**: Escrow balance was 0 - tokens were not actually escrowed
- **Fix**: Proper escrow account derivation and token transfer
- **Result**: Tokens are now properly stored in escrow account

### 2. Real Reward Minting
- **Problem**: Rewards were only numbers in registry state, not real tokens
- **Fix**: Tokens are minted immediately when query resolves
- **Result**: All rewards are backed by actual ALTH tokens

### 3. Proper Unstaking
- **Problem**: Unstaking bypassed escrow check (testnet mode)
- **Fix**: Proper escrow validation before crediting user
- **Result**: Unstaking only works if tokens exist in escrow

## 📋 Application IDs

### ALTH Token
- **Application ID**: `5e98e799a48a40ac37d5bed51581892acc31030d6ce24b1cfb142c8835af27c2`
- **Name**: Alethea
- **Symbol**: ALTH
- **Decimals**: 18
- **Initial Supply**: 1,000,000,000 ALTH

### Oracle Registry V2
- **Application ID**: `b08bd0587eb941b8db83fd7dffa32ad0ebd1a55eed0f9e0789b7cf02c402b9ff`
- **Min Stake**: 100 ALTH
- **Commit Duration**: 300s
- **Reveal Duration**: 300s
- **Slash Percent**: 5%

### Common
- **Chain ID**: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
- **Network**: Conway Testnet
- **RPC**: https://rpc.testnet-conway.linera.net

## 🔧 Changes Made

### Token Contract (`alethea-token/src/contract.rs`)
1. **SendUnstakeRequest**: Added proper escrow validation
   - Checks escrow balance before unstaking
   - Deducts from escrow before crediting user
   - Returns error if escrow insufficient

### Registry Contract (`oracle-registry-v2/src/contract.rs`)
1. **Reward Distribution**: Immediate token minting
   - Mints tokens to escrow when query resolves
   - Updates token holdings
   - Rewards are now backed by real tokens

## 📊 Token Flow (Fixed)

### Staking Flow
```
1. User calls SendStakeRequest
2. Token Contract deducts from user balance ✓
3. Token Contract credits to escrow account ✓
4. Registry updates stake record ✓
```

### Reward Flow (Fixed)
```
1. Query resolves
2. Registry calculates rewards
3. Registry mints tokens to escrow ✓ (NEW!)
4. Registry updates pending_rewards
5. User claims → tokens already exist ✓
```

### Unstaking Flow (Fixed)
```
1. User calls SendUnstakeRequest
2. Token Contract validates escrow balance ✓ (NEW!)
3. Token Contract deducts from escrow ✓
4. Token Contract credits user balance ✓
```

## ✅ Verification Steps

After deployment, verify:

1. **Staking**: Check escrow balance increases when user stakes
   ```graphql
   query { registryBalance(registryAppId: "b08bd058...") }
   ```

2. **Rewards**: Check escrow balance increases when query resolves
   ```graphql
   query { registryBalance(registryAppId: "b08bd058...") }
   ```

3. **Unstaking**: Check escrow balance decreases when user unstakes
   ```graphql
   query { registryBalance(registryAppId: "b08bd058...") }
   ```

4. **Accounting**: Total tokens = Treasury + User Balances + Escrow
   ```graphql
   query { 
     tokenInfo { totalSupply }
     balance(owner: "0xf53bade3...") # Treasury
     balance(owner: "0x...") # User
     registryBalance(registryAppId: "b08bd058...") # Escrow
   }
   ```

## 🚀 Next Steps

1. ✅ Update dashboard `.env.local` with new App IDs
2. ✅ Restart dashboard: `cd alethea-dashboard-vite && npm run dev`
3. ✅ Test voter registration and staking
4. ✅ Test query creation and resolution
5. ✅ Verify escrow balance increases with rewards
6. ✅ Test unstaking and verify escrow decreases

## 📝 Notes

- **Data Reset**: All previous data is lost (new deployment)
- **Re-registration Required**: Users need to register and stake again
- **Escrow Per Chain**: Each chain has its own escrow balance
- **Deterministic Escrow**: Escrow address is derived from Registry App ID

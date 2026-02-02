# Auto-Registration Design: Stake-to-Vote

## Overview
Simplified voter onboarding: Users automatically become voters when they stake ALETHEA tokens.

## Flow

### 1. User Connects Wallet
```
User → Dashboard → Get Chain ID
No registration needed yet
```

### 2. User Stakes Tokens
```
User → Stake ALETHEA tokens
     → Auto-register as voter
     → Can now vote
```

### 3. User Votes
```
User → Commit/Reveal vote
     → If not registered: Auto-register with 0 stake
     → Continue with vote
```

## Token Storage Options

### Option A: Accounting Only (Current)
```rust
pub struct VoterInfo {
    stake: Amount,  // Just a number, tokens stay in user chain
}
```
- ✅ Simple
- ❌ No enforcement (user can spend tokens)

### Option B: Token Transfer (Recommended)
```rust
pub struct RegistryState {
    staked_tokens: MapView<ChainId, Amount>,  // Actual tokens held
}
```
- ✅ Secure (tokens locked in registry)
- ✅ Can be withdrawn
- ❌ Requires fungible token integration

## Implementation Plan

### Phase 1: Auto-Registration (No Token Transfer)
1. Remove explicit `RegisterVoter` operation
2. Add auto-register in `CommitVote` and `RevealVote`
3. Add `UpdateStake` operation (accounting only)

### Phase 2: Token Integration (Future)
1. Integrate with ALETHEA token contract
2. Transfer tokens to registry on stake
3. Return tokens on unstake

## Contract Changes

### New Operations
```rust
pub enum Operation {
    // Remove: RegisterVoter
    
    // Add: Stake management
    Stake { amount: Amount },
    Unstake { amount: Amount },
    
    // Existing: Voting operations
    CommitVote { ... },
    RevealVote { ... },
}
```

### Auto-Register Logic
```rust
async fn ensure_voter_registered(&mut self, voter_chain: ChainId) {
    if self.state.voters.get(&voter_chain).await.is_none() {
        let voter_info = VoterInfo {
            chain_id: voter_chain,
            stake: Amount::ZERO,
            locked_stake: Amount::ZERO,
            reputation: 50,
            total_votes: 0,
            correct_votes: 0,
            registered_at: self.runtime.system_time(),
            is_active: true,
            name: None,
            metadata_url: None,
        };
        self.state.voters.insert(&voter_chain, voter_info).unwrap();
    }
}

async fn commit_vote(&mut self, query_id: u64, commit_hash: String) {
    let voter_chain = self.runtime.chain_id();
    
    // Auto-register if needed
    self.ensure_voter_registered(voter_chain).await;
    
    // Continue with commit...
}
```

### Stake Operation
```rust
Operation::Stake { amount } => {
    let voter_chain = self.runtime.chain_id();
    
    // Auto-register if needed
    self.ensure_voter_registered(voter_chain).await;
    
    // Update stake (accounting only for now)
    let mut voter = self.state.voters.get(&voter_chain).await.unwrap();
    voter.stake += amount;
    self.state.voters.insert(&voter_chain, voter).unwrap();
    
    // TODO Phase 2: Transfer actual tokens
}
```

## Dashboard Changes

### Remove Registration Form
- Delete `VoterRegistrationLinera.tsx`
- Remove "Register as Voter" button

### Add Stake Interface
```typescript
// New component: StakeInterface.tsx
function StakeInterface() {
  const [amount, setAmount] = useState('100');
  
  const handleStake = async () => {
    await stakeTokens({ amount: amount + '.' });
    // User is now auto-registered and can vote
  };
  
  return (
    <div>
      <input value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={handleStake}>Stake & Become Voter</button>
    </div>
  );
}
```

### Voting Flow
```typescript
async function commitVote(queryId, value) {
  // No need to check registration
  // Contract will auto-register if needed
  await commitVoteMutation({ queryId, commitHash });
}
```

## Benefits

1. **Simpler UX**
   - No explicit registration step
   - Stake = Registration

2. **Fewer Errors**
   - No "not registered" errors
   - Auto-register on first action

3. **Better Flow**
   - Connect → Stake → Vote
   - Natural progression

4. **Flexible**
   - Can vote with 0 stake (low weight)
   - Stake increases voting power

## Migration Path

### For Existing Voters
- Keep existing voter records
- They can continue voting
- Can add more stake anytime

### For New Users
- No registration needed
- First action (stake or vote) creates voter record
- Seamless onboarding

## Security Considerations

### Phase 1 (Accounting Only)
- Stake is just a number
- No actual token lock
- Trust-based system
- Good for testing/demo

### Phase 2 (Token Transfer)
- Tokens actually transferred to registry
- Locked until unstake
- Secure and verifiable
- Production-ready

## Next Steps

1. ✅ Design approved
2. Implement auto-register in contract
3. Add Stake/Unstake operations
4. Update dashboard UI
5. Test with direct client
6. (Future) Integrate ALETHEA token transfer

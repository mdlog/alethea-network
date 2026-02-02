# 🔄 Alethea Network - Simple Communication Flow

**Quick Reference Guide**

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ALETHEA ORACLE PROTOCOL                          │
│                     Complete Message Flow                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ USER         │
│ (Dashboard)  │
└──────┬───────┘
       │
       │ 1. Create Market
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ MARKET CHAIN (Prediction Market dApp)                                │
├──────────────────────────────────────────────────────────────────────┤
│ Status: Open → WaitingResolution → Resolved                          │
│                                                                       │
│ Functions:                                                            │
│ • create_market()        - Create new market                         │
│ • request_resolution()   - Request oracle resolution                 │
│ • handle_resolution()    - Receive result from Registry              │
│ • claim_winnings()       - Users claim rewards                       │
└───────────┬──────────────────────────────────────────────────────────┘
            │
            │ 2. call_application()
            │    RegisterMarket
            │    ❌ ISSUE: Doesn't work!
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ORACLE REGISTRY (Coordinator)                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Status: Active → CommitPhase → RevealPhase → Resolved                │
│                                                                       │
│ Functions:                                                            │
│ • register_market()           - Register market for resolution       │
│ • select_voters_for_market()  - Choose voters                        │
│ • broadcast_vote_requests()   - Send VoteRequest to voters           │
│ • handle_vote_commitment()    - Receive commitments                  │
│ • handle_vote_reveal()        - Receive reveals                      │
│ • aggregate_and_resolve()     - Calculate result                     │
│ • distribute_rewards()        - Send rewards to voters               │
└───────┬───────────────────────────────────────┬──────────────────────┘
        │                                       │
        │ 3. send_message()                     │ 6. send_message()
        │    VoteRequest                        │    MarketResolved
        │    (to 3 voters)                      │    (back to Market Chain)
        ▼                                       ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  VOTER 1    │  │  VOTER 2    │  │  VOTER 3    │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ Status:     │  │ Status:     │  │ Status:     │
│ Requested   │  │ Requested   │  │ Requested   │
│ Committed   │  │ Committed   │  │ Committed   │
│ Revealed    │  │ Revealed    │  │ Revealed    │
│ Rewarded    │  │ Rewarded    │  │ (Wrong)     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │ 4. send_message()               │
       │    VoteCommitment               │
       │    hash(outcome + salt)         │
       └────────────────┴────────────────┘
                        │
       ┌────────────────┴────────────────┐
       │ 5. send_message()               │
       │    VoteReveal                   │
       │    outcome + salt               │
       └─────────────────────────────────┘
```

---

## 🔢 Step-by-Step Flow

### Step 1: Create Market
```
User → Dashboard → Market Chain
```
- User fills form with question and outcomes
- Dashboard calls `createMarket` mutation
- Market stored with status `Open`

### Step 2: Request Resolution (❌ BROKEN)
```
Market Chain → Registry
```
- After deadline, user clicks "Request Resolution"
- Market Chain calls `call_application(RegisterMarket)`
- **ISSUE:** Registry never receives it!

### Step 3: Vote Request
```
Registry → Voters (3 voters)
```
- Registry selects 3 voters based on reputation/stake
- Sends `VoteRequest` message to each voter
- Voters receive question and outcomes

### Step 4: Commit Phase
```
Voters → Registry
```
- Each voter decides outcome (manual or auto)
- Creates commitment: `hash(outcome + salt)`
- Sends `VoteCommitment` to Registry
- Registry stores commitments (can't see outcome yet)

### Step 5: Reveal Phase
```
Voters → Registry
```
- After commit deadline passes
- Voters send `VoteReveal` with outcome and salt
- Registry verifies: `hash(outcome + salt) == commitment`
- Invalid reveals get slashed

### Step 6: Aggregation
```
Registry (internal)
```
- Waits for 2/3 voters to reveal (e.g., 2 out of 3)
- Calculates weighted votes
- Determines winning outcome
- Requires 66% supermajority

### Step 7: Resolution
```
Registry → Market Chain
```
- Sends `MarketResolved` with outcome
- Market Chain updates status to `Resolved`
- Users can now claim winnings

### Step 8: Rewards
```
Registry → Voters
```
- Correct voters receive rewards
- Proportional to stake and voting power
- Wrong voters get nothing
- Reputation updated

---

## 📝 Message Types Quick Reference

### Market Chain → Registry
```rust
RegisterMarket {
    question: "Will BTC hit 100k?",
    outcomes: ["Yes", "No"],
    deadline: 1762620364,
    callback_data: [market_id bytes]
}
```

### Registry → Voters
```rust
VoteRequest {
    market_id: 0,
    question: "Will BTC hit 100k?",
    outcomes: ["Yes", "No"],
    deadline: 1762620364,
    commit_deadline: 1762616764,
    reveal_deadline: 1762620364
}
```

### Voters → Registry (Commit)
```rust
VoteCommitment {
    market_id: 0,
    voter_app: "2130975d...",
    commitment_hash: [32 bytes],
    stake_locked: 1000
}
```

### Voters → Registry (Reveal)
```rust
VoteReveal {
    market_id: 0,
    voter_app: "2130975d...",
    outcome_index: 0,  // "Yes"
    salt: [32 bytes],
    confidence: 80
}
```

### Registry → Market Chain
```rust
MarketResolved {
    market_id: 0,
    outcome_index: 0,  // "Yes" won
    confidence: 85,
    callback_data: [market_id bytes]
}
```

### Registry → Voters
```rust
RewardDistribution {
    market_id: 0,
    amount: 500  // tokens
}
```

---

## ⚠️ Current Issues

### Issue #1: Market Chain → Registry
**Problem:** `call_application()` doesn't work

**Workaround:** Manual registration via dashboard
```typescript
// Dashboard calls both:
1. MarketChain.requestResolution(marketId)
2. Registry.registerMarket(question, outcomes, deadline)
```

### Issue #2: Voter Mutations
**Problem:** GraphQL mutations return "EmptyMutation"

**Impact:** Can't test manual voting

**Solution:** Fix voter service and redeploy

---

## ✅ What Works

- ✅ Market creation
- ✅ Market queries
- ✅ Registry queries
- ✅ Voter registration
- ✅ Direct GraphQL calls
- ✅ Cross-chain messages (send_message)

## ❌ What Doesn't Work

- ❌ Market → Registry (call_application)
- ❌ Voter manual voting (GraphQL mutations)
- ❌ End-to-end resolution flow

---

## 🎯 Next Steps

1. **Implement Dashboard Workaround**
   - Add button to manually register with Registry
   - Call both Market Chain and Registry

2. **Fix Voter Mutations**
   - Update voter service
   - Redeploy voters

3. **Test Complete Flow**
   - Create market
   - Request resolution (manual)
   - Submit votes
   - Verify resolution
   - Check rewards

---

**Quick Reference Complete**  
**For detailed technical docs, see:** `COMMUNICATION_ARCHITECTURE_DETAILED.md`

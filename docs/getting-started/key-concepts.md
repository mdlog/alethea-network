# Key Concepts

```
    ◉─────◉
     ╲   ╱      Decentralized Network
      ◉─◉       of Truth Validators
```

Before diving into Alethea Network, it's important to understand the core concepts that make our decentralized oracle platform work.

## 🏗️ Architecture Overview

Alethea Network is built on **three smart contracts** that work together as a decentralized oracle infrastructure:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                 ┌────────────────────────┐                    │
│                 │  ORACLE COORDINATOR    │                    │
│                 │                        │                    │
│                 │  • Vote Aggregation    │                    │
│                 │  • Consensus Calc      │                    │
│                 │  • Resolution          │                    │
│                 └───────────┬────────────┘                    │
│                             │                                  │
│                             │ Messages                         │
│                             │                                  │
│         ┌───────────────────┴──────────────────┐              │
│         │                                      │              │
│    Resolution                          Voting &               │
│    Requests                            Reveals                │
│         │                                      │              │
│         ↓                                      ↓              │
│  ┌──────────────┐                     ┌──────────────┐      │
│  │ MARKET CHAIN │                     │ VOTER CHAIN  │      │
│  │              │                     │              │      │
│  │ • AMM Pricing│                     │ • Commit     │      │
│  │ • Trading    │                     │ • Reveal     │      │
│  │ • Positions  │                     │ • Reputation │      │
│  │              │                     │ • Stake      │      │
│  └──────────────┘                     └──────────────┘      │
│                                                                │
│         Built on Linera Mikrochains                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 🎯 Core Components

### 1. Market Chain

The **Market Chain** handles all trading operations:

**Purpose:**
- Create prediction markets
- Manage liquidity pools
- Enable buying/selling shares
- Track user positions
- Calculate and distribute payouts

**Key Features:**
- ✅ Automated Market Maker (AMM) pricing
- ✅ Multi-outcome support
- ✅ Position tracking per user
- ✅ Fair payout calculation
- ✅ Market lifecycle management

**Market States:**
```
Open → Trading Active → Pending Resolution → Resolved → Payouts
```

### 2. Voter Chain

The **Voter Chain** provides decentralized oracle:

**Purpose:**
- Register voters with stake requirement
- Accept vote commitments (encrypted)
- Process vote reveals (verification)
- Calculate consensus
- Manage voter reputation

**Key Features:**
- ✅ Commit-reveal voting mechanism
- ✅ Cryptographic vote security
- ✅ Reputation system
- ✅ Stake-based participation
- ✅ Automated consensus

**Voting Flow:**
```
Register → Commit (secret) → Reveal (verify) → Consensus → Reward
```

### 3. Oracle Coordinator

The **Oracle Coordinator** orchestrates the resolution process:

**Purpose:**
- Aggregate votes from multiple voters
- Calculate weighted consensus
- Manage dispute periods
- Distribute rewards and penalties
- Provide final market resolution

**Key Features:**
- ✅ Multi-voter aggregation
- ✅ Weighted majority consensus
- ✅ Dispute handling
- ✅ Automatic reward distribution
- ✅ Resolution broadcasting

**Resolution Flow:**
```
Vote Aggregation → Consensus Calculation → Dispute Period → Final Resolution → Market Settlement
```

## 🔐 Commit-Reveal Voting

The **commit-reveal** scheme is central to Alethea's security:

### Phase 1: Commit (Secret)

```rust
// Voter submits hash of vote + salt
vote_hash = SHA256(vote + salt)
// Hash stored on-chain, vote stays secret
```

**Why it matters:**
- Nobody can see your actual vote
- Prevents copying other voters
- Eliminates front-running
- Ensures independent voting

### Phase 2: Reveal (Verify)

```rust
// Voter reveals actual vote + salt
revealed_vote = "Yes"
revealed_salt = "abc123..."

// Contract verifies:
if SHA256(revealed_vote + revealed_salt) == stored_hash {
    vote_accepted = true
}
```

**Why it matters:**
- Cryptographic proof of commitment
- Impossible to change vote after commit
- Transparent verification
- Fair consensus

## 📊 Reputation System

Voters build **long-term reputation** based on accuracy:

### How It Works

```
Correct Vote → Reputation +10 points
Incorrect Vote → Reputation -5 points
Streak Bonus → +2 points per consecutive correct vote
```

### Benefits

**For Voters:**
- ✅ Higher voting power over time
- ✅ Increased rewards
- ✅ Unlock premium features
- ✅ Build credibility

**For Markets:**
- ✅ Attracts quality voters
- ✅ Improves accuracy
- ✅ Deters bad actors
- ✅ Long-term incentive alignment

### Reputation Levels

| Level | Points | Benefits |
|-------|--------|----------|
| Novice | 0-100 | Standard voting power |
| Trusted | 100-500 | 1.2x voting weight |
| Expert | 500-1000 | 1.5x voting weight |
| Oracle | 1000+ | 2x voting weight |

## 🔗 Cross-Chain Communication

Alethea's three contracts communicate via **Linera's native cross-chain messaging**:

### Message Flow Diagram

```
┌────────────────────────────────────────┐
│   Prediction Market App                │
│   Chain ID: e476187f...                │
│   (Sports Betting, Politics, etc)      │
└──────────────┬─────────────────────────┘
               │
               │ 1. Store Alethea's Chain ID
               │    alethea_chain = 3a4b5c6d...
               │
               │ 2. Send Message
               │    runtime.send_message(
               │        target: 3a4b5c6d...,  ← Alethea's Chain ID
               │        message: CreateMarket {...}
               │    )
               ↓
┌────────────────────────────────────────┐
│   Alethea Oracle Coordinator           │
│   Chain ID: 3a4b5c6d...                │
│                                        │
│   • Receives market creation request   │
│   • Coordinates voting process         │
│   • Aggregates votes from voters       │
└──────────────┬─────────────────────────┘
               │
               │ 3. Process voting with Voter Chain
               │    (Voters commit, reveal, aggregate)
               │
               │ 4. Calculate consensus
               │    (Weighted majority, dispute handling)
               │
               │ 5. Send Resolution back
               │    runtime.send_message(
               │        target: e476187f...,  ← Prediction Market Chain ID
               │        message: MarketResolved {...}
               │    )
               ↓
┌────────────────────────────────────────┐
│   Prediction Market App                │
│   Chain ID: e476187f...                │
│   execute_message() receives resolution│
│                                        │
│   • Update market status               │
│   • Distribute payouts                 │
│   • Close market                       │
└────────────────────────────────────────┘
```

**Key Steps:**
1. **Market Creation** - External app sends market request to Alethea
2. **Oracle Processing** - Alethea coordinates voting and consensus
3. **Resolution** - Final result sent back to requesting app

### Cross-Chain Benefits

- ✅ **Decoupled Architecture** - Each contract operates independently
- ✅ **Scalability** - Parallel processing across chains
- ✅ **Security** - Isolated failure domains
- ✅ **Flexibility** - Easy to upgrade individual components
- ✅ **Native Integration** - Built-in Linera cross-chain support

## 💰 Automated Market Maker (AMM)

The AMM provides **dynamic pricing** for prediction market shares:

### How AMM Works

**Liquidity Pools:**
```
Market: "Bitcoin > $100k?"
Pool A (Yes): 100,000 tokens
Pool B (No): 100,000 tokens
```

**Price Calculation:**
```
Price_Yes = Pool_Yes / (Pool_Yes + Pool_No)
Price_No = Pool_No / (Pool_Yes + Pool_No)
```

**Example:**
```
Initial: Yes = 50%, No = 50%

After buying "Yes":
Pool_Yes = 80,000 (↓)
Pool_No = 120,000 (↑)

New Price:
Yes = 40% (cheaper)
No = 60% (more expensive)
```

### Why AMM?

- ✅ **Always Liquid** - Can always buy/sell
- ✅ **Fair Pricing** - Supply and demand
- ✅ **No Order Books** - Automatic execution
- ✅ **Transparent** - All on-chain

## 🔗 Cross-Chain Messaging

Alethea uses **Linera's native cross-chain** communication:

### How It Works

```
1. Market Chain → "Need resolution for Market #5"
   ↓
2. Message sent to Voter Chain
   ↓
3. Voter Chain → Voting process
   ↓
4. Consensus reached
   ↓
5. Voter Chain → "Market #5: Winner is 'Yes'"
   ↓
6. Market Chain → Distribute payouts
```

### Benefits

- ✅ **No Bridges** - Native protocol support
- ✅ **Fast** - Sub-second messaging
- ✅ **Secure** - No external dependencies
- ✅ **Atomic** - Either all succeed or all fail

## 🛡️ Security Model

Alethea's security comes from **multiple layers**:

### 1. Cryptographic Security
- SHA-256 hashing
- Commit-reveal scheme
- Digital signatures

### 2. Economic Security
- Voter stake requirement (min 1 token on testnet, higher on mainnet)
- Reputation at risk
- Slashing for bad behavior

### 3. Consensus Security
- Majority voting (51%+)
- Multiple independent voters
- Byzantine Fault Tolerance ready

### 4. Smart Contract Security
- Rust memory safety
- WASM deterministic execution
- Formal verification ready

## 💎 Token Economics

### Stake Requirements

**Voters:**
```
Minimum Stake: 100,000 tokens
Purpose: Skin in the game
Unlocked: After voting period
```

**Market Creators:**
```
Initial Liquidity: 10,000+ tokens
Purpose: Bootstrap AMM
Returns: When market closes + trading fees
```

### Fee Structure

```
Trading Fee: 0.3% per trade
Market Creation: 1000 tokens
Oracle Request: 500 tokens

Fee Distribution:
- 50% to liquidity providers
- 30% to voters
- 20% to protocol treasury
```

## 📈 Market Lifecycle

### 1. Creation
```
Creator provides:
- Question
- Outcomes (e.g., Yes/No)
- Resolution deadline
- Initial liquidity
```

### 2. Trading
```
Users:
- Buy shares
- Sell shares
- Provide liquidity
- Monitor prices
```

### 3. Resolution Request
```
Deadline reached:
- Market locks trading
- Request sent to Voter Chain
- Voters have 24h to vote
```

### 4. Voting
```
Phase 1 (12h): Commit votes
Phase 2 (12h): Reveal votes
Consensus: Majority wins
```

### 5. Payout
```
Winning shares: 1 token each
Losing shares: 0 tokens
Liquidity: Returned to providers
```

## 🎮 User Roles

### Trader
- Buy/sell market shares
- Speculate on outcomes
- Profit from price movements

### Liquidity Provider
- Add liquidity to pools
- Earn trading fees
- Help market efficiency

### Voter
- Stake tokens
- Vote on outcomes
- Earn rewards
- Build reputation

### Market Creator
- Define markets
- Provide initial liquidity
- Earn fees on trading volume

## 🔄 Data Flow

Complete data flow in Alethea Network:

```
1. User creates market on Market Chain
   ↓
2. Other users trade shares (AMM pricing)
   ↓
3. Deadline reached → Market locks
   ↓
4. Market Chain sends resolution request to Voter Chain
   ↓
5. Voters commit encrypted votes
   ↓
6. Voters reveal votes (verification)
   ↓
7. Voter Chain calculates consensus
   ↓
8. Result sent back to Market Chain
   ↓
9. Market Chain distributes payouts
   ↓
10. Voters receive reputation + rewards
```

## 🌟 Why These Concepts Matter

Understanding these concepts helps you:

1. **Trade Effectively** - Know how prices work
2. **Vote Accurately** - Understand the process
3. **Build Integrations** - Use the right APIs
4. **Trust the System** - See the security guarantees

## 🌐 Current Deployment

**Alethea Network is LIVE** on Conway Testnet:

* **Network**: Linera Conway Testnet (Public)
* **Chain ID**: `8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16`
* **Market App**: `dbdd3588...96b` ✅ INTEGRATED
* **Voter App**: `333197de...bc40` ✅ VOTING OPERATIONAL (Direct voting mode)
* **Oracle Coordinator**: `d6e3e0e8...209` ✅ INTEGRATED
* **Block Height**: 83+
* **Min Stake**: 1 token (testnet friendly!)
* **Validators**: 14 active nodes

**Quick Access**:
* Explorer: [http://localhost:3333](http://localhost:3333)
* GraphQL: [http://localhost:8080](http://localhost:8080)

**⚠️ Important API Requirements**:
1. **Amount fields MUST be strings**: Use `"1000000"` not `1000000` for `initialLiquidity` and `amount`
2. **Timestamps in microseconds**: Multiply seconds by 1,000,000
3. **Direct voting mode**: Testnet uses simplified voting (commit-reveal planned for production)

## Next Steps

Now that you understand the key concepts:

{% content-ref url="../README.md" %}
[README.md](../README.md)
{% endcontent-ref %}

---

**Alethea Network** - Where Truth Meets Technology 🏛️


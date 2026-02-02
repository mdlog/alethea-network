# What is Alethea?

```
    ◉─────◉
     ╲   ╱
      ◉─◉
```

## The Name

**Alethea** (Ἀλήθεια) comes from ancient Greek mythology, representing the goddess and personification of truth, sincerity, and honesty. She was the daughter of Zeus, the king of the gods.

> "Alethea" literally means "truth" or "disclosure" in Greek, derived from *a-* (not) + *lēthē* (concealment, oblivion).

Just as the goddess Alethea represented divine, unquestionable truth, **Alethea Network** brings that same certainty to blockchain and decentralized markets.

## The Mission

### 🎯 Core Mission

To create a trustless, cryptographically secure oracle platform where truth is determined by collective consensus, not by trust in centralized authorities.

### 🌟 Vision

To become the most trusted oracle network in Web3, where every market resolution is:
- ✅ Backed by collective wisdom
- ✅ Secured by mathematics
- ✅ Guided by honesty and accuracy

## How It Works

### The Three Pillars

#### 1. 🔐 Cryptographic Security

Using SHA-256 commit-reveal scheme:
```
Commit Phase:  vote_hash = SHA256(vote + salt)
Reveal Phase:  verify(vote_hash == SHA256(revealed_vote + revealed_salt))
```

This prevents:
- Front-running
- Voter coordination
- Result manipulation

#### 2. 👥 Collective Consensus

Truth determined by majority voting:
- Multiple independent voters
- Stake-weighted voting power
- Byzantine Fault Tolerance ready

#### 3. 📊 Reputation Incentives

Long-term accuracy tracking:
- Streak bonuses for consistency
- Reputation decay for inaccuracy
- Economic incentives for honesty

## Key Innovations

### 🆕 What Makes Alethea Unique

1. **Native Linera Integration**
   - Built specifically for Linera mikrochains
   - Native cross-chain messaging
   - No bridges needed

2. **Commit-Reveal Voting**
   - Cryptographic commitments
   - Two-phase voting process
   - Front-running proof

3. **Reputation System**
   - Long-term accuracy tracking
   - Streak-based bonuses
   - Confidence weighting

4. **AMM Integration**
   - Prediction market trading
   - Automated price discovery
   - Liquidity pools

5. **Developer-Friendly**
   - GraphQL API
   - Automatic mutation generation
   - Clear documentation

## The Technology Stack

### Blockchain Layer
- **Platform:** Linera Protocol v0.15.4
- **Architecture:** Mikrochains
- **Consensus:** Byzantine Fault Tolerance

### Smart Contracts
- **Language:** Rust
- **Target:** WebAssembly (WASM)
- **SDK:** Linera SDK 0.15.4

### Storage
- **System:** RootView, MapView, RegisterView
- **Serialization:** BCS (Binary Canonical Serialization)
- **Persistence:** On-chain state

### API Layer
- **Interface:** GraphQL
- **Framework:** async-graphql 7.0
- **Features:** Queries + Mutations

### Cryptography
- **Hashing:** SHA-256
- **Commitments:** Deterministic salts
- **Signatures:** Linera native signatures

## Comparison with Other Oracles

| Feature | Alethea | UMA | Chainlink | Tellor |
|---------|---------|-----|-----------|--------|
| **Model** | Commit-Reveal Voting | Optimistic + Dispute | Node Federation | Staked Reporting |
| **Speed** | 2 hours | 2-48 hours | Minutes | Minutes |
| **Security** | Cryptographic | Economic | Reputation | Economic |
| **Decentralization** | Full | Partial | Partial | Full |
| **Front-Running** | Impossible | Possible | N/A | Possible |
| **Blockchain** | Linera | Ethereum | Multi-chain | Multi-chain |
| **Cost** | Low | Medium-High | High | Medium |

## Use Case Examples

### Prediction Markets
```
Market: "Will Bitcoin reach $100k by Dec 31, 2025?"
Outcomes: [Yes, No]
Resolution: Alethea voters verify price at deadline
```

### Sports Betting
```
Market: "Will Team A win the championship?"
Outcomes: [Yes, No]
Resolution: Voters confirm match result
```

### Insurance
```
Claim: "Did earthquake >7.0 occur in region X?"
Outcomes: [Yes, No]
Resolution: Voters verify seismic data
```

### DeFi Price Feeds
```
Query: "Current BTC/USD price?"
Source: Multiple voters provide data
Result: Median price from consensus
```

## Who Should Use Alethea?

### 👨‍💻 Developers
- Building prediction markets
- Need trustless oracles
- Want easy GraphQL integration

### 💼 Protocols
- DeFi platforms needing price feeds
- Insurance platforms
- Governance systems

### 🎯 Traders
- Prediction market participants
- Liquidity providers
- Market makers

### 🗳️ Voters
- Earn rewards for accurate voting
- Build reputation over time
- Passive income opportunity

## 🌐 Live Deployment

**Status**: ✅ **DEPLOYED ON CONWAY TESTNET**

Alethea Network is currently live on:
* **Network**: Linera Conway Testnet (Public)
* **Chain ID**: `8550ef0ecb1ee0289b94c88d5bdec0183e5c3667d473ab1cedcf19f56ad6bd16`
* **Validators**: 14 active nodes
* **Min Stake**: 1 token (testnet friendly!)
* **Block Height**: 83+
* **Applications**: 3 deployed (Market, Voter, Oracle Coordinator)

**Try it now**:
* Explorer: [http://localhost:3333](http://localhost:3333)
* GraphQL: [http://localhost:8080](http://localhost:8080)

**Current Features**:
* ✅ Create prediction markets
* ✅ Buy/sell shares with AMM pricing
* ✅ Direct voting (testnet mode)
* ✅ Oracle coordination & resolution
* ✅ Cross-chain messaging
* ✅ Reputation tracking

## Getting Started

Ready to dive in?

{% content-ref url="../README.md" %}
[README.md](../README.md)
{% endcontent-ref %}

---

**Alethea Network** - Truth Through Collective Wisdom 🏛️


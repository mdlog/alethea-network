# 🔮 Alethea Network: Oracle Resolution Protocol Layer

**Last Updated:** November 20, 2025

---

## 🎯 Vision & Purpose

**Alethea Network adalah lapisan protokol Oracle Resolution yang terdesentralisasi**, mirip dengan UMA Protocol, tetapi dibangun di atas Linera blockchain untuk performa tinggi dan skalabilitas.

### Core Concept

Alethea menyediakan **trustless resolution layer** untuk prediction markets dan DApps lainnya yang membutuhkan verifikasi data real-world secara terdesentralisasi.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    External DApps Layer                         │
│  (Polymarket, Augur, Custom Prediction Markets, etc.)          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Request Resolution
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│              Alethea Oracle Resolution Layer                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Oracle Registry (Core Protocol)                         │  │
│  │  - Query Management                                      │  │
│  │  - Voter Selection (Power-based)                         │  │
│  │  - Resolution Coordination                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     ↓                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Oracle Contract (Commit-Reveal Voting)                  │  │
│  │  - Commit Phase (24h)                                    │  │
│  │  - Reveal Phase (24h)                                    │  │
│  │  - Hash Verification                                     │  │
│  │  - Result Aggregation                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     ↓                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Alethea Dashboard (Voter Interface)                     │  │
│  │  - View pending resolutions                              │  │
│  │  - Submit commit votes                                   │  │
│  │  - Reveal votes                                          │  │
│  │  - Earn rewards                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Return Resolution Result
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External DApps Layer                         │
│  - Receive resolution result (Yes/No/Value)                    │
│  - Distribute rewards to users                                 │
│  - Settle markets                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Resolution Flow

### Example: Polymarket Integration

#### **Phase 1: Market Creation (Polymarket)**
```
1. User creates market on Polymarket:
   "Will Bitcoin reach $100k by end of 2024?"
   
2. Polymarket users trade shares:
   - Buy "Yes" shares
   - Buy "No" shares
   - AMM pricing mechanism
   
3. Market deadline: December 31, 2024, 23:59:59 UTC
```

#### **Phase 2: Resolution Request (Polymarket → Alethea)**
```
4. Deadline reached → Trading stops
   
5. Polymarket sends resolution request to Alethea:
   {
     "question": "Will Bitcoin reach $100k by end of 2024?",
     "outcomes": ["Yes", "No"],
     "deadline": 1735689600000,
     "requester": "polymarket_chain_id",
     "callback": "polymarket_resolution_handler"
   }
   
6. Alethea creates Oracle Query:
   - Query ID: 123
   - Status: Pending Resolution
   - Commit Phase Start: Immediately
   - Commit Phase End: +24 hours
   - Reveal Phase End: +48 hours
```

#### **Phase 3: Voter Selection (Alethea)**
```
7. Alethea selects voters based on Power:
   - Power = Stake × Reputation Weight
   - Top N voters selected (e.g., top 10)
   - Selected voters notified
   
8. Query appears in Alethea Dashboard:
   - Tab: "Active"
   - Phase: "Commit"
   - Time Remaining: 24h countdown
```

#### **Phase 4: Commit Phase (Alethea Voters)**
```
9. Voters research the answer:
   - Check Bitcoin price on Dec 31, 2024
   - Verify from multiple sources
   - Determine: "No" (BTC did not reach $100k)
   
10. Voters commit their votes:
    - Generate salt: "xyz789abc"
    - Create hash: SHA-256("No" + "xyz789abc")
    - Submit commit hash to blockchain
    - Hash stored on-chain
    
11. Commit Phase ends after 24 hours
```

#### **Phase 5: Reveal Phase (Alethea Voters)**
```
12. Reveal Phase starts automatically
    
13. Voters reveal their votes:
    - Submit: value="No", salt="xyz789abc"
    - Blockchain verifies: SHA-256("No" + salt) == stored hash
    - Vote recorded if hash matches
    
14. Reveal Phase ends after 24 hours
```

#### **Phase 6: Resolution (Alethea)**
```
15. Alethea aggregates votes:
    - Strategy: Weighted by voter power
    - Example results:
      * Voter 1 (Power: 1000): "No"
      * Voter 2 (Power: 800): "No"
      * Voter 3 (Power: 600): "No"
      * Voter 4 (Power: 500): "No"
      * Voter 5 (Power: 400): "Yes"
    
16. Calculate weighted result:
    - "No" votes: 2900 power (96.7%)
    - "Yes" votes: 400 power (13.3%)
    - Final Result: "No"
    
17. Check for disputes:
    - If no dispute within dispute period
    - Result finalized
```

#### **Phase 7: Result Callback (Alethea → Polymarket)**
```
18. Alethea sends result back to Polymarket:
    {
      "query_id": 123,
      "question": "Will Bitcoin reach $100k by end of 2024?",
      "result": "No",
      "confidence": 96.7,
      "timestamp": 1735862400000,
      "proof": "0xabc123..."
    }
    
19. Polymarket receives resolution:
    - Market status: Resolved
    - Winning outcome: "No"
```

#### **Phase 8: Reward Distribution**
```
20. Polymarket distributes to users:
    - Users who bought "No" shares → Receive winnings
    - Users who bought "Yes" shares → Lose stake
    
21. Alethea distributes to voters:
    - Correct voters (voted "No") → Receive proportional rewards
    - Incorrect voters (voted "Yes") → Lose reputation
    - Reputation updated for future selection
```

---

## 🎯 Key Features

### **1. Trustless Resolution**
- No single point of failure
- Decentralized voter network
- Cryptographic verification (commit-reveal)

### **2. Power-Based Selection**
- Only qualified voters participate
- Power = Stake × Reputation
- Meritocratic system

### **3. Privacy-Preserving**
- Commit-reveal scheme prevents vote manipulation
- Votes hidden during commit phase
- Revealed only after all commits

### **4. Cross-Chain Compatible**
- Works with any blockchain
- Linera for high performance
- Cross-chain messaging support

### **5. Economic Security**
- Voters stake tokens
- Rewards for correct votes
- Penalties for incorrect votes
- Reputation system

---

## 🔗 Integration Examples

### **Polymarket Integration**
```rust
// Polymarket creates market
create_market(
    question: "Will Bitcoin reach $100k by end of 2024?",
    outcomes: ["Yes", "No"],
    deadline: 1735689600000
)

// After deadline, request resolution
request_oracle_resolution(
    market_id: 123,
    oracle: "alethea_network",
    callback: handle_resolution
)

// Receive resolution callback
fn handle_resolution(result: OracleResult) {
    if result.outcome == "No" {
        distribute_to_no_holders();
    } else {
        distribute_to_yes_holders();
    }
}
```

### **Custom DApp Integration**
```typescript
// Any DApp can use Alethea for resolution
const alethea = new AletheaClient({
    chainId: "8a80fe20...",
    registryId: "6cf34d72..."
});

// Create resolution request
const query = await alethea.createQuery({
    question: "Did Team A win the match?",
    outcomes: ["Yes", "No"],
    deadline: Date.now() + 86400000, // 24h from now
    rewardAmount: "1000000"
});

// Listen for resolution
alethea.onResolution(query.id, (result) => {
    console.log("Resolution:", result.outcome);
    // Distribute rewards based on result
});
```

---

## 📊 Comparison with UMA Protocol

| Feature | UMA Protocol | Alethea Network |
|---------|-------------|-----------------|
| **Blockchain** | Ethereum | Linera |
| **Resolution Method** | Optimistic Oracle | Commit-Reveal Voting |
| **Voter Selection** | Open (anyone can dispute) | Power-based (selected voters) |
| **Privacy** | Public votes | Commit-reveal (private) |
| **Speed** | Slow (Ethereum) | Fast (Linera mikrochains) |
| **Cost** | High gas fees | Low fees |
| **Scalability** | Limited | High (parallel execution) |
| **Dispute Mechanism** | Economic guarantee | Reputation + Stake |

---

## 🚀 Use Cases

### **1. Prediction Markets**
- Polymarket
- Augur
- Custom prediction platforms

### **2. DeFi Protocols**
- Price feeds
- Insurance claims
- Liquidation triggers

### **3. Gaming**
- Tournament results
- In-game events
- NFT rarity verification

### **4. Real-World Data**
- Sports results
- Weather data
- IoT sensor verification

### **5. Governance**
- DAO proposals
- Multi-sig validation
- Community decisions

---

## 💡 Why Alethea on Linera?

### **1. High Performance**
- Mikrochains for parallel execution
- Sub-second finality
- Thousands of TPS

### **2. Low Cost**
- Minimal transaction fees
- Affordable for high-frequency queries
- Sustainable for voters

### **3. Scalability**
- Each query can run on separate mikrochain
- No congestion
- Unlimited growth potential

### **4. Developer Experience**
- Rust smart contracts
- GraphQL API
- Easy integration

---

## 🎯 Current Status

### **Implemented ✅**
- Oracle Registry v2
- Oracle Contract (Commit-Reveal)
- Power-based voter selection
- Commit-reveal voting mechanism
- Alethea Dashboard
- Cross-chain messaging
- Market Chain (example integration)

### **In Progress 🔄**
- Dispute mechanism
- Advanced resolution strategies
- Multi-chain bridges
- SDK for DApp integration

### **Planned 📋**
- Polymarket integration
- Augur integration
- Price feed oracles
- Insurance claim resolution
- Governance voting

---

## 📝 Summary

**Alethea Network = Oracle Resolution Protocol Layer**

**Vision:**
> Menjadi lapisan oracle resolution terdesentralisasi yang dapat digunakan oleh semua prediction markets dan DApps untuk mendapatkan data real-world yang trustless dan terverifikasi.

**How it Works:**
1. DApp (e.g., Polymarket) creates market
2. Users trade on market
3. Deadline reached → Request resolution from Alethea
4. Alethea voters commit & reveal votes
5. Result aggregated and sent back to DApp
6. DApp distributes rewards based on result

**Key Innovation:**
- **Commit-Reveal Voting** untuk privacy
- **Power-Based Selection** untuk quality
- **Linera Blockchain** untuk performance
- **Cross-Chain Compatible** untuk adoption

---

**Built with ❤️ on Linera Blockchain**

**Alethea Network: Trustless Oracle Resolution for Web3** 🚀

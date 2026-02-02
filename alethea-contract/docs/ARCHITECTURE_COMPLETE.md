# 🏗️ Arsitektur Lengkap Alethea Network

**Versi:** 3.4.0  
**Tanggal:** 25 Januari 2026  
**Status:** Production Ready dengan Decreasing Inflation & Service Fee

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Komponen Utama](#komponen-utama)
4. [Model Ekonomi](#model-ekonomi)
5. [Flow Lengkap](#flow-lengkap)
6. [Integrasi External dApps](#integrasi-external-dapps)
7. [Security & Mechanisms](#security--mechanisms)
8. [State Management](#state-management)
9. [Deployment Information](#deployment-information)

---

## 🎯 Overview

**Alethea Network** adalah decentralized oracle resolution layer yang dibangun di atas Linera blockchain. Network ini menyediakan trustless resolution service untuk prediction markets, insurance protocols, dan dApps lainnya yang membutuhkan verifikasi data real-world.

### **Core Value Proposition:**

- ✅ **Trustless Resolution**: Commit-reveal voting mechanism
- ✅ **Power-Based Selection**: Voters dipilih berdasarkan stake × reputation
- ✅ **Economic Security**: Bond mechanism untuk spam prevention
- ✅ **Sustainable**: Service fee + decreasing inflation rate
- ✅ **Cross-Chain Compatible**: Works dengan berbagai blockchain via Linera

---

## 🏛️ Arsitektur Sistem

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DAPPS LAYER                              │
│  (Prediction Markets, Insurance, Gaming, etc.)                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Polymarket   │  │ Insurance    │  │ Custom DApp  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                      │
│                            │                                          │
│                            │ CreateQueryWithBond                      │
│                            │ (bond + service_fee + priority_fee)      │
│                            ▼                                          │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                    ALETHEA ORACLE NETWORK                           │
│                    (Linera Blockchain)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Oracle Registry V2 (Core Protocol)                   │  │
│  │                                                               │  │
│  │  • Query Management                                          │  │
│  │  • Voter Selection (Power-based)                             │  │
│  │  • Vote Aggregation                                          │  │
│  │  • Resolution Logic                                           │  │
│  │  • Reward Distribution                                        │  │
│  │  • Bond & Service Fee Management                             │  │
│  │  • Inflation Control (Decreasing Rate)                        │  │
│  └───────────────────┬───────────────────────────────────────────┘  │
│                      │                                                │
│                      │ Cross-chain Messages                           │
│                      │                                                │
│  ┌───────────────────▼───────────────────────────────────────────┐  │
│  │              ALTH Token Contract                                │  │
│  │                                                                 │  │
│  │  • Token Minting (for rewards)                                │  │
│  │  • Token Escrow (for staking)                                  │  │
│  │  • Balance Management                                          │  │
│  │  • Transfer Operations                                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │         Alethea Dashboard (Voter Interface)                   │  │
│  │                                                               │  │
│  │  • View Pending Queries                                       │  │
│  │  • Commit Votes                                               │  │
│  │  • Reveal Votes                                               │  │
│  │  • Claim Rewards                                              │  │
│  │  • Manage Stake                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │ Resolution Callback
                            │
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DAPPS LAYER                             │
│                                                                      │
│  • Receive Resolution Result                                        │
│  • Distribute Winnings                                              │
│  • Settle Markets                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Komponen Utama

### **1. Oracle Registry V2 Contract**

**Lokasi:** `alethea-contract/oracle-registry-v2/`

**Fungsi Utama:**
- Query management (create, resolve, dispute)
- Voter selection & management
- Vote aggregation & resolution
- Reward distribution
- Bond & service fee management
- Inflation control (decreasing rate)

**Key State:**
```rust
pub struct OracleRegistryV2 {
    // Voter Management
    pub voters: MapView<ChainId, VoterInfo>,
    pub total_stake: RegisterView<Amount>,
    
    // Query Management
    pub queries: MapView<u64, Query>,
    pub active_queries: RegisterView<Vec<u64>>,
    
    // Rewards
    pub pending_rewards: MapView<ChainId, Amount>,
    pub total_rewards_distributed: RegisterView<Amount>,
    
    // Inflation & Bonds
    pub inflation_pool: RegisterView<Amount>,
    pub total_inflation_distributed: RegisterView<Amount>,
    pub bond_pool: RegisterView<Amount>,
    pub query_bonds: MapView<u64, BondInfo>,
    
    // Protocol Treasury
    pub protocol_treasury: RegisterView<Amount>,
    pub total_service_fees_collected: RegisterView<Amount>,
    
    // Configuration
    pub parameters: RegisterView<ProtocolParameters>,
}
```

---

### **2. ALTH Token Contract**

**Lokasi:** `alethea-token/`

**Fungsi Utama:**
- Token minting (for rewards)
- Token escrow (for staking)
- Balance management
- Transfer operations

**Key Operations:**
```rust
pub enum Operation {
    Mint { to: AccountOwner, amount: Amount },
    Transfer { from: AccountOwner, to: AccountOwner, amount: Amount },
    SendStakeRequest { to_registry: ApplicationId, amount: Amount },
    SendUnstakeRequest { to_registry: ApplicationId, amount: Amount },
    MintReward { to: AccountOwner, amount: Amount },
    BurnSlash { from: AccountOwner, amount: Amount },
}
```

**Escrow Account:**
- Derived from Registry Application ID
- Holds staked tokens
- Holds reward tokens (before claim)

---

### **3. Alethea Dashboard**

**Lokasi:** `alethea-dashboard-vite/`

**Fungsi Utama:**
- Voter registration & management
- Query viewing & voting
- Reward claiming
- Stake management
- Admin operations

**Tech Stack:**
- React + Vite
- TypeScript
- `@linera/client` & `@linera/signer`
- GraphQL for queries

---

## 💰 Model Ekonomi

### **1. Query Creation Cost**

**Setiap query creation memerlukan:**

```
┌─────────────────────────────────────────────────────────┐
│         COST STRUCTURE PER QUERY CREATION               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Bond: 100 ALTH (minimum)                            │
│     └─> ✅ REFUNDABLE (jika tidak ada dispute)         │
│     └─> ❌ SLASHED (jika ada dispute yang menang)       │
│     └─> Purpose: Economic security (spam prevention)    │
│                                                          │
│  2. Service Fee: 10 ALTH (minimum)                      │
│     └─> ❌ NON-REFUNDABLE (selalu dibayar)             │
│     └─> Masuk ke Protocol Treasury                      │
│     └─> Purpose: Payment untuk oracle service           │
│                                                          │
│  3. Priority Fee: 1 ALTH (optional)                     │
│     └─> ❌ NON-REFUNDABLE (jika digunakan)              │
│     └─> Masuk ke Voter Rewards                          │
│     └─> Purpose: Menambah prioritas query               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  TOTAL UPFRONT COST: 111 ALTH (dengan priority)         │
│  TOTAL UPFRONT COST: 110 ALTH (tanpa priority)         │
│                                                          │
│  REFUNDABLE: 100 ALTH (bond)                            │
│  NET COST: 10-11 ALTH per query                          │
└─────────────────────────────────────────────────────────┘
```

---

### **2. Decreasing Inflation Schedule**

**Annual Inflation Rate:**

| Year | Rate | Annual Target (1B supply) | Notes |
|------|------|---------------------------|-------|
| **1** | 7% | 70,000,000 ALTH | Launch phase |
| **2** | 6% | 60,000,000 ALTH | Growth phase |
| **3** | 5% | 50,000,000 ALTH | Maturation |
| **4** | 3.5% | 35,000,000 ALTH | Stabilization |
| **5** | 2.5% | 25,000,000 ALTH | Mature |
| **6+** | 2% | 20,000,000 ALTH | Long-term |

**Formula:**
```
Current Year = (Current Timestamp - Launch Timestamp) / Seconds Per Year + 1

Annual Rate = get_inflation_rate_for_year(current_year)

Annual Target = Total Supply × (Annual Rate / 10000)

Reward per Query = (Annual Target - Total Distributed) / Queries This Year
```

**Keuntungan:**
- ✅ Supply tetap terkendali (maksimal sesuai annual rate)
- ✅ High initial incentives (7% di tahun pertama)
- ✅ Sustainable long-term (2% setelah tahun 5)
- ✅ Predictable dan transparent

---

### **3. Reward Distribution**

**Total Reward per Query:**

```
Total Reward = Inflation Reward + Priority Fee + Slashed Stakes

Dimana:
- Inflation Reward = calculated from annual rate
- Priority Fee = dari creator (optional)
- Slashed Stakes = 50% dari total slashed (dari incorrect voters)
```

**Distribusi ke Voters (Stake-Weighted):**

```
Untuk setiap correct voter:

1. Proportion = voter_stake / total_stake_dari_semua_correct_voters
2. Base Reward = total_reward × proportion
3. Apply Reputation Multiplier (optional)
4. Apply Protocol Fee (10%)
5. Final Reward = base_reward × (1 - protocol_fee)
```

**Protocol Fee:**
- 10% dari total reward
- Masuk ke Protocol Treasury
- Digunakan untuk protocol maintenance

---

### **4. Protocol Treasury Income**

**Income Sources:**

```
┌─────────────────────────────────────────────────────────┐
│           PROTOCOL TREASURY INCOME SOURCES               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Service Fee (Konsisten)                            │
│     └─> 10 ALTH per query                               │
│     └─> Dari setiap query creation                      │
│     └─> NON-REFUNDABLE                                  │
│                                                          │
│  2. Protocol Fee (Bonus)                                │
│     └─> 10% dari reward                                 │
│     └─> Dari setiap query resolution                    │
│     └─> Tidak konsisten (tergantung volume)             │
│                                                          │
│  3. Slashed Bonds (Bonus)                               │
│     └─> Dari dispute yang menang                        │
│     └─> Tidak konsisten                                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Total Income: Service Fee (konsisten) + Bonus          │
│  Sustainable: ✅ Ya (karena service fee konsisten)      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow Lengkap

### **Flow 1: Query Creation**

```
┌─────────────────────────────────────────────────────────┐
│              QUERY CREATION FLOW                         │
└─────────────────────────────────────────────────────────┘

1. EXTERNAL DAPP (Prediction Market)
   │
   │ Membuat query dengan:
   │ - Bond: 100 ALTH
   │ - Service Fee: 10 ALTH
   │ - Priority Fee: 1 ALTH (optional)
   │
   ▼
2. ORACLE REGISTRY V2
   │
   ├─> Validate:
   │   - Bond >= min_bond (100 ALTH)
   │   - Service Fee >= min_service_fee (10 ALTH)
   │
   ├─> Collect Service Fee:
   │   - protocol_treasury += 10 ALTH
   │   - total_service_fees_collected += 10 ALTH
   │
   ├─> Lock Bond:
   │   - bond_pool += 100 ALTH
   │   - query_bonds[query_id] = BondInfo
   │
   ├─> Update Counters:
   │   - queries_this_year += 1
   │   - total_queries_created += 1
   │
   ├─> Select Voters:
   │   - Power-based selection
   │   - Top N voters (based on stake × reputation)
   │
   └─> Create Query:
       - Store query dengan status: Active
       - Phase: Commit
       - Send VoteRequest ke selected voters
```

---

### **Flow 2: Voting Process**

```
┌─────────────────────────────────────────────────────────┐
│              VOTING PROCESS FLOW                         │
└─────────────────────────────────────────────────────────┘

1. COMMIT PHASE (24 hours)
   │
   ├─> Voters receive VoteRequest
   │
   ├─> Voters research & decide outcome
   │
   ├─> Voters commit vote:
   │   - Generate salt (random)
   │   - Create hash = SHA256(outcome + salt)
   │   - Send VoteCommitment (hash only)
   │
   └─> Registry stores commitments
       - commits[query_id][voter] = commitment_hash
       - Status: CommitPhase

2. REVEAL PHASE (24 hours)
   │
   ├─> Commit deadline passed
   │
   ├─> Voters reveal vote:
   │   - Send VoteReveal (outcome + salt)
   │   - Registry verifies: SHA256(outcome + salt) == commitment_hash
   │
   └─> Registry stores votes
       - votes[query_id][voter] = Vote
       - Status: RevealPhase

3. AGGREGATION
   │
   ├─> Check if enough reveals (2/3 of selected voters)
   │
   ├─> Aggregate votes:
   │   - Strategy: WeightedByStake (default)
   │   - Calculate weighted result
   │   - Check supermajority (66%)
   │
   └─> Resolve query:
       - Status: Resolved
       - Result: winning_outcome
```

---

### **Flow 3: Reward Distribution**

```
┌─────────────────────────────────────────────────────────┐
│          REWARD DISTRIBUTION FLOW                        │
└─────────────────────────────────────────────────────────┘

1. QUERY RESOLVED
   │
   ├─> Identify correct voters (voted for winning outcome)
   │
   ├─> Identify incorrect voters (voted for wrong outcome)
   │
   ├─> Slash incorrect voters:
   │   - Calculate slash amount (5% of stake)
   │   - 50% masuk ke reward pool
   │   - 50% masuk ke protocol treasury
   │
   └─> Calculate inflation reward:
       - Current year = calculate_current_year()
       - Annual rate = get_inflation_rate_for_year(year)
       - Annual target = total_supply × (rate / 10000)
       - Reward = (annual_target - distributed) / queries_this_year

2. MINT REWARDS
   │
   ├─> Total Reward = Inflation + Priority Fee + Slashed
   │
   ├─> Mint tokens ke Registry Escrow:
   │   - alethea_token::Operation::Mint
   │   - to: registry_owner (escrow account)
   │   - amount: total_reward
   │
   └─> Distribute to voters:
       - Calculate stake-weighted rewards
       - Add to pending_rewards[voter]
       - Update total_inflation_distributed

3. VOTER CLAIMS REWARDS
   │
   ├─> Voter calls claim_rewards()
   │
   ├─> Get pending_rewards[voter]
   │
   ├─> Mint tokens (if not already minted):
   │   - Mint ke registry escrow
   │
   ├─> Transfer dari escrow ke voter balance:
   │   - Transfer tokens ke voter
   │   - Update voter balance
   │
   └─> Update stake:
       - voter.stake += pending_rewards
       - Clear pending_rewards[voter]
```

---

### **Flow 4: Bond Refund**

```
┌─────────────────────────────────────────────────────────┐
│              BOND REFUND FLOW                            │
└─────────────────────────────────────────────────────────┘

1. QUERY RESOLVED
   │
   └─> Mark bond ready for refund:
       - bond_info.status = ReadyForRefund
       - Set dispute_window_end

2. DISPUTE WINDOW (1 hour)
   │
   ├─> If NO dispute:
   │   └─> Bond dapat di-refund setelah window
   │
   └─> If ADA dispute:
       └─> Dispute resolution process
           - Winner dapat bond
           - Loser kehilangan bond

3. CLAIM BOND REFUND
   │
   ├─> Check conditions:
   │   - Query resolved ✅
   │   - Dispute window passed ✅
   │   - No active dispute ✅
   │   - Creator is caller ✅
   │
   └─> Refund bond:
       - Transfer bond dari bond_pool ke creator
       - bond_info.status = Refunded
       - bond_refunded = true
```

---

## 🔗 Integrasi External dApps

### **1. Integration Pattern**

**External dApp → Alethea Network:**

```typescript
// 1. Create Query
const result = await aletheaClient.createQueryWithBond({
    description: "Will BTC hit $100k by Dec 31, 2024?",
    outcomes: ["Yes", "No"],
    bondAmount: "100000000000000000000",  // 100 ALTH
    serviceFee: "10000000000000000000",   // 10 ALTH
    priorityFee: "1000000000000000000",   // 1 ALTH (optional)
    callbackChain: "your_dapp_chain_id",
    callbackApp: "your_dapp_app_id",
    callbackData: marketId.toBytes(),
});

// 2. Receive Callback
aletheaClient.onResolution(result.queryId, (resolution) => {
    // resolution.result = "Yes" or "No"
    // resolution.confidence = 96.7
    // Update market status
    // Distribute winnings
});
```

---

### **2. Callback Mechanism**

**Alethea → External dApp:**

```rust
// After query resolution
Message::OracleCallback(
    OracleCallback::QueryResolved {
        query_id: 123,
        result: "No",
        confidence: 96.7,
        callback_data: marketId.toBytes(),
    }
)
```

**External dApp menerima callback:**
- Update market status
- Set final outcome
- Distribute winnings to users

---

## 🔒 Security & Mechanisms

### **1. Commit-Reveal Voting**

**Tujuan:** Mencegah vote manipulation

**Mekanisme:**
1. **Commit Phase**: Voters mengirim hash (outcome + salt)
2. **Reveal Phase**: Voters mengirim outcome + salt
3. **Verification**: Registry verifies hash matches

**Keuntungan:**
- ✅ Votes hidden selama commit phase
- ✅ Tidak bisa mengubah vote setelah commit
- ✅ Verifiable dengan cryptographic proof

---

### **2. Power-Based Voter Selection**

**Formula:**
```
Power = Stake × Reputation Weight

Selection:
- Sort voters by Power (descending)
- Select top N voters (min_votes to max_voters)
- Distribute queries evenly
```

**Keuntungan:**
- ✅ Only qualified voters participate
- ✅ Meritocratic system
- ✅ Prevents low-quality votes

---

### **3. Economic Security**

**Bond Mechanism:**
- Creator harus lock bond (100 ALTH minimum)
- Bond refundable jika tidak ada dispute
- Bond slashed jika ada dispute yang menang

**Service Fee:**
- Creator harus bayar service fee (10 ALTH minimum)
- Non-refundable
- Sustainable income untuk protocol

**Staking:**
- Voters harus stake ALTH (100 ALTH minimum)
- Staked tokens di-escrow di token contract
- Slashing untuk incorrect votes (5% of stake)

---

### **4. Dispute Mechanism**

**Process:**
1. Query resolved → Dispute window opens (1 hour)
2. Anyone can dispute dengan dispute_bond
3. Dispute triggers re-vote dengan voters baru
4. Winner dapat bonds dari loser

**Protection:**
- Economic cost untuk dispute (dispute_bond)
- Re-vote dengan fresh voters
- Winner takes all bonds

---

## 📊 State Management

### **1. Voter State**

```rust
pub struct VoterInfo {
    pub chain_id: ChainId,
    pub stake: Amount,              // Total staked ALTH
    pub reputation: u64,            // Reputation score (0-100)
    pub is_active: bool,            // Active status
    pub registered_at: Timestamp,   // Registration time
    pub total_votes: u64,           // Total votes cast
    pub correct_votes: u64,        // Correct votes
}
```

**Power Calculation:**
```
Power = Stake × Reputation Weight

Reputation Weight = 0.8 + (reputation / 100) × 0.4
```

---

### **2. Query State**

```rust
pub struct Query {
    pub id: u64,
    pub description: String,
    pub outcomes: Vec<String>,
    pub strategy: DecisionStrategy,
    pub status: QueryStatus,        // Active, Resolved, Disputed
    pub phase: VotingPhase,        // Commit, Reveal
    pub result: Option<String>,     // Final result
    pub creator: ChainId,
    pub bond_amount: Amount,
    pub priority_fee: Amount,
    pub bond_refunded: bool,
    pub dispute: Option<Dispute>,
    pub selected_voters: Vec<ChainId>,
    pub commits: BTreeMap<ChainId, [u8; 32]>,
    pub votes: BTreeMap<ChainId, Vote>,
}
```

---

### **3. Protocol Parameters**

```rust
pub struct ProtocolParameters {
    // Voter Requirements
    pub min_stake: Amount,                    // 100 ALTH
    pub min_votes_default: usize,            // 3
    
    // Query Configuration
    pub default_query_duration: u64,         // 300 seconds
    pub max_voters_per_query: usize,         // 100
    
    // Economic Parameters
    pub protocol_fee: u32,                   // 10% (1000 basis points)
    pub slash_percentage: u32,               // 5% (500 basis points)
    
    // Bond & Service Fee
    pub min_bond: Amount,                    // 100 ALTH
    pub min_service_fee: Amount,             // 10 ALTH
    
    // Inflation Control
    pub protocol_launch_timestamp: Option<Timestamp>,
    pub total_supply: Amount,                 // 1B ALTH
    pub expected_queries_per_year: u64,      // 10,000
    pub queries_this_year: u64,
    pub last_reset_year: Option<u64>,
    
    // Token Configuration
    pub token_app_id: Option<ApplicationId>,
    pub token_chain_id: Option<ChainId>,
}
```

---

## 🚀 Deployment Information

### **Current Deployment (Conway Testnet)**

**ALTH Token:**
- **Application ID:** `221862c50e7191f5ee8716558a0588254c1ffc755d35b3ee326be52f7f5fc8b7`
- **Chain ID:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
- **Initial Supply:** 1,000,000,000 ALTH
- **Decimals:** 18

**Oracle Registry V2:**
- **Application ID:** `982521e6b0106493f04cf96e296476a8fa0450cd7e85fd32b8321debf3b0a6cf`
- **Chain ID:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
- **Token Config:** ✅ Set (auto-configured during deployment)

**Network:**
- **RPC URL:** `https://rpc.testnet-conway.linera.net`
- **Network:** Conway Testnet

---

### **Environment Variables**

```bash
# Dashboard (.env.local)
VITE_TOKEN_APP_ID=221862c50e7191f5ee8716558a0588254c1ffc755d35b3ee326be52f7f5fc8b7
VITE_REGISTRY_APP_ID=982521e6b0106493f04cf96e296476a8fa0450cd7e85fd32b8321debf3b0a6cf
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net
VITE_NETWORK=Conway Testnet
```

---

## 📈 Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Voter Registration** | ✅ Working | Min stake: 100 ALTH |
| **Staking** | ✅ Working | Tokens di-escrow di token contract |
| **Unstake** | ✅ Working | Transfer dari escrow ke balance |
| **Query Creation** | ✅ Working | Bond + Service Fee required |
| **Commit-Reveal Voting** | ✅ Working | 24h commit + 24h reveal |
| **Query Resolution** | ✅ Working | Weighted by stake |
| **Reward Minting** | ✅ Working | Rate-based (decreasing) |
| **Claim Rewards** | ✅ Working | Transfer dari escrow |
| **Bond Refund** | ✅ Working | After dispute window |
| **Dispute Mechanism** | ✅ Working | Re-vote dengan fresh voters |
| **Service Fee** | ✅ Working | Collected on creation |
| **Decreasing Inflation** | ✅ Working | Year-based rate |

---

## 🔄 Complete Integration Flow

### **End-to-End: Prediction Market → Alethea → Resolution**

```
┌─────────────────────────────────────────────────────────────────┐
│         COMPLETE INTEGRATION FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: MARKET CREATION (Prediction Market)
─────────────────────────────────────────────
1. User creates market: "Will BTC hit $100k?"
2. Users trade shares (Yes/No)
3. Market deadline: Dec 31, 2024

PHASE 2: RESOLUTION REQUEST (Prediction Market → Alethea)
──────────────────────────────────────────────────────────
4. Prediction Market calls CreateQueryWithBond:
   - Bond: 100 ALTH
   - Service Fee: 10 ALTH
   - Priority Fee: 1 ALTH
   - Callback info

5. Alethea:
   - Validates & collects service fee
   - Locks bond
   - Selects voters (power-based)
   - Creates query (status: Active, phase: Commit)

PHASE 3: VOTING (Alethea Voters)
─────────────────────────────────
6. Voters receive VoteRequest
7. Commit Phase (24h):
   - Voters commit hash(outcome + salt)
8. Reveal Phase (24h):
   - Voters reveal outcome + salt
   - Registry verifies & aggregates

PHASE 4: RESOLUTION (Alethea)
──────────────────────────────
9. Query resolves:
   - Result: "No"
   - Confidence: 96.7%

10. Calculate & mint rewards:
    - Current year: 1 (7% rate)
    - Annual target: 70M ALTH
    - Reward per query: 7,000 ALTH (if 10k queries/year)
    - Mint to registry escrow
    - Distribute to correct voters

PHASE 5: CALLBACK (Alethea → Prediction Market)
────────────────────────────────────────────────
11. Alethea sends callback:
    - QueryResolved { result: "No", confidence: 96.7% }

12. Prediction Market:
    - Updates market status: Resolved
    - Sets final outcome: "No"
    - Distributes winnings to users

PHASE 6: BOND REFUND (Alethea)
────────────────────────────────
13. Dispute window (1 hour):
    - If no dispute → Bond ready for refund
    - If dispute → Dispute resolution

14. Creator claims bond refund:
    - Bond 100 ALTH refunded
    - Service fee 10 ALTH tetap di treasury
```

---

## 🎯 Key Design Decisions

### **1. Why Decreasing Inflation?**

- ✅ **High Initial Incentives**: 7% di tahun pertama untuk bootstrap network
- ✅ **Sustainable Long-term**: 2% setelah tahun 5 untuk sustainability
- ✅ **Supply Control**: Maksimal sesuai annual rate, tidak peduli volume
- ✅ **Industry Standard**: Mirip Solana, Polkadot, dll

---

### **2. Why Bond + Service Fee?**

- ✅ **Bond**: Economic security (spam prevention, dispute mechanism)
- ✅ **Service Fee**: Sustainable payment (konsisten income untuk protocol)
- ✅ **Keduanya**: Mencegah abuse dan memastikan sustainability

---

### **3. Why Escrow Model?**

- ✅ **Real Token Backing**: Staked tokens benar-benar di-escrow
- ✅ **Security**: Tokens tidak bisa di-withdraw tanpa unstake
- ✅ **Transparency**: Escrow balance dapat di-verify
- ✅ **Production Ready**: Sesuai dengan best practices

---

### **4. Why Commit-Reveal?**

- ✅ **Privacy**: Votes hidden selama commit phase
- ✅ **Security**: Tidak bisa mengubah vote setelah commit
- ✅ **Verifiability**: Cryptographic proof untuk setiap vote
- ✅ **Industry Standard**: Digunakan oleh banyak oracle protocols

---

## 📚 API Reference

### **Operations (Direct Calls)**

```rust
// Query Creation
Operation::CreateQueryWithBond {
    description: String,
    outcomes: Vec<String>,
    bond_amount: Amount,      // 100 ALTH minimum
    service_fee: Amount,       // 10 ALTH minimum
    priority_fee: Option<Amount>,
    // ...
}

// Voter Management
Operation::RegisterVoter { stake: Amount }
Operation::UpdateStake { additional_stake: Amount }
Operation::WithdrawStake { amount: Amount }

// Rewards
Operation::ClaimRewards

// Admin
Operation::SetProtocolLaunchTimestamp { timestamp }
Operation::UpdateInflationControl { total_supply, expected_queries_per_year }
Operation::ResetYearlyCounters
```

### **Messages (Cross-Chain)**

```rust
// From External dApp
Message::OracleRequest(OracleRequest::CreateQueryWithBond { ... })

// To External dApp
Message::OracleCallback(OracleCallback::QueryResolved { ... })

// Voting
Message::CommitVote { query_id, commit_hash }
Message::RevealVote { query_id, value, salt }
```

---

## 🔍 Monitoring & Statistics

### **Key Metrics**

```rust
// Protocol Statistics
pub struct Statistics {
    pub total_queries_created: u64,
    pub total_queries_resolved: u64,
    pub active_queries_count: u64,
    pub total_voters: u64,
    pub total_stake: Amount,
    pub protocol_treasury: Amount,
    pub total_service_fees_collected: Amount,
    pub total_inflation_distributed: Amount,
    pub current_year: u64,
    pub current_inflation_rate: u32,  // basis points
    pub queries_this_year: u64,
}
```

---

## 🛠️ Development & Testing

### **Local Development**

```bash
# Start Linera service
linera service &

# Deploy contracts
cd alethea-contract/scripts
./deploy-complete-system.sh

# Start dashboard
cd alethea-dashboard-vite
npm run dev
```

### **Testing Checklist**

- [ ] Voter registration dengan stake
- [ ] Query creation dengan bond + service fee
- [ ] Commit-reveal voting
- [ ] Query resolution
- [ ] Rate-based reward calculation
- [ ] Reward claiming
- [ ] Bond refund
- [ ] Dispute mechanism
- [ ] Yearly reset

---

## 📝 Summary

**Alethea Network** adalah decentralized oracle resolution layer yang:

1. ✅ **Sustainable**: Service fee + decreasing inflation rate
2. ✅ **Secure**: Bond mechanism + commit-reveal voting
3. ✅ **Scalable**: Linera blockchain untuk high performance
4. ✅ **Flexible**: Works dengan berbagai external dApps
5. ✅ **Transparent**: Semua operations dapat di-verify on-chain

**Key Innovations:**
- Decreasing inflation schedule (7% → 2.5% → 2%)
- Service fee model untuk sustainability
- Rate-based reward calculation
- Real token escrow untuk staking
- Power-based voter selection

---

**Dokumen ini menjelaskan arsitektur lengkap Alethea Network dalam kondisi terkini** 🚀

**Last Updated:** 25 Januari 2026  
**Version:** 3.4.0

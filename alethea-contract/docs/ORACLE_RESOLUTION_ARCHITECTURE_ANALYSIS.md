# 🔍 Analisis Arsitektur Oracle Resolution: Alethea Network vs UMA Protocol

**Tanggal:** 25 Januari 2026  
**Tujuan:** Analisis detail alur integrasi Alethea Network sebagai oracle resolution layer dan perbandingan dengan UMA Protocol

---

## 📋 Daftar Isi

1. [Alur Integrasi Alethea Network](#alur-integrasi-alethea-network)
2. [Model Pembayaran: Bond vs Payment](#model-pembayaran-bond-vs-payment)
3. [Perbandingan dengan UMA Protocol](#perbandingan-dengan-uma-protocol)
4. [Rekomendasi Arsitektur](#rekomendasi-arsitektur)

---

## 🔄 Alur Integrasi Alethea Network

### **Skenario: Prediction Market Menggunakan Alethea**

#### **Phase 1: Market Creation (Prediction Market)**

```
┌─────────────────────────────────────┐
│   Prediction Market (Polymarket)    │
│                                      │
│   1. User creates market:           │
│      "Will BTC hit $100k?"          │
│                                      │
│   2. Users trade shares             │
│      - Buy "Yes" shares             │
│      - Buy "No" shares              │
│                                      │
│   3. Market deadline: Dec 31, 2024  │
└─────────────────────────────────────┘
```

**Status:** Market aktif, trading berlangsung

---

#### **Phase 2: Resolution Request (Prediction Market → Alethea)**

**Prediction Market meminta resolusi dari Alethea:**

```typescript
// Prediction Market mengirim request ke Alethea
const result = await aletheaClient.createQueryWithBond({
    description: "Will BTC hit $100k by Dec 31, 2024?",
    outcomes: ["Yes", "No"],
    bondAmount: "100000000000000000000", // 100 ALTH (minimum)
    priorityFee: "1000000000000000000",  // 1 ALTH (optional)
    callbackChain: "prediction_market_chain_id",
    callbackApp: "prediction_market_app_id",
    callbackData: marketId.toBytes(),
    disputeWindowSecs: 3600, // 1 hour
});
```

**Yang Terjadi di Contract:**

```rust
// oracle-registry-v2/src/contract.rs:4377-4427
OracleRequest::CreateQueryWithBond {
    bond_amount: 100 ALTH,  // Minimum required
    priority_fee: 1 ALTH,    // Optional, untuk prioritas
    // ...
}

// Bond di-lock di contract
self.state.lock_bond(
    query_id,
    caller_chain,
    bond_amount,
    priority_fee,
    current_time,
).await;

// Query dibuat dengan status: Active
```

**Status:** 
- ✅ Query dibuat di Alethea
- ✅ Bond 100 ALTH di-lock
- ✅ Callback info disimpan

---

#### **Phase 3: Voter Selection & Voting**

```
┌─────────────────────────────────────┐
│      Alethea Oracle Registry         │
│                                      │
│   1. Select voters berdasarkan:     │
│      - Power = Stake × Reputation    │
│      - Top N voters (e.g., 10)      │
│                                      │
│   2. Send VoteRequest ke voters     │
│                                      │
│   3. Voters commit votes            │
│      (hash = SHA256(outcome + salt))│
│                                      │
│   4. Voters reveal votes            │
│      (setelah commit deadline)       │
│                                      │
│   5. Aggregate votes                │
│      - Weighted by stake            │
│      - Calculate result              │
└─────────────────────────────────────┘
```

**Status:** Query resolved, result = "No"

---

#### **Phase 4: Dispute Window**

```
┌─────────────────────────────────────┐
│      Dispute Window (1 hour)         │
│                                      │
│   Siapa pun bisa dispute jika:      │
│   - Result dianggap salah           │
│   - Harus pasang dispute_bond       │
│     (e.g., 10% dari bond = 10 ALTH)│
│                                      │
│   Jika tidak ada dispute:            │
│   → Bond bisa di-refund              │
│                                      │
│   Jika ada dispute:                  │
│   → Dispute resolution process       │
└─────────────────────────────────────┘
```

**Status:** Dispute window aktif (1 jam setelah resolution)

---

#### **Phase 5: Resolution Callback**

```rust
// oracle-registry-v2/src/contract.rs:5186-5255
// Setelah query resolved, kirim callback ke Prediction Market

self.runtime.send_message(
    callback_chain,
    Message::QueryResolved {
        query_id,
        result: "No",
        confidence: 96.7,
        callback_data: marketId.toBytes(),
    }
);
```

**Prediction Market menerima callback:**

```typescript
// Prediction Market contract
async function handleResolution(queryId, result, confidence) {
    // Update market status
    market.status = "Resolved";
    market.finalOutcome = result; // "No"
    
    // Distribute winnings
    distributeToWinners(result);
}
```

**Status:** Market resolved, winnings didistribusikan

---

#### **Phase 6: Bond Refund (Jika Tidak Ada Dispute)**

```rust
// oracle-registry-v2/src/contract.rs:7118-7190
async fn claim_bond_refund(query_id: u64) {
    // Check:
    // 1. Query resolved ✅
    // 2. Dispute window passed ✅
    // 3. No active dispute ✅
    // 4. Creator is caller ✅
    
    // Refund bond
    self.state.refund_bond(query_id, current_time).await;
    // Bond dikembalikan ke creator (Prediction Market)
}
```

**Status:** Bond 100 ALTH dikembalikan ke Prediction Market

---

## 💰 Model Pembayaran: Bond vs Payment

### **Model Saat Ini di Alethea**

Alethea memiliki **2 model**:

#### **1. Legacy Model (Reward Minting) - Saat Ini**

```rust
// oracle-registry-v2/src/contract.rs:2988-2989
// Transfer reward amount to contract
// Note: In production, implement proper token transfer from creator

// Saat ini: TIDAK ada transfer token dari creator
// Reward di-mint saat query resolve
```

**Karakteristik:**
- ❌ Creator **TIDAK perlu membayar** saat membuat query
- ✅ Reward di-**mint** saat query resolve (inflation)
- ✅ Total supply ALTH bertambah
- ⚠️ Tidak sustainable untuk production

**Flow:**
```
1. Creator membuat query → TIDAK ada payment
2. Query resolve → Mint reward tokens
3. Reward didistribusikan ke voters
```

---

#### **2. Hybrid Model (Bond-Based) - Recommended**

```rust
// oracle-registry-v2/src/contract.rs:4377-4427
OracleRequest::CreateQueryWithBond {
    bond_amount: 100 ALTH,  // Minimum required
    priority_fee: 1 ALTH,    // Optional
    // ...
}

// Bond di-lock
self.state.lock_bond(query_id, caller_chain, bond_amount, ...).await;
```

**Karakteristik:**
- ✅ Creator **harus pasang bond** (minimum 100 ALTH)
- ✅ Bond di-**lock** di contract
- ✅ Bond bisa di-**refund** setelah dispute window (jika tidak ada dispute)
- ✅ Jika ada dispute yang menang → bond di-slash
- ✅ Reward tetap di-mint (inflation), bukan dari bond

**Flow:**
```
1. Creator membuat query → Lock bond 100 ALTH
2. Query resolve → Mint reward tokens (inflation)
3. Dispute window (1 hour)
4. Jika tidak ada dispute → Refund bond
5. Jika ada dispute → Dispute resolution
```

---

### **Perbandingan: Bond vs Payment**

| Aspek | Bond Model | Payment Model |
|-------|-----------|---------------|
| **Upfront Cost** | Lock bond (refundable) | Pay fee (non-refundable) |
| **Risk** | Low (bisa di-refund) | High (tidak bisa di-refund) |
| **Purpose** | Economic security (dispute) | Service payment |
| **Sustainability** | ✅ Sustainable | ✅ Sustainable |
| **Incentive** | Dispute prevention | Service usage |

**Kesimpulan:**
- **Bond** untuk **economic security** (mencegah spam, dispute mechanism)
- **Payment** untuk **service fee** (membayar oracle service)

**Rekomendasi: Hybrid Model**
- Bond untuk security (refundable)
- Payment untuk service fee (non-refundable)
- Reward tetap dari inflation (protocol-level)

---

## 🔄 Perbandingan dengan UMA Protocol

### **UMA Protocol Architecture**

#### **1. Optimistic Oracle Model**

```
┌─────────────────────────────────────┐
│         UMA Optimistic Oracle         │
│                                      │
│   1. Proposer posts data            │
│      + Bond (economic guarantee)     │
│                                      │
│   2. Data assumed correct            │
│      (optimistic assumption)         │
│                                      │
│   3. Dispute window (e.g., 2 hours) │
│      - Anyone can dispute            │
│      - Must post dispute bond        │
│                                      │
│   4. If disputed:                    │
│      → DVM (Data Verification Mech)  │
│      → Vote by UMA token holders     │
│                                      │
│   5. Winner gets bonds               │
└─────────────────────────────────────┘
```

**Karakteristik UMA:**
- ✅ **Optimistic**: Data assumed correct unless disputed
- ✅ **Open Dispute**: Siapa pun bisa dispute
- ✅ **DVM Resolution**: Dispute diselesaikan oleh token holders
- ✅ **Bond-Based**: Economic security melalui bonds
- ✅ **Fast**: No voting unless disputed

---

### **Alethea Network Architecture**

#### **1. Commit-Reveal Voting Model**

```
┌─────────────────────────────────────┐
│      Alethea Oracle Network          │
│                                      │
│   1. Query created                  │
│      + Bond (optional, untuk dispute)│
│                                      │
│   2. Voters selected                 │
│      (Power-based selection)          │
│                                      │
│   3. Commit Phase (24h)            │
│      - Voters commit hash            │
│      - Votes hidden                  │
│                                      │
│   4. Reveal Phase (24h)              │
│      - Voters reveal votes           │
│      - Votes aggregated              │
│                                      │
│   5. Result calculated               │
│      (Weighted by stake)             │
│                                      │
│   6. Dispute window (1h)             │
│      - Anyone can dispute            │
│      - Must post dispute bond        │
│                                      │
│   7. If disputed:                   │
│      → Re-vote dengan voters baru    │
│      → Winner gets bonds             │
└─────────────────────────────────────┘
```

**Karakteristik Alethea:**
- ✅ **Always Vote**: Selalu ada voting process
- ✅ **Selected Voters**: Power-based selection
- ✅ **Privacy**: Commit-reveal scheme
- ✅ **Bond-Based**: Economic security (optional)
- ⚠️ **Slower**: Butuh waktu untuk commit-reveal (48h total)

---

### **Tabel Perbandingan Detail**

| Aspek | UMA Protocol | Alethea Network |
|-------|--------------|-----------------|
| **Blockchain** | Ethereum | Linera |
| **Model** | Optimistic Oracle | Commit-Reveal Voting |
| **Voting** | Only if disputed | Always vote |
| **Voter Selection** | Open (anyone can dispute) | Power-based (selected) |
| **Privacy** | Public | Commit-reveal (private) |
| **Speed** | Fast (if not disputed) | Slower (always vote) |
| **Cost** | High (Ethereum gas) | Low (Linera fees) |
| **Scalability** | Limited (Ethereum) | High (Linera mikrochains) |
| **Bond Purpose** | Economic guarantee | Dispute security |
| **Dispute Resolution** | DVM (token holders) | Re-vote (selected voters) |
| **Use Case** | Price feeds, simple data | Complex queries, prediction markets |

---

### **Kapan Menggunakan UMA vs Alethea?**

#### **UMA Protocol Cocok Untuk:**
- ✅ **Price Feeds**: Data yang jelas dan mudah diverifikasi
- ✅ **Simple Queries**: Yes/No questions dengan sumber jelas
- ✅ **High Frequency**: Banyak queries per hari
- ✅ **Low Dispute Risk**: Data yang jarang di-dispute

**Contoh:**
- "What is the ETH/USD price?"
- "Did Team A win the match?" (dengan sumber resmi)

---

#### **Alethea Network Cocok Untuk:**
- ✅ **Complex Queries**: Pertanyaan yang memerlukan interpretasi
- ✅ **Prediction Markets**: Market resolution yang kompleks
- ✅ **Subjective Data**: Data yang memerlukan voting
- ✅ **High Value Queries**: Queries dengan nilai tinggi

**Contoh:**
- "Will BTC hit $100k by end of 2024?"
- "Did the company meet its Q4 revenue target?"
- "Is this insurance claim valid?"

---

## 🏗️ Rekomendasi Arsitektur

### **Model Ideal untuk Production**

#### **Hybrid Model: Bond + Service Fee**

```rust
// Ideal architecture
struct QueryCreation {
    bond_amount: Amount,        // Security (refundable)
    service_fee: Amount,         // Payment (non-refundable)
    reward_amount: Amount,       // Voter rewards (from inflation)
    priority_fee: Amount,        // Optional priority
}

// Flow:
// 1. Creator locks bond + pays service fee
// 2. Query processed by voters
// 3. Reward minted (inflation) → distributed to voters
// 4. Service fee → protocol treasury
// 5. Bond → refunded (if no dispute) or slashed (if dispute)
```

**Keuntungan:**
- ✅ **Economic Security**: Bond mencegah spam
- ✅ **Sustainable**: Service fee untuk protocol
- ✅ **Fair**: Reward dari inflation, bukan dari creator
- ✅ **Dispute Protection**: Bond mechanism untuk dispute

---

### **Alur Lengkap untuk Prediction Market**

```
┌─────────────────────────────────────────────────────────────┐
│              PREDICTION MARKET INTEGRATION                   │
└─────────────────────────────────────────────────────────────┘

1. MARKET CREATION
   └─> User creates market on Prediction Market
   └─> Users trade shares

2. RESOLUTION REQUEST
   └─> Prediction Market calls Alethea:
       - Lock bond: 100 ALTH (security)
       - Pay service fee: 10 ALTH (payment)
       - Set callback info
   
3. VOTING PROCESS
   └─> Alethea selects voters (power-based)
   └─> Commit phase (24h)
   └─> Reveal phase (24h)
   └─> Aggregate votes
   └─> Calculate result

4. RESOLUTION CALLBACK
   └─> Alethea sends result to Prediction Market
   └─> Prediction Market distributes winnings

5. REWARD DISTRIBUTION
   └─> Alethea mints rewards (inflation)
   └─> Rewards distributed to correct voters

6. BOND REFUND
   └─> Dispute window (1 hour)
   └─> If no dispute: Bond refunded
   └─> If dispute: Dispute resolution

7. SERVICE FEE
   └─> Service fee → Protocol treasury
   └─> Used for protocol maintenance
```

---

### **Cost Structure untuk Prediction Market**

**Per Query:**
- **Bond**: 100 ALTH (refundable, jika tidak ada dispute)
- **Service Fee**: 10 ALTH (non-refundable)
- **Priority Fee**: 1 ALTH (optional, untuk prioritas)

**Total Upfront Cost**: 111 ALTH (110 ALTH jika tidak pakai priority)
**Refundable**: 100 ALTH (jika tidak ada dispute)
**Net Cost**: 10-11 ALTH per query

**Incentive:**
- Bond mencegah spam queries
- Service fee sustainable untuk protocol
- Reward dari inflation (tidak membebani creator)

---

## 📊 Kesimpulan

### **Jawaban untuk Pertanyaan:**

#### **1. Apakah Prediction Market harus membayar?**

**Jawaban: Ya, tetapi dengan model hybrid:**
- ✅ **Bond** (refundable): Untuk security
- ✅ **Service Fee** (non-refundable): Untuk payment
- ✅ **Reward** (inflation): Dari protocol, bukan dari creator

#### **2. Apakah hanya perlu pasang bond?**

**Jawaban: Tidak cukup hanya bond:**
- Bond untuk **security** (mencegah spam, dispute mechanism)
- Service fee untuk **payment** (membayar oracle service)
- Keduanya diperlukan untuk model yang sustainable

#### **3. Perbandingan dengan UMA:**

| Aspek | UMA | Alethea |
|-------|-----|---------|
| **Model** | Optimistic | Commit-Reveal |
| **Speed** | Fast (if not disputed) | Slower (always vote) |
| **Cost** | High (Ethereum) | Low (Linera) |
| **Use Case** | Simple data | Complex queries |
| **Bond** | Economic guarantee | Dispute security |

**Kesimpulan:**
- **UMA** cocok untuk **simple, high-frequency queries**
- **Alethea** cocok untuk **complex, high-value queries**
- Keduanya menggunakan **bond mechanism** untuk security
- **Alethea** lebih cocok untuk **prediction markets** karena commit-reveal voting

---

## 🚀 Next Steps

1. **Implement Service Fee Model**
   - Tambahkan service fee ke `CreateQueryWithBond`
   - Service fee → protocol treasury
   - Update documentation

2. **Optimize Bond Mechanism**
   - Dynamic bond amount berdasarkan query complexity
   - Dispute bond calculation
   - Bond refund automation

3. **Improve Dispute Resolution**
   - Re-vote mechanism
   - Dispute bond distribution
   - Dispute window optimization

4. **SDK for Prediction Markets**
   - Easy integration
   - Callback handling
   - Error handling

---

**Dokumen ini akan terus di-update seiring perkembangan Alethea Network** 🚀

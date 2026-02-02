# 💰 Perhitungan Inflation Reward: Formula & Distribusi

**Tanggal:** 25 Januari 2026  
**Tujuan:** Penjelasan detail tentang bagaimana inflation reward dihitung dan didistribusikan ke voters

---

## 📊 Parameter Inflation Reward

### **Parameter Default:**

```rust
// oracle-registry-v2/src/state.rs

inflation_rate_bps: 500              // 5% annual inflation rate
inflation_reward_per_query: 50 ALTH // Fixed reward per query (default)
inflation_reward_share: 7000        // 70% dari inflation untuk voter rewards
```

**Catatan Penting:**
- `inflation_reward_per_query` adalah **fixed amount per query** (default: 50 ALTH)
- Tidak dihitung dari `inflation_rate_bps` secara langsung
- Admin bisa update `inflation_reward_per_query` sesuai kebutuhan

---

## 🔢 Formula Perhitungan

### **1. Total Reward per Query**

```
Total Reward = Inflation Reward + Priority Fee + Slashed Stakes

Dimana:
- Inflation Reward = inflation_reward_per_query (default: 50 ALTH)
- Priority Fee = dari creator (optional, default: 0)
- Slashed Stakes = 50% dari total slashed (dari incorrect voters)
```

**Contoh:**
```
Inflation Reward: 50 ALTH
Priority Fee: 1 ALTH
Slashed Stakes: 10 ALTH (dari 2 incorrect voters, masing-masing 5 ALTH slashed)
─────────────────────────────────────────────
Total Reward: 61 ALTH
```

---

### **2. Distribusi ke Voters (Stake-Weighted)**

**Formula:**

```
Untuk setiap correct voter:

1. Hitung Total Stake dari semua correct voters:
   Total Stake = Σ(stake_voter_i) untuk semua correct voters

2. Hitung Proportion untuk setiap voter:
   Proportion = voter_stake / total_stake

3. Hitung Base Reward:
   Base Reward = total_reward × proportion

4. Apply Reputation Multiplier (jika ada):
   Reward with Reputation = base_reward × reputation_multiplier

5. Apply Protocol Fee:
   Final Reward = reward_with_reputation × (1 - protocol_fee_percentage)
```

**Detail Formula:**

```rust
// oracle-registry-v2/src/state.rs:1182-1227

// Step 1: Calculate total stake
total_stake = Σ(voter.stake) untuk semua correct voters

// Step 2: Calculate proportion
proportion = voter.stake / total_stake

// Step 3: Calculate base reward
base_reward = total_reward × proportion

// Step 4: Apply reputation multiplier (optional)
reputation_multiplier = calculate_reputation_weight(voter.reputation)
reward_with_reputation = base_reward × reputation_multiplier

// Step 5: Apply protocol fee (default: 10%)
protocol_fee_percentage = 10% = 0.10
final_reward = reward_with_reputation × (1 - 0.10)
```

---

## 📋 Contoh Perhitungan Lengkap

### **Skenario:**

**Query:** "Will BTC hit $100k by Dec 31, 2024?"  
**Result:** "No"  
**Inflation Reward:** 50 ALTH  
**Priority Fee:** 1 ALTH  
**Slashed Stakes:** 10 ALTH (dari 2 incorrect voters)

**Correct Voters:**
- Voter A: Stake = 200 ALTH, Reputation = 80
- Voter B: Stake = 300 ALTH, Reputation = 90
- Voter C: Stake = 500 ALTH, Reputation = 85

**Incorrect Voters:**
- Voter D: Stake = 100 ALTH → Slashed 5 ALTH
- Voter E: Stake = 100 ALTH → Slashed 5 ALTH

---

### **Step 1: Hitung Total Reward**

```
Total Reward = Inflation Reward + Priority Fee + Slashed Stakes
             = 50 ALTH + 1 ALTH + 10 ALTH
             = 61 ALTH
```

---

### **Step 2: Hitung Total Stake dari Correct Voters**

```
Total Stake = Stake_A + Stake_B + Stake_C
            = 200 ALTH + 300 ALTH + 500 ALTH
            = 1000 ALTH
```

---

### **Step 3: Hitung Proportion untuk Setiap Voter**

```
Proportion_A = 200 / 1000 = 0.20 (20%)
Proportion_B = 300 / 1000 = 0.30 (30%)
Proportion_C = 500 / 1000 = 0.50 (50%)
```

---

### **Step 4: Hitung Base Reward**

```
Base Reward_A = 61 ALTH × 0.20 = 12.2 ALTH
Base Reward_B = 61 ALTH × 0.30 = 18.3 ALTH
Base Reward_C = 61 ALTH × 0.50 = 30.5 ALTH
```

---

### **Step 5: Apply Reputation Multiplier (Optional)**

**Reputation Multiplier Formula:**
```
reputation_multiplier = 0.8 + (reputation / 100) × 0.4
```

**Perhitungan:**
```
Multiplier_A = 0.8 + (80 / 100) × 0.4 = 0.8 + 0.32 = 1.12
Multiplier_B = 0.8 + (90 / 100) × 0.4 = 0.8 + 0.36 = 1.16
Multiplier_C = 0.8 + (85 / 100) × 0.4 = 0.8 + 0.34 = 1.14
```

**Reward dengan Reputation:**
```
Reward_A = 12.2 ALTH × 1.12 = 13.664 ALTH
Reward_B = 18.3 ALTH × 1.16 = 21.228 ALTH
Reward_C = 30.5 ALTH × 1.14 = 34.77 ALTH
```

---

### **Step 6: Apply Protocol Fee (10%)**

```
Protocol Fee = 10%
Fee Multiplier = 1 - 0.10 = 0.90

Final Reward_A = 13.664 ALTH × 0.90 = 12.2976 ALTH ≈ 12.30 ALTH
Final Reward_B = 21.228 ALTH × 0.90 = 19.1052 ALTH ≈ 19.11 ALTH
Final Reward_C = 34.77 ALTH × 0.90 = 31.293 ALTH ≈ 31.29 ALTH
```

**Total Distributed:** 12.30 + 19.11 + 31.29 = 62.70 ALTH

**Protocol Fee Collected:** 61 ALTH × 0.10 = 6.1 ALTH

---

## 🔄 Alur Minting & Distribusi

### **Phase 1: Query Resolution**

```
Query di-resolve → Result = "No"
    │
    ├─> Identify correct voters (A, B, C)
    ├─> Identify incorrect voters (D, E)
    │
    ├─> Slash incorrect voters
    │   └─> Voter D: Slash 5 ALTH
    │   └─> Voter E: Slash 5 ALTH
    │   └─> Total Slashed: 10 ALTH
    │   └─> 50% masuk ke reward pool = 5 ALTH
    │
    └─> Calculate rewards
        └─> Total Reward = 50 + 1 + 5 = 56 ALTH
```

---

### **Phase 2: Mint Tokens**

```rust
// oracle-registry-v2/src/contract.rs:5186-5219

// Mint reward tokens untuk setiap voter
for (voter, reward) in reward_distribution {
    mint_op = alethea_token::Operation::Mint {
        to: registry_owner,  // Registry escrow account
        amount: reward,
    };
    
    // Call token contract to mint
    runtime.call_application(token_app_id, &mint_op);
}
```

**Yang Terjadi:**
- Token di-mint ke **Registry Escrow Account**
- Bukan langsung ke voter balance
- Voter harus **claim** untuk mendapatkan reward

---

### **Phase 3: Add to Pending Rewards**

```rust
// oracle-registry-v2/src/contract.rs:5231-5239

// Add reward ke pending rewards untuk setiap voter
for (voter, reward) in reward_distribution {
    current_pending = get_pending_rewards(voter);
    new_pending = current_pending + reward;
    pending_rewards.insert(voter, new_pending);
}
```

**Status:**
- Reward masuk ke `pending_rewards` untuk setiap voter
- Voter bisa claim kapan saja
- Reward di-mint tapi belum masuk ke balance voter

---

### **Phase 4: Voter Claims Rewards**

```rust
// oracle-registry-v2/src/contract.rs:5655-5685

// Saat voter claim rewards
pending_rewards = get_pending_rewards(voter_chain);

// Mint tokens ke registry escrow
mint_op = alethea_token::Operation::Mint {
    to: registry_owner,
    amount: pending_rewards,
};

// Transfer dari escrow ke voter balance
// (Ini yang perlu di-implementasikan - saat ini hanya update stake)
voter_info.stake = voter_info.stake + pending_rewards;
```

**Catatan:**
- Saat ini reward di-mint tapi **belum ditransfer** ke voter balance
- Hanya update `stake` di registry state
- Perlu implementasi transfer dari escrow ke voter balance

---

## 📊 Tabel Ringkasan Perhitungan

| Voter | Stake | Proportion | Base Reward | Reputation Mult | With Rep | Protocol Fee (10%) | Final Reward |
|-------|-------|------------|-------------|----------------|----------|-------------------|--------------|
| A | 200 ALTH | 20% | 12.2 ALTH | 1.12 | 13.664 ALTH | 1.3664 ALTH | **12.30 ALTH** |
| B | 300 ALTH | 30% | 18.3 ALTH | 1.16 | 21.228 ALTH | 2.1228 ALTH | **19.11 ALTH** |
| C | 500 ALTH | 50% | 30.5 ALTH | 1.14 | 34.77 ALTH | 3.477 ALTH | **31.29 ALTH** |
| **Total** | **1000 ALTH** | **100%** | **61 ALTH** | - | **69.662 ALTH** | **6.9662 ALTH** | **62.70 ALTH** |

**Protocol Fee:** 6.1 ALTH → Protocol Treasury

---

## 🎯 Strategi Distribusi

### **1. WeightedByStake (Default)**

```rust
// Formula: reward = total_reward × (voter_stake / total_stake)
// Voters dengan stake lebih besar dapat reward lebih besar
```

**Contoh:**
- Voter dengan 50% stake → dapat 50% reward
- Voter dengan 10% stake → dapat 10% reward

---

### **2. WeightedByReputation**

```rust
// Formula: reward = total_reward × (reputation_weight / total_reputation_weight)
// Voters dengan reputation lebih tinggi dapat reward lebih besar
```

**Contoh:**
- Voter dengan reputation 90 → dapat reward lebih besar
- Voter dengan reputation 60 → dapat reward lebih kecil

---

### **3. Equal Distribution**

```rust
// Formula: reward = total_reward / number_of_correct_voters
// Semua voters dapat reward sama
```

**Contoh:**
- 3 correct voters, total reward 60 ALTH
- Setiap voter dapat 20 ALTH

---

## 💡 Parameter yang Bisa Dikonfigurasi

### **Admin Operations:**

```rust
// Update inflation reward per query
Operation::UpdateHybridParameters {
    inflation_reward_per_query: Some(Amount::from_tokens(100)), // Update ke 100 ALTH
    // ...
}

// Mint inflation ke pool (manual)
Operation::MintInflation {
    amount: Amount::from_tokens(10000), // Mint 10,000 ALTH ke pool
}
```

---

## 🔍 Perhitungan Annual Inflation Rate

**Catatan:** Saat ini `inflation_rate_bps` (5% annual) **tidak digunakan** untuk perhitungan langsung.  
Reward per query adalah **fixed amount** yang bisa di-update oleh admin.

**Jika ingin menghitung dari annual rate:**

```
Annual Inflation Rate = 5% = 0.05
Total Supply = 1,000,000,000 ALTH (1 billion)

Annual Inflation = 1,000,000,000 × 0.05 = 50,000,000 ALTH

Jika ada 1000 queries per tahun:
Inflation per Query = 50,000,000 / 1000 = 50,000 ALTH per query

Jika ada 10,000 queries per tahun:
Inflation per Query = 50,000,000 / 10,000 = 5,000 ALTH per query
```

**Rekomendasi:**
- Set `inflation_reward_per_query` berdasarkan expected query volume
- Update secara berkala berdasarkan actual volume
- Monitor total inflation distributed vs annual target

---

## ✅ Kesimpulan

### **Formula Utama:**

```
1. Total Reward = Inflation Reward + Priority Fee + Slashed Stakes

2. Voter Reward = Total Reward × (Voter Stake / Total Stake) × Reputation Multiplier × (1 - Protocol Fee)

3. Protocol Fee = Total Reward × Protocol Fee Percentage (default: 10%)
```

### **Default Values:**

- **Inflation Reward per Query:** 50 ALTH
- **Protocol Fee:** 10%
- **Reputation Multiplier:** 0.8 + (reputation / 100) × 0.4

### **Alur:**

1. Query resolve → Calculate rewards
2. Mint tokens ke Registry Escrow
3. Add ke Pending Rewards
4. Voter claim → Transfer ke voter balance (perlu implementasi)

---

**Dokumen ini menjelaskan perhitungan inflation reward yang digunakan di Alethea Network** 🚀

# 📊 Analisis: Apakah Inflation Reward Selalu Flat?

**Tanggal:** 25 Januari 2026  
**Pertanyaan:** Apakah inflation reward per query selalu flat 50 ALTH untuk setiap query?

---

## ✅ Jawaban Singkat

**YA, saat ini inflation reward selalu FLAT 50 ALTH untuk semua query.**

**Alasan:**
- `inflation_reward_per_query` adalah **parameter global** di `ProtocolParameters`
- Semua query menggunakan nilai yang sama dari parameter ini
- Tidak ada mekanisme untuk set reward berbeda per query

---

## 🔍 Bukti dari Codebase

### **1. Parameter Global**

```rust
// oracle-registry-v2/src/state.rs:597

pub struct ProtocolParameters {
    // ...
    /// Inflation reward per query resolution (calculated from annual rate)
    pub inflation_reward_per_query: Amount,  // Global parameter
    // ...
}

// Default value
impl Default for ProtocolParameters {
    fn default() -> Self {
        Self {
            // ...
            inflation_reward_per_query: Amount::from_tokens(50), // 50 ALTH per query
            // ...
        }
    }
}
```

---

### **2. Penggunaan di Query Resolution**

```rust
// oracle-registry-v2/src/contract.rs:5342-5346

// ==================== HYBRID MODEL: Inflation Rewards ====================
if correct_voters > 0 {
    let params = self.state.get_parameters().await;
    let inflation_reward = params.inflation_reward_per_query;  // ← Ambil dari parameter global
    let inflation_value: u128 = inflation_reward.into();
    
    // ... distribute reward ...
}
```

**Kesimpulan:** Semua query menggunakan `params.inflation_reward_per_query` yang sama.

---

### **3. Tidak Ada Parameter per Query**

Saat membuat query, tidak ada parameter untuk set reward berbeda:

```rust
// oracle-registry-v2/src/lib.rs:639-678

CreateQueryWithBond {
    description: String,
    outcomes: Vec<String>,
    strategy: DecisionStrategy,
    min_votes: Option<usize>,
    bond_amount: Amount,
    priority_fee: Option<Amount>,  // ← Hanya priority fee yang bisa berbeda
    // ...
    // ❌ TIDAK ADA: inflation_reward_per_query parameter
}
```

**Kesimpulan:** Tidak ada cara untuk set reward berbeda per query saat creation.

---

## 📊 Perbandingan: Flat vs Dynamic

### **Model Saat Ini: FLAT**

```
┌─────────────────────────────────────────┐
│         FLAT REWARD MODEL                │
├─────────────────────────────────────────┤
│                                         │
│  Query 1: Inflation Reward = 50 ALTH   │
│  Query 2: Inflation Reward = 50 ALTH    │
│  Query 3: Inflation Reward = 50 ALTH    │
│  Query 4: Inflation Reward = 50 ALTH    │
│  ...                                    │
│  Query N: Inflation Reward = 50 ALTH   │
│                                         │
│  Semua query menggunakan nilai yang sama│
│  dari parameter global                  │
└─────────────────────────────────────────┘
```

**Keuntungan:**
- ✅ Simple dan predictable
- ✅ Mudah di-manage
- ✅ Fair untuk semua query

**Kekurangan:**
- ❌ Tidak fleksibel
- ❌ Tidak bisa adjust berdasarkan complexity query
- ❌ Tidak bisa adjust berdasarkan value query

---

### **Model Alternatif: DYNAMIC**

```
┌─────────────────────────────────────────┐
│         DYNAMIC REWARD MODEL             │
├─────────────────────────────────────────┤
│                                         │
│  Query 1 (Simple): Inflation = 25 ALTH  │
│  Query 2 (Complex): Inflation = 100 ALTH │
│  Query 3 (High Value): Inflation = 200 ALTH│
│  Query 4 (Standard): Inflation = 50 ALTH│
│  ...                                    │
│                                         │
│  Reward bisa berbeda berdasarkan:       │
│  - Query complexity                    │
│  - Query value                         │
│  - Query type                          │
└─────────────────────────────────────────┘
```

**Keuntungan:**
- ✅ Fleksibel
- ✅ Bisa adjust berdasarkan kebutuhan
- ✅ Bisa incentivize query yang lebih kompleks

**Kekurangan:**
- ⚠️ Lebih kompleks
- ⚠️ Perlu mekanisme untuk determine reward amount
- ⚠️ Bisa jadi tidak fair jika tidak di-manage dengan baik

---

## 🔧 Cara Update Reward (Saat Ini)

### **Admin Update Parameter Global**

```rust
// oracle-registry-v2/src/contract.rs:7428-7472

Operation::UpdateHybridParameters {
    inflation_reward_per_query: Some(Amount::from_tokens(100)), // Update ke 100 ALTH
    // ...
}
```

**Impact:**
- ✅ Update parameter global
- ✅ Semua query SETELAH update akan menggunakan nilai baru
- ❌ Query yang sudah dibuat tidak terpengaruh
- ❌ Semua query menggunakan nilai yang sama

---

## 💡 Rekomendasi: Apakah Perlu Dynamic?

### **Skenario 1: Tetap Flat (Saat Ini)**

**Cocok untuk:**
- ✅ Simple queries dengan complexity sama
- ✅ Standardized oracle service
- ✅ Predictable costs

**Contoh:**
- Semua prediction market queries: 50 ALTH
- Semua price feed queries: 50 ALTH
- Semua simple yes/no queries: 50 ALTH

---

### **Skenario 2: Dynamic per Query Type**

**Cocok untuk:**
- ✅ Queries dengan complexity berbeda
- ✅ High-value queries memerlukan lebih banyak reward
- ✅ Different query categories

**Contoh:**
- Simple queries: 25 ALTH
- Standard queries: 50 ALTH
- Complex queries: 100 ALTH
- High-value queries: 200 ALTH

**Implementasi:**
```rust
CreateQueryWithBond {
    // ...
    query_type: QueryType,  // NEW: Simple, Standard, Complex, HighValue
    // ...
}

// Atau

CreateQueryWithBond {
    // ...
    inflation_reward_multiplier: Option<f64>,  // NEW: 0.5x, 1x, 2x, 4x
    // ...
}
```

---

### **Skenario 3: Dynamic per Query Value**

**Cocok untuk:**
- ✅ Queries dengan economic value berbeda
- ✅ Reward proportional dengan value query

**Contoh:**
- Query dengan bond 100 ALTH → Reward 50 ALTH (0.5x)
- Query dengan bond 500 ALTH → Reward 250 ALTH (0.5x)
- Query dengan bond 1000 ALTH → Reward 500 ALTH (0.5x)

**Implementasi:**
```rust
// Calculate reward based on bond amount
inflation_reward = bond_amount × reward_ratio  // e.g., 0.5x
```

---

## 📋 Tabel Perbandingan

| Aspek | Flat (Saat Ini) | Dynamic per Type | Dynamic per Value |
|-------|----------------|------------------|-------------------|
| **Complexity** | ✅ Simple | ⚠️ Medium | ⚠️ Medium |
| **Flexibility** | ❌ Low | ✅ High | ✅ High |
| **Fairness** | ✅ Fair | ⚠️ Depends | ⚠️ Depends |
| **Predictability** | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **Implementation** | ✅ Done | ❌ Need | ❌ Need |

---

## ✅ Kesimpulan

### **Jawaban untuk Pertanyaan:**

**"Apakah inflation reward tiap query tersebut flat selalu 50 ALTH setiap query?"**

**Jawaban: YA, BENAR!**

**Detail:**
- ✅ Saat ini selalu flat 50 ALTH untuk semua query
- ✅ Nilai diambil dari parameter global `inflation_reward_per_query`
- ✅ Admin bisa update parameter global (mempengaruhi semua query baru)
- ❌ Tidak ada mekanisme untuk set reward berbeda per query

**Apakah Ini Ideal?**

**Untuk Production:**
- ⚠️ **Flat model** cocok untuk standardized service
- ⚠️ **Dynamic model** lebih fleksibel tapi lebih kompleks
- 💡 **Rekomendasi:** Mulai dengan flat, tambahkan dynamic jika diperlukan

---

## 🚀 Next Steps (Jika Ingin Dynamic)

### **Option 1: Query Type Based**

```rust
pub enum QueryType {
    Simple,      // 25 ALTH
    Standard,    // 50 ALTH (default)
    Complex,     // 100 ALTH
    HighValue,   // 200 ALTH
}

CreateQueryWithBond {
    // ...
    query_type: QueryType,  // NEW
    // ...
}
```

### **Option 2: Multiplier Based**

```rust
CreateQueryWithBond {
    // ...
    inflation_reward_multiplier: Option<f64>,  // NEW: 0.5x, 1x, 2x, 4x
    // ...
}

// Calculate:
inflation_reward = base_reward × multiplier
```

### **Option 3: Bond Based**

```rust
// Calculate reward based on bond amount
inflation_reward = bond_amount × reward_ratio  // e.g., 0.5x
```

---

**Dokumen ini menjelaskan bahwa saat ini reward selalu flat, dan memberikan rekomendasi untuk implementasi dynamic jika diperlukan** 🚀

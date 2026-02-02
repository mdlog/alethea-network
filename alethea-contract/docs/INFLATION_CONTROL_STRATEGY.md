# 💰 Strategi Kontrol Inflation: Mengendalikan Supply Token

**Tanggal:** 25 Januari 2026  
**Masalah:** Flat reward per query (50 ALTH) bisa membebani protokol jika banyak query dibuat  
**Tujuan:** Mencari cara yang lebih baik untuk mengontrol inflation sehingga supply tetap terkendali

---

## 🔴 Masalah Saat Ini

### **Model Flat Reward (Current)**

```
┌─────────────────────────────────────────────────────────┐
│              MASALAH DENGAN FLAT REWARD                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Scenario: 10,000 queries per tahun                    │
│                                                          │
│  Total Inflation = 10,000 × 50 ALTH = 500,000 ALTH      │
│                                                          │
│  Jika Total Supply = 1,000,000,000 ALTH (1 billion)    │
│  Annual Inflation Rate = 500,000 / 1,000,000,000        │
│                        = 0.05% (sangat rendah)          │
│                                                          │
│  TAPI jika 100,000 queries per tahun:                   │
│  Total Inflation = 100,000 × 50 ALTH = 5,000,000 ALTH   │
│  Annual Inflation Rate = 0.5%                           │
│                                                          │
│  Jika 1,000,000 queries per tahun:                      │
│  Total Inflation = 1,000,000 × 50 ALTH = 50,000,000 ALTH│
│  Annual Inflation Rate = 5%                              │
│                                                          │
│  ⚠️  MASALAH: Tidak ada batas maksimal!                  │
│  ⚠️  Supply bisa tidak terkendali jika query volume tinggi│
└─────────────────────────────────────────────────────────┘
```

**Masalah:**
- ❌ Tidak ada batas maksimal inflation per tahun
- ❌ Tidak terkait dengan annual inflation rate target
- ❌ Bisa membebani protokol jika query volume tinggi
- ❌ Tidak sustainable untuk jangka panjang

---

## ✅ Solusi: Rate-Based Inflation Control

### **Model 1: Annual Rate-Based (Recommended)**

**Konsep:**
- Set target annual inflation rate (e.g., 5%)
- Hitung reward per query berdasarkan volume query
- Reward menyesuaikan otomatis dengan volume

**Formula:**

```
Annual Inflation Target = Total Supply × Annual Rate (e.g., 5%)

Reward per Query = Annual Inflation Target / Expected Query Volume

Contoh:
- Total Supply = 1,000,000,000 ALTH
- Annual Rate = 5% = 0.05
- Annual Inflation Target = 1,000,000,000 × 0.05 = 50,000,000 ALTH

Jika Expected Volume = 10,000 queries/tahun:
Reward per Query = 50,000,000 / 10,000 = 5,000 ALTH per query

Jika Actual Volume = 20,000 queries/tahun:
Reward per Query = 50,000,000 / 20,000 = 2,500 ALTH per query
```

**Implementasi:**

```rust
// oracle-registry-v2/src/state.rs

pub struct ProtocolParameters {
    // ...
    /// Annual inflation rate target (basis points, e.g., 500 = 5%)
    pub inflation_rate_bps: u32,  // Already exists
    
    /// Total supply of ALTH token
    pub total_supply: Amount,  // NEW: Track total supply
    
    /// Expected query volume per year (for calculation)
    pub expected_queries_per_year: u64,  // NEW
    
    /// Actual queries this year (for tracking)
    pub queries_this_year: u64,  // NEW
    
    /// Year start timestamp
    pub year_start_timestamp: Timestamp,  // NEW
}

impl ProtocolParameters {
    /// Calculate inflation reward per query based on annual rate
    pub fn calculate_inflation_reward_per_query(&self) -> Amount {
        // Calculate annual inflation target
        let annual_target = self.total_supply * (self.inflation_rate_bps as f64 / 10000.0);
        
        // Use actual volume if available, otherwise expected
        let volume = if self.queries_this_year > 0 {
            self.queries_this_year
        } else {
            self.expected_queries_per_year
        };
        
        // Calculate reward per query
        if volume > 0 {
            annual_target / volume
        } else {
            Amount::from_tokens(50) // Fallback to default
        }
    }
    
    /// Check if we've exceeded annual inflation target
    pub fn check_inflation_limit(&self) -> bool {
        let annual_target = self.total_supply * (self.inflation_rate_bps as f64 / 10000.0);
        let distributed = self.total_inflation_distributed;
        
        distributed < annual_target
    }
}
```

**Keuntungan:**
- ✅ Supply tetap terkendali (maksimal sesuai annual rate)
- ✅ Reward menyesuaikan dengan volume query
- ✅ Sustainable untuk jangka panjang
- ✅ Predictable annual inflation

**Kekurangan:**
- ⚠️ Perlu track total supply dan query volume
- ⚠️ Reward bisa berubah seiring waktu

---

### **Model 2: Sliding Window Rate-Based**

**Konsep:**
- Set target inflation rate per periode (e.g., monthly)
- Hitung reward berdasarkan volume query di periode tersebut
- Reset setiap periode

**Formula:**

```
Monthly Inflation Target = Total Supply × (Annual Rate / 12)

Reward per Query = Monthly Inflation Target / Queries This Month

Contoh:
- Total Supply = 1,000,000,000 ALTH
- Annual Rate = 5%
- Monthly Target = 1,000,000,000 × (0.05 / 12) = 4,166,666 ALTH

Jika queries bulan ini = 1,000:
Reward per Query = 4,166,666 / 1,000 = 4,166 ALTH

Jika queries bulan ini = 2,000:
Reward per Query = 4,166,666 / 2,000 = 2,083 ALTH
```

**Implementasi:**

```rust
pub struct ProtocolParameters {
    // ...
    /// Monthly inflation target (calculated from annual rate)
    pub monthly_inflation_target: Amount,  // NEW
    
    /// Queries this month
    pub queries_this_month: u64,  // NEW
    
    /// Month start timestamp
    pub month_start_timestamp: Timestamp,  // NEW
}

impl ProtocolParameters {
    /// Calculate reward per query for current month
    pub fn calculate_monthly_reward_per_query(&self) -> Amount {
        if self.queries_this_month > 0 {
            self.monthly_inflation_target / self.queries_this_month
        } else {
            // Use expected monthly volume
            let expected_monthly = self.expected_queries_per_year / 12;
            self.monthly_inflation_target / expected_monthly
        }
    }
    
    /// Reset monthly counters (called at start of each month)
    pub fn reset_monthly_counters(&mut self) {
        self.queries_this_month = 0;
        self.month_start_timestamp = current_timestamp();
    }
}
```

**Keuntungan:**
- ✅ Lebih responsive terhadap volume changes
- ✅ Reward menyesuaikan setiap bulan
- ✅ Lebih fair untuk voters (reward tidak terlalu rendah di akhir tahun)

**Kekurangan:**
- ⚠️ Perlu reset mechanism setiap bulan
- ⚠️ Reward bisa sangat berbeda antar bulan

---

### **Model 3: Dynamic Rate dengan Cap**

**Konsep:**
- Set base reward per query
- Set maximum annual inflation cap
- Jika cap tercapai, kurangi reward atau stop minting

**Formula:**

```
Base Reward per Query = 50 ALTH (default)

Annual Inflation Cap = Total Supply × Max Rate (e.g., 5%)

Track: Total Inflation Distributed This Year

If (Total Distributed + Base Reward) > Annual Cap:
    Reward = Annual Cap - Total Distributed
    (atau reject query jika sudah cap)
Else:
    Reward = Base Reward
```

**Implementasi:**

```rust
pub struct ProtocolParameters {
    // ...
    /// Base reward per query
    pub base_reward_per_query: Amount,  // NEW: 50 ALTH
    
    /// Maximum annual inflation rate (basis points)
    pub max_annual_inflation_rate_bps: u32,  // NEW: 500 = 5%
    
    /// Total inflation distributed this year
    pub total_inflation_distributed: Amount,  // Already exists
}

impl ProtocolParameters {
    /// Calculate reward with cap check
    pub fn calculate_capped_reward(&self, total_supply: Amount) -> Result<Amount, String> {
        // Calculate annual cap
        let annual_cap = total_supply * (self.max_annual_inflation_rate_bps as f64 / 10000.0);
        
        // Check if we've exceeded cap
        if self.total_inflation_distributed >= annual_cap {
            return Err("Annual inflation cap reached".to_string());
        }
        
        // Calculate remaining capacity
        let remaining = annual_cap - self.total_inflation_distributed;
        
        // Use base reward if available, otherwise use remaining
        if remaining >= self.base_reward_per_query {
            Ok(self.base_reward_per_query)
        } else {
            Ok(remaining)  // Give remaining amount
        }
    }
}
```

**Keuntungan:**
- ✅ Simple dan predictable
- ✅ Hard cap untuk inflation
- ✅ Base reward tetap konsisten sampai cap tercapai

**Kekurangan:**
- ⚠️ Reward bisa menurun di akhir tahun
- ⚠️ Query bisa di-reject jika cap tercapai

---

### **Model 4: Hybrid: Base + Dynamic Adjustment**

**Konsep:**
- Set base reward per query
- Adjust reward berdasarkan volume query
- Tetap ada cap untuk safety

**Formula:**

```
Base Reward = 50 ALTH

If queries_this_year < expected_queries:
    Reward = Base Reward × (1 + bonus_multiplier)
Else if queries_this_year > expected_queries:
    Reward = Base Reward × (1 - penalty_multiplier)
Else:
    Reward = Base Reward

With cap: Total Distributed < Annual Cap
```

**Implementasi:**

```rust
pub struct ProtocolParameters {
    // ...
    pub base_reward_per_query: Amount,  // 50 ALTH
    pub expected_queries_per_year: u64,  // 10,000
    pub queries_this_year: u64,
    pub max_annual_inflation_rate_bps: u32,  // 5%
}

impl ProtocolParameters {
    pub fn calculate_dynamic_reward(&self, total_supply: Amount) -> Result<Amount, String> {
        // Check cap first
        let annual_cap = total_supply * (self.max_annual_inflation_rate_bps as f64 / 10000.0);
        if self.total_inflation_distributed >= annual_cap {
            return Err("Annual inflation cap reached".to_string());
        }
        
        // Calculate volume ratio
        let volume_ratio = self.queries_this_year as f64 / self.expected_queries_per_year as f64;
        
        // Adjust reward based on volume
        let multiplier = if volume_ratio < 0.8 {
            // Low volume: bonus
            1.2  // 20% bonus
        } else if volume_ratio > 1.2 {
            // High volume: penalty
            0.8  // 20% penalty
        } else {
            // Normal volume
            1.0
        };
        
        let adjusted_reward = self.base_reward_per_query * multiplier;
        
        // Check if adjusted reward fits in remaining cap
        let remaining = annual_cap - self.total_inflation_distributed;
        if adjusted_reward > remaining {
            Ok(remaining)
        } else {
            Ok(adjusted_reward)
        }
    }
}
```

**Keuntungan:**
- ✅ Base reward tetap konsisten
- ✅ Menyesuaikan dengan volume
- ✅ Ada cap untuk safety
- ✅ Incentivize optimal volume

**Kekurangan:**
- ⚠️ Lebih kompleks
- ⚠️ Perlu track volume dan adjust multiplier

---

## 📊 Perbandingan Model

| Model | Complexity | Predictability | Flexibility | Cap Control |
|-------|-----------|----------------|-------------|-------------|
| **Flat (Current)** | ✅ Simple | ✅ High | ❌ Low | ❌ No |
| **Annual Rate-Based** | ⚠️ Medium | ✅ High | ✅ High | ✅ Yes |
| **Monthly Rate-Based** | ⚠️ Medium | ⚠️ Medium | ✅ High | ✅ Yes |
| **Dynamic with Cap** | ⚠️ Medium | ✅ High | ⚠️ Medium | ✅ Yes |
| **Hybrid** | ❌ Complex | ⚠️ Medium | ✅ High | ✅ Yes |

---

## 🎯 Rekomendasi: Annual Rate-Based dengan Cap

### **Model yang Direkomendasikan:**

```rust
pub struct ProtocolParameters {
    // Existing fields...
    
    /// Annual inflation rate target (basis points, e.g., 500 = 5%)
    pub inflation_rate_bps: u32,  // Already exists: 500 = 5%
    
    /// Total supply of ALTH token (updated periodically)
    pub total_supply: Amount,  // NEW
    
    /// Expected query volume per year (for calculation)
    pub expected_queries_per_year: u64,  // NEW: e.g., 10,000
    
    /// Actual queries this year (tracked)
    pub queries_this_year: u64,  // NEW
    
    /// Year start timestamp
    pub year_start_timestamp: Timestamp,  // NEW
    
    /// Total inflation distributed this year
    pub total_inflation_distributed: Amount,  // Already exists
}

impl ProtocolParameters {
    /// Calculate inflation reward per query
    pub fn calculate_inflation_reward_per_query(&self) -> Result<Amount, String> {
        // Calculate annual inflation target
        let annual_target = self.total_supply * (self.inflation_rate_bps as f64 / 10000.0);
        
        // Check if we've exceeded annual target
        if self.total_inflation_distributed >= annual_target {
            return Err("Annual inflation target reached".to_string());
        }
        
        // Calculate remaining capacity
        let remaining = annual_target - self.total_inflation_distributed;
        
        // Use actual volume if available, otherwise expected
        let volume = if self.queries_this_year > 0 {
            self.queries_this_year
        } else {
            self.expected_queries_per_year
        };
        
        // Calculate reward per query
        if volume > 0 {
            let reward = remaining / volume;
            Ok(reward)
        } else {
            // Fallback to base reward
            Ok(Amount::from_tokens(50))
        }
    }
    
    /// Reset yearly counters (called at start of each year)
    pub fn reset_yearly_counters(&mut self) {
        self.queries_this_year = 0;
        self.total_inflation_distributed = Amount::ZERO;
        self.year_start_timestamp = current_timestamp();
    }
}
```

---

## 📋 Implementasi Step-by-Step

### **Step 1: Update ProtocolParameters**

```rust
// oracle-registry-v2/src/state.rs

pub struct ProtocolParameters {
    // ... existing fields ...
    
    // NEW: Inflation control fields
    pub total_supply: Amount,
    pub expected_queries_per_year: u64,
    pub queries_this_year: u64,
    pub year_start_timestamp: Timestamp,
}
```

### **Step 2: Update Query Resolution**

```rust
// oracle-registry-v2/src/contract.rs

async fn resolve_query(...) {
    // ... existing code ...
    
    // Calculate inflation reward based on rate
    let params = self.state.get_parameters().await;
    let inflation_reward = match params.calculate_inflation_reward_per_query() {
        Ok(reward) => reward,
        Err(e) => {
            eprintln!("⚠️  Cannot mint inflation reward: {}", e);
            Amount::ZERO  // Skip inflation reward if cap reached
        }
    };
    
    // Update counters
    params.queries_this_year += 1;
    params.total_inflation_distributed += inflation_reward;
    
    // ... distribute reward ...
}
```

### **Step 3: Add Admin Operations**

```rust
// oracle-registry-v2/src/lib.rs

Operation::UpdateInflationControl {
    total_supply: Option<Amount>,
    expected_queries_per_year: Option<u64>,
    inflation_rate_bps: Option<u32>,
}

Operation::ResetYearlyCounters  // Admin can reset yearly counters
```

---

## 💡 Contoh Perhitungan

### **Skenario:**

```
Total Supply: 1,000,000,000 ALTH (1 billion)
Annual Rate: 5% = 0.05
Annual Target: 1,000,000,000 × 0.05 = 50,000,000 ALTH
Expected Queries: 10,000 per year
```

### **Case 1: Normal Volume (10,000 queries)**

```
Reward per Query = 50,000,000 / 10,000 = 5,000 ALTH
Total Distributed = 10,000 × 5,000 = 50,000,000 ALTH ✅
```

### **Case 2: Low Volume (5,000 queries)**

```
Reward per Query = 50,000,000 / 5,000 = 10,000 ALTH
Total Distributed = 5,000 × 10,000 = 50,000,000 ALTH ✅
```

### **Case 3: High Volume (20,000 queries)**

```
Reward per Query = 50,000,000 / 20,000 = 2,500 ALTH
Total Distributed = 20,000 × 2,500 = 50,000,000 ALTH ✅
```

### **Case 4: Very High Volume (100,000 queries)**

```
Reward per Query = 50,000,000 / 100,000 = 500 ALTH
Total Distributed = 100,000 × 500 = 50,000,000 ALTH ✅
```

**Kesimpulan:** Tidak peduli berapa banyak query, total inflation tetap 50,000,000 ALTH (5% dari supply).

---

## ✅ Keuntungan Model Rate-Based

1. ✅ **Supply Terkendali**: Maksimal sesuai annual rate target
2. ✅ **Sustainable**: Tidak membebani protokol meski volume tinggi
3. ✅ **Fair**: Reward menyesuaikan dengan volume (lebih banyak query = reward lebih kecil per query)
4. ✅ **Predictable**: Annual inflation rate tetap konsisten
5. ✅ **Flexible**: Bisa adjust expected volume dan rate

---

## 🚀 Next Steps

1. **Implement Rate-Based Calculation**
   - Update `ProtocolParameters` dengan fields baru
   - Implement `calculate_inflation_reward_per_query()`
   - Update query resolution untuk menggunakan rate-based reward

2. **Add Tracking**
   - Track `queries_this_year`
   - Track `total_inflation_distributed`
   - Add yearly reset mechanism

3. **Add Admin Operations**
   - Update total supply
   - Update expected queries per year
   - Reset yearly counters

4. **Testing**
   - Test dengan berbagai volume scenarios
   - Verify annual cap tidak terlampaui
   - Test reset mechanism

---

**Dokumen ini menjelaskan strategi untuk mengontrol inflation sehingga supply tetap terkendali meski banyak query dibuat** 🚀

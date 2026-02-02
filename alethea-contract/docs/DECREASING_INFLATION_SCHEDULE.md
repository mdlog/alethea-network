# 📉 Decreasing Inflation Schedule: Model & Implementasi

**Tanggal:** 25 Januari 2026  
**Tujuan:** Implementasi annual inflation rate yang menurun setiap tahun (tidak flat)  
**Contoh:** Tahun 1 = 7%, Tahun 5 = 2.5%

---

## 🔍 Contoh dari Projek Lain

### **1. Ethereum (ETH)**

**Model:** Decreasing inflation setelah The Merge (2022)

```
Pre-Merge (Proof of Work):
- Block reward: 2 ETH per block
- Annual inflation: ~4-5%

Post-Merge (Proof of Stake):
- Block reward: ~0.01 ETH per block
- Annual inflation: ~0.5-1%
- Staking rewards: ~4-5% APY (dari fees, bukan inflation)
```

**Karakteristik:**
- ✅ Massive reduction setelah merge
- ✅ Inflation sangat rendah sekarang
- ✅ Staking rewards dari fees, bukan inflation

---

### **2. Bitcoin (BTC)**

**Model:** Halving setiap 4 tahun

```
2009-2012: 50 BTC per block
2012-2016: 25 BTC per block (halving #1)
2016-2020: 12.5 BTC per block (halving #2)
2020-2024: 6.25 BTC per block (halving #3)
2024-2028: 3.125 BTC per block (halving #4)
...
2140: 0 BTC (total supply capped at 21M)
```

**Karakteristik:**
- ✅ Exponential decay (halving)
- ✅ Predictable schedule
- ✅ Hard cap pada total supply

**Formula:**
```
Block Reward = 50 / (2 ^ halving_count)
Annual Inflation = (Block Reward × Blocks Per Year) / Total Supply
```

---

### **3. Solana (SOL)**

**Model:** Decreasing inflation schedule

```
Year 1: 8% annual inflation
Year 2: 7% annual inflation
Year 3: 6% annual inflation
Year 4: 5% annual inflation
Year 5: 4% annual inflation
Year 6: 3% annual inflation
Year 7: 2% annual inflation
Year 8+: 1.5% annual inflation (long-term)
```

**Karakteristik:**
- ✅ Linear decrease untuk 7 tahun pertama
- ✅ Stabil di 1.5% setelah tahun 8
- ✅ Predictable dan transparent

**Formula:**
```
Year 1-7: inflation_rate = 8% - (year - 1) × 1%
Year 8+: inflation_rate = 1.5%
```

---

### **4. Cardano (ADA)**

**Model:** Decreasing inflation dengan reserve

```
Initial: 45 billion ADA (total supply)
Reserve: 13.5 billion ADA (30%)

Inflation Schedule:
- Decreasing from treasury reserve
- Staking rewards: ~4-5% APY
- Inflation decreases as reserve depletes
```

**Karakteristik:**
- ✅ Uses reserve pool
- ✅ Decreasing over time
- ✅ Staking rewards dari reserve, bukan new minting

---

### **5. Polkadot (DOT)**

**Model:** Inflation rate based on staking ratio

```
Target Staking Ratio: 50%

If staking < 50%: Higher inflation (up to 10%)
If staking = 50%: Optimal inflation (~7%)
If staking > 50%: Lower inflation (down to 2.5%)

Long-term: Decreasing to ~2.5%
```

**Karakteristik:**
- ✅ Dynamic berdasarkan staking ratio
- ✅ Incentivize optimal staking
- ✅ Long-term decreasing trend

---

## 📊 Perbandingan Model

| Projek | Model | Year 1 | Year 5 | Long-term | Karakteristik |
|--------|-------|--------|--------|-----------|---------------|
| **Bitcoin** | Halving | ~1.7% | ~0.8% | 0% (2140) | Exponential decay |
| **Ethereum** | Post-merge | ~0.5% | ~0.5% | ~0.5% | Low & stable |
| **Solana** | Linear decay | 8% | 4% | 1.5% | Linear → Stable |
| **Cardano** | Reserve-based | ~4% | ~3% | Decreasing | Reserve depletion |
| **Polkadot** | Dynamic | ~7% | ~5% | ~2.5% | Staking-based |

---

## 🎯 Rekomendasi untuk Alethea Network

### **Model 1: Linear Decay (Solana-style)**

**Formula:**
```
Year 1: 7%
Year 2: 6%
Year 3: 5%
Year 4: 3.5%
Year 5: 2.5%
Year 6+: 2.5% (stabil)
```

**Implementasi:**

```rust
pub fn calculate_annual_inflation_rate(year: u64) -> u32 {
    match year {
        1 => 700,  // 7% = 700 basis points
        2 => 600,  // 6%
        3 => 500,  // 5%
        4 => 350,  // 3.5%
        5 => 250,  // 2.5%
        _ => 250,  // 2.5% stabil setelah tahun 5
    }
}
```

**Keuntungan:**
- ✅ Simple dan predictable
- ✅ Smooth transition
- ✅ Stabil setelah tahun 5

---

### **Model 2: Exponential Decay (Bitcoin-style)**

**Formula:**
```
Year 1: 7%
Year 2: 5.25% (7% × 0.75)
Year 3: 3.94% (5.25% × 0.75)
Year 4: 2.95% (3.94% × 0.75)
Year 5: 2.21% (2.95% × 0.75)
Year 6+: 2% (minimum)
```

**Implementasi:**

```rust
pub fn calculate_annual_inflation_rate(year: u64) -> u32 {
    let initial_rate = 700; // 7%
    let decay_factor = 0.75; // 25% reduction per year
    let min_rate = 200; // 2% minimum
    
    if year == 1 {
        return initial_rate;
    }
    
    let rate = (initial_rate as f64 * decay_factor.powi((year - 1) as i32)) as u32;
    rate.max(min_rate)
}
```

**Keuntungan:**
- ✅ Smooth exponential decay
- ✅ Natural reduction
- ✅ Minimum floor untuk sustainability

---

### **Model 3: Step Function (Custom)**

**Formula:**
```
Year 1-2: 7%
Year 3-4: 5%
Year 5-6: 3.5%
Year 7-8: 2.5%
Year 9+: 2% (long-term)
```

**Implementasi:**

```rust
pub fn calculate_annual_inflation_rate(year: u64) -> u32 {
    match year {
        1..=2 => 700,  // 7%
        3..=4 => 500,  // 5%
        5..=6 => 350,  // 3.5%
        7..=8 => 250,  // 2.5%
        _ => 200,      // 2% long-term
    }
}
```

**Keuntungan:**
- ✅ Clear milestones
- ✅ Predictable steps
- ✅ Easy to communicate

---

### **Model 4: Smooth Curve (Polynomial)**

**Formula:**
```
Rate = 7% - (year - 1) × (7% - 2.5%) / 4
Year 1: 7%
Year 2: 6.125%
Year 3: 5.25%
Year 4: 4.375%
Year 5: 3.5%
Year 6+: 2.5% (stabil)
```

**Implementasi:**

```rust
pub fn calculate_annual_inflation_rate(year: u64) -> u32 {
    let start_rate = 700; // 7%
    let end_rate = 250;   // 2.5%
    let transition_years = 4;
    
    if year <= 1 {
        return start_rate;
    }
    
    if year > transition_years + 1 {
        return end_rate;
    }
    
    // Linear interpolation
    let rate = start_rate as f64 - 
               ((year - 1) as f64 / transition_years as f64) * 
               (start_rate - end_rate) as f64;
    
    rate as u32
}
```

**Keuntungan:**
- ✅ Smooth transition
- ✅ Predictable
- ✅ Customizable transition period

---

## 🏆 Rekomendasi Final: Hybrid Model

### **Model yang Direkomendasikan:**

```
Year 1: 7% (Launch phase - high incentives)
Year 2: 6% (Growth phase)
Year 3: 5% (Maturation)
Year 4: 3.5% (Stabilization)
Year 5: 2.5% (Mature)
Year 6+: 2% (Long-term sustainable)
```

**Karakteristik:**
- ✅ High initial rate untuk bootstrap
- ✅ Smooth decrease untuk 5 tahun pertama
- ✅ Stabil di 2% untuk sustainability
- ✅ Predictable dan transparent

---

## 💻 Implementasi di Codebase

### **Step 1: Add Year Tracking**

```rust
// oracle-registry-v2/src/state.rs

pub struct ProtocolParameters {
    // ... existing fields ...
    
    /// Protocol launch timestamp
    pub protocol_launch_timestamp: Timestamp,  // NEW
    
    /// Current protocol year (calculated from launch)
    pub current_protocol_year: u64,  // NEW (calculated)
}
```

### **Step 2: Calculate Current Year**

```rust
impl ProtocolParameters {
    /// Calculate current protocol year from launch
    pub fn calculate_current_year(&self, current_timestamp: Timestamp) -> u64 {
        let seconds_per_year = 365 * 24 * 60 * 60; // 31,536,000 seconds
        let elapsed_seconds = current_timestamp.micros() - self.protocol_launch_timestamp.micros();
        let elapsed_years = elapsed_seconds / (seconds_per_year * 1_000_000);
        elapsed_years + 1 // Year 1-based
    }
    
    /// Calculate annual inflation rate for current year
    pub fn calculate_annual_inflation_rate(&self, current_timestamp: Timestamp) -> u32 {
        let year = self.calculate_current_year(current_timestamp);
        self.get_inflation_rate_for_year(year)
    }
    
    /// Get inflation rate for specific year
    pub fn get_inflation_rate_for_year(&self, year: u64) -> u32 {
        match year {
            1 => 700,  // 7%
            2 => 600,  // 6%
            3 => 500,  // 5%
            4 => 350,  // 3.5%
            5 => 250,  // 2.5%
            _ => 200,  // 2% long-term
        }
    }
}
```

### **Step 3: Update Reward Calculation**

```rust
// oracle-registry-v2/src/state.rs

impl OracleRegistryState {
    /// Calculate inflation reward per query based on current year's rate
    pub async fn calculate_inflation_reward_per_query(&self, current_timestamp: Timestamp) -> Result<Amount, String> {
        let params = self.parameters.get();
        
        // Calculate current year and rate
        let current_year = params.calculate_current_year(current_timestamp);
        let annual_rate_bps = params.get_inflation_rate_for_year(current_year);
        
        // Get total supply (from token contract or stored)
        let total_supply = params.total_supply; // Need to track this
        
        // Calculate annual inflation target
        let annual_target = total_supply * (annual_rate_bps as f64 / 10000.0);
        
        // Check if we've exceeded annual target
        let total_distributed = *self.total_inflation_distributed.get();
        if total_distributed >= annual_target {
            return Err(format!(
                "Annual inflation target reached for year {} ({}%)",
                current_year, annual_rate_bps as f64 / 100.0
            ));
        }
        
        // Calculate remaining capacity
        let remaining = annual_target - total_distributed;
        
        // Get query volume for current year
        let queries_this_year = params.queries_this_year;
        let volume = queries_this_year.max(1);
        
        // Calculate reward per query
        let reward = remaining / volume;
        
        Ok(reward)
    }
}
```

### **Step 4: Update Query Resolution**

```rust
// oracle-registry-v2/src/contract.rs

async fn resolve_query(...) {
    // ... existing code ...
    
    // Calculate inflation reward based on current year's rate
    let current_timestamp = self.runtime.system_time();
    let inflation_reward = match self.state.calculate_inflation_reward_per_query(current_timestamp).await {
        Ok(reward) => {
            eprintln!(
                "💰 Calculated inflation reward: {} ALTH (based on current year's rate)",
                reward
            );
            reward
        }
        Err(e) => {
            eprintln!("⚠️  Cannot mint inflation reward: {}", e);
            Amount::ZERO  // Skip if cap reached
        }
    };
    
    // Update counters
    let mut params = self.state.get_parameters().await;
    params.queries_this_year += 1;
    self.state.parameters.set(params.clone());
    
    let total_distributed = *self.state.total_inflation_distributed.get();
    self.state.total_inflation_distributed.set(total_distributed.saturating_add(inflation_reward));
    
    // ... distribute reward ...
}
```

### **Step 5: Yearly Reset Mechanism**

```rust
// oracle-registry-v2/src/contract.rs

async fn reset_yearly_counters(&mut self) -> OperationResponse {
    let caller_chain = self.runtime.chain_id();
    
    // Verify caller is admin
    if !self.state.is_admin(&caller_chain).await {
        return OperationResponse::error("Only admin can reset yearly counters");
    }
    
    let current_timestamp = self.runtime.system_time();
    let mut params = self.state.get_parameters().await;
    
    // Check if we're in a new year
    let current_year = params.calculate_current_year(current_timestamp);
    let last_reset_year = params.last_reset_year.unwrap_or(0);
    
    if current_year <= last_reset_year {
        return OperationResponse::error("Already reset for current year");
    }
    
    // Reset counters
    params.queries_this_year = 0;
    params.last_reset_year = Some(current_year);
    self.state.parameters.set(params.clone());
    
    // Reset distributed inflation (or keep cumulative?)
    // Option 1: Reset to zero (fresh start each year)
    self.state.total_inflation_distributed.set(Amount::ZERO);
    
    // Option 2: Keep cumulative (track total inflation over years)
    // (Don't reset)
    
    OperationResponse::success(format!(
        "Yearly counters reset for year {}",
        current_year
    ))
}
```

---

## 📊 Tabel Schedule Lengkap

| Year | Inflation Rate | Annual Target (1B supply) | Notes |
|------|----------------|---------------------------|-------|
| **1** | 7% | 70,000,000 ALTH | Launch phase |
| **2** | 6% | 60,000,000 ALTH | Growth phase |
| **3** | 5% | 50,000,000 ALTH | Maturation |
| **4** | 3.5% | 35,000,000 ALTH | Stabilization |
| **5** | 2.5% | 25,000,000 ALTH | Mature |
| **6+** | 2% | 20,000,000 ALTH | Long-term |

**Total Inflation (5 tahun pertama):** 240,000,000 ALTH (24% dari initial supply)

---

## 🎯 Keuntungan Model Decreasing Rate

1. ✅ **High Initial Incentives**: 7% di tahun pertama untuk bootstrap
2. ✅ **Sustainable Long-term**: 2% setelah tahun 5 untuk sustainability
3. ✅ **Predictable**: Transparent schedule yang bisa di-verify
4. ✅ **Fair**: Reward menyesuaikan dengan maturity protocol
5. ✅ **Industry Standard**: Mirip dengan Solana, Polkadot, dll

---

## 📋 Admin Operations

```rust
// oracle-registry-v2/src/lib.rs

Operation::SetProtocolLaunchTimestamp {
    timestamp: Timestamp,  // Set protocol launch time
}

Operation::GetCurrentInflationRate  // Query current year's rate

Operation::ResetYearlyCounters  // Reset for new year
```

---

## ✅ Kesimpulan

**Model yang Direkomendasikan:**
- **Year 1:** 7% (high incentives)
- **Year 2:** 6%
- **Year 3:** 5%
- **Year 4:** 3.5%
- **Year 5:** 2.5%
- **Year 6+:** 2% (long-term)

**Implementasi:**
- Track protocol launch timestamp
- Calculate current year
- Use year-based rate untuk calculate annual target
- Reset yearly counters setiap tahun baru

**Inspired by:**
- Solana (linear decay)
- Bitcoin (decreasing over time)
- Polkadot (long-term decreasing)

---

**Dokumen ini menjelaskan model decreasing inflation schedule yang sustainable dan industry-standard** 🚀

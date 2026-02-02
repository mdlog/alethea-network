# ✅ Implementasi: Decreasing Inflation Schedule + Service Fee

**Tanggal:** 25 Januari 2026  
**Status:** Implementasi Complete

---

## 📋 Perubahan yang Diimplementasikan

### **1. Decreasing Inflation Schedule**

#### **Fields Baru di ProtocolParameters:**

```rust
pub struct ProtocolParameters {
    // ... existing fields ...
    
    // NEW: Inflation control
    pub protocol_launch_timestamp: Option<Timestamp>,
    pub total_supply: Amount,                    // Default: 1B ALTH
    pub expected_queries_per_year: u64,         // Default: 10,000
    pub queries_this_year: u64,                  // Tracked
    pub last_reset_year: Option<u64>,           // Tracked
    pub min_service_fee: Amount,                // Default: 10 ALTH
}
```

#### **Fungsi Baru di State:**

```rust
// Calculate current protocol year
pub fn calculate_current_year(&self, current_timestamp: Timestamp) -> u64

// Get inflation rate for specific year
pub fn get_inflation_rate_for_year(year: u64) -> u32 {
    match year {
        1 => 700,  // 7%
        2 => 600,  // 6%
        3 => 500,  // 5%
        4 => 350,  // 3.5%
        5 => 250,  // 2.5%
        _ => 200,  // 2% long-term
    }
}

// Calculate inflation reward per query based on current year's rate
pub async fn calculate_inflation_reward_per_query(&self, current_timestamp: Timestamp) -> Result<Amount, String>
```

**Formula:**
```
Annual Target = Total Supply × (Annual Rate / 10000)
Reward per Query = (Annual Target - Total Distributed) / Queries This Year
```

---

### **2. Service Fee Mechanism**

#### **Fields Baru:**

```rust
// In ProtocolParameters
pub min_service_fee: Amount  // Default: 10 ALTH

// In OracleRegistryV2 State
pub total_service_fees_collected: RegisterView<Amount>
```

#### **Update CreateQueryWithBond:**

```rust
// Operation::CreateQueryWithBond
CreateQueryWithBond {
    bond_amount: Amount,      // Refundable
    service_fee: Amount,       // NEW: Non-refundable
    priority_fee: Option<Amount>,  // Optional
    // ...
}

// OracleRequest::CreateQueryWithBond
CreateQueryWithBond {
    bond_amount: Amount,
    service_fee: Amount,       // NEW
    priority_fee: Option<Amount>,
    // ...
}
```

#### **Service Fee Collection:**

```rust
// Validate service fee
if service_fee < params.min_service_fee {
    return error("Service fee below minimum");
}

// Collect to protocol treasury
protocol_treasury += service_fee;
total_service_fees_collected += service_fee;
```

---

### **3. Admin Operations Baru**

```rust
// Set protocol launch timestamp
Operation::SetProtocolLaunchTimestamp {
    timestamp: Timestamp,
}

// Update inflation control parameters
Operation::UpdateInflationControl {
    total_supply: Option<Amount>,
    expected_queries_per_year: Option<u64>,
}

// Reset yearly counters
Operation::ResetYearlyCounters
```

---

## 🔄 Alur Lengkap

### **Query Creation:**

```
1. Creator calls CreateQueryWithBond:
   - bond_amount: 100 ALTH
   - service_fee: 10 ALTH
   - priority_fee: 1 ALTH (optional)

2. Validate:
   - Bond >= min_bond (100 ALTH)
   - Service fee >= min_service_fee (10 ALTH)

3. Collect Service Fee:
   - protocol_treasury += 10 ALTH
   - total_service_fees_collected += 10 ALTH

4. Lock Bond:
   - bond_pool += 100 ALTH

5. Update Counters:
   - queries_this_year += 1

6. Create Query:
   - Store query with bond_amount, service_fee, priority_fee
```

---

### **Query Resolution:**

```
1. Query resolves → Calculate inflation reward

2. Calculate Current Year:
   - year = calculate_current_year(current_timestamp)
   - rate = get_inflation_rate_for_year(year)

3. Calculate Annual Target:
   - annual_target = total_supply × (rate / 10000)

4. Check Cap:
   - if total_distributed >= annual_target:
       → Skip inflation reward (cap reached)
   - else:
       → Calculate reward per query

5. Calculate Reward:
   - remaining = annual_target - total_distributed
   - reward = remaining / queries_this_year

6. Mint & Distribute:
   - Mint reward tokens to registry escrow
   - Distribute to correct voters (stake-weighted)
   - Update total_inflation_distributed
```

---

## 📊 Contoh Perhitungan

### **Year 1 (7% rate):**

```
Total Supply: 1,000,000,000 ALTH
Annual Rate: 7% = 700 basis points
Annual Target: 1,000,000,000 × 0.07 = 70,000,000 ALTH

Queries This Year: 10,000
Reward per Query: 70,000,000 / 10,000 = 7,000 ALTH

After 5,000 queries:
- Total Distributed: 5,000 × 7,000 = 35,000,000 ALTH
- Remaining: 70,000,000 - 35,000,000 = 35,000,000 ALTH
- Reward per Query: 35,000,000 / 5,000 = 7,000 ALTH (same)
```

---

### **Year 5 (2.5% rate):**

```
Total Supply: 1,240,000,000 ALTH (after 4 years inflation)
Annual Rate: 2.5% = 250 basis points
Annual Target: 1,240,000,000 × 0.025 = 31,000,000 ALTH

Queries This Year: 20,000
Reward per Query: 31,000,000 / 20,000 = 1,550 ALTH
```

---

## ✅ Checklist Implementasi

- [x] **ProtocolParameters**: Added inflation control fields
- [x] **State**: Added total_service_fees_collected tracking
- [x] **State**: Implemented calculate_current_year()
- [x] **State**: Implemented get_inflation_rate_for_year()
- [x] **State**: Implemented calculate_inflation_reward_per_query()
- [x] **Operation**: Added service_fee to CreateQueryWithBond
- [x] **OracleRequest**: Added service_fee to CreateQueryWithBond
- [x] **Contract**: Updated create_query_with_bond() signature
- [x] **Contract**: Added service fee validation & collection
- [x] **Contract**: Updated query resolution to use rate-based reward
- [x] **Contract**: Added admin operations for inflation control
- [x] **Contract**: Added yearly reset mechanism

---

## 🚀 Next Steps

1. **Set Protocol Launch Timestamp**
   ```rust
   Operation::SetProtocolLaunchTimestamp {
       timestamp: <deployment_timestamp>
   }
   ```

2. **Update Total Supply** (if different from default)
   ```rust
   Operation::UpdateInflationControl {
       total_supply: Some(Amount::from_tokens(1_000_000_000)),
       expected_queries_per_year: Some(10_000),
   }
   ```

3. **Test Query Creation**
   - Create query with bond + service fee
   - Verify service fee collected
   - Verify queries_this_year incremented

4. **Test Query Resolution**
   - Resolve query
   - Verify rate-based reward calculation
   - Verify total_inflation_distributed updated

5. **Test Yearly Reset**
   - Simulate year transition
   - Reset yearly counters
   - Verify new year's rate applied

---

## 📝 Notes

- **Service Fee**: Collected immediately on query creation
- **Inflation Reward**: Calculated dynamically based on current year
- **Year Calculation**: Based on protocol_launch_timestamp
- **Default Values**: 
  - Total Supply: 1B ALTH
  - Expected Queries: 10,000/year
  - Min Service Fee: 10 ALTH

---

**Implementasi Complete!** 🎉

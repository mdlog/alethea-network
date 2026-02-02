# Investigasi: Market Query Tidak Muncul - Summary

## 📊 Status Saat Ini

Dari output `get-latest-market.sh`:
- **Market #1**: Status "Voting" ✅, Query ID: None ❌
- **Market #2**: Status "Open" ✅

**Masalah**: Market #1 sudah request resolution (status Voting) tapi query tidak muncul di dashboard.

## 🔍 Investigasi Detail

### Step 1: Jalankan Investigasi Lengkap

```bash
cd alethea-contract
./scripts/investigate-market-query-detailed.sh 1
```

Script ini akan memeriksa:
1. ✅ Chain configuration
2. ✅ Linera service status
3. ✅ Market status (sudah Voting ✅)
4. ✅ Registry voters (CRITICAL CHECK)
5. ✅ Registry parameters
6. ✅ Registry queries
7. ✅ Message flow analysis
8. ✅ Detailed recommendations

### Step 2: Quick Check Voters (Paling Penting)

```bash
cd alethea-contract
./scripts/check-registry-voters-quick.sh
```

**Kemungkinan besar masalahnya**: Registry tidak punya voters!

Jika output menunjukkan:
```
❌ CRITICAL: No voters in Registry!
```

Maka ini adalah penyebabnya. Query creation akan fail di:
- Location: `oracle-registry-v2/src/contract.rs:4950-4951`
- Error: "No voters registered in Registry"

### Step 3: Quick Check Query Status

```bash
cd alethea-contract
./scripts/quick-check-market-query.sh 1
```

Ini akan cepat cek apakah query sudah dibuat di Registry.

## 🎯 Kemungkinan Penyebab (dari yang paling mungkin)

### 1. **No Voters in Registry** (90% kemungkinan) 🔴

**Gejala**:
- Market status = "Voting" ✅
- Query ID = None ❌
- Query tidak muncul di dashboard

**Penyebab**:
- Registry tidak punya voters terdaftar
- Query creation fail dengan error: "No voters registered in Registry"

**Solusi**:
```bash
# 1. Check voters
./scripts/check-registry-voters-quick.sh

# 2. Jika no voters, register di dashboard:
#    - Go to http://localhost:4002
#    - Register as voter with stake
#    - Wait for registration to complete

# 3. Request resolution lagi dari Market #1
#    (atau tunggu ChainListener process message yang sudah terkirim)
```

### 2. **Message Not Processed** (5% kemungkinan) 🟡

**Gejala**:
- Market status = "Voting" ✅
- Process inbox = "0 blocks"
- Query tidak muncul

**Penyebab**:
- Message belum diproses oleh ChainListener
- ChainListener tidak running atau tidak aktif

**Solusi**:
```bash
# 1. Check linera service
curl http://localhost:8080/health

# 2. If not running, start it
linera service --port 8080

# 3. Process inbox manual
./scripts/process-registry-inbox.sh
```

### 3. **Query Creation Failed** (3% kemungkinan) 🟡

**Gejala**:
- Market status = "Voting" ✅
- Message diproses ✅
- Tapi query tidak dibuat ❌

**Penyebab**:
- Validation error di Registry contract
- Parameter issue
- State save failed

**Solusi**:
```bash
# Check linera service logs for errors
# Look for error messages during message processing
```

### 4. **Query Already Created But Not Visible** (2% kemungkinan) 🟡

**Gejala**:
- Query ada di Registry (verified via GraphQL) ✅
- Tapi tidak muncul di dashboard ❌

**Penyebab**:
- Dashboard filter
- Dashboard cache
- GraphQL query error

**Solusi**:
1. Refresh dashboard page
2. Check browser console
3. Verify query via GraphQL directly

## 📝 Action Plan

### Immediate Actions:

1. **Check Voters** (PALING PENTING):
   ```bash
   ./scripts/check-registry-voters-quick.sh
   ```

2. **Run Full Investigation**:
   ```bash
   ./scripts/investigate-market-query-detailed.sh 1
   ```

3. **Based on Results**:
   - If no voters → Register voters first
   - If message not processed → Process inbox
   - If query exists → Check dashboard

### After Fixing:

1. **Verify Query Created**:
   ```bash
   ./scripts/quick-check-market-query.sh 1
   ```

2. **Check Dashboard**:
   - Refresh Oracle Dashboard
   - Query should appear in "Active Queries" tab

## 🔧 Quick Fixes

### Fix 1: Register Voters (Jika No Voters)

```bash
# Go to Oracle Dashboard
# http://localhost:4002

# Register as voter:
# 1. Click "Register" button
# 2. Enter stake amount (e.g., 1000 ALTH)
# 3. Submit registration
# 4. Wait for confirmation

# Then check again:
./scripts/check-registry-voters-quick.sh
```

### Fix 2: Process Inbox (Jika Message Not Processed)

```bash
# Stop linera service
pkill -f "linera service"

# Process inbox
linera process-inbox 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Start linera service
linera service --port 8080

# Check again
./scripts/investigate-market-query-detailed.sh 1
```

## 📊 Expected Flow After Fix

```
1. Market #1 status = "Voting" ✅
2. Registry has voters ✅
3. Message processed ✅
4. Query created in Registry ✅
5. Query appears in dashboard ✅
6. Market Query ID linked ✅
```

## 🚨 Critical Checks

- [ ] Registry has at least 1 active voter
- [ ] Linera service running
- [ ] Message processed (check logs)
- [ ] Query created in Registry
- [ ] Query visible in dashboard

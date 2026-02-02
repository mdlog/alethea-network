# Investigasi Market #1: Query Tidak Muncul

## 📊 Status Saat Ini

- **Market #1**: "Did Bitcoin close above 100000 USD on December 20, 2024?"
  - Status: **Voting** ✅
  - Query ID: **None** ❌
  
- **Registry Voters**: 3 active voters ✅ (BUKAN masalah voters)

## 🔍 Investigasi Detail

### Step 1: Jalankan Investigasi Lengkap

```bash
cd alethea-contract
./scripts/investigate-market-query-detailed.sh 1
```

Script ini akan memeriksa:
1. ✅ Chain configuration (same/different)
2. ✅ Linera service status
3. ✅ Market status (sudah Voting ✅)
4. ✅ Registry voters (sudah ada 3 ✅)
5. ✅ Registry parameters
6. ✅ Registry queries (apakah query sudah dibuat?)
7. ✅ Message flow analysis
8. ✅ Detailed recommendations

### Step 2: Quick Check Query Status

```bash
cd alethea-contract
./scripts/quick-check-market-query.sh 1
```

Atau:

```bash
cd alethea-contract
./scripts/check-market-1-status.sh
```

## 🎯 Kemungkinan Penyebab (Setelah Voters Dikonfirmasi OK)

### 1. **Message Not Processed** (Paling Mungkin Sekarang) 🟡

**Gejala**:
- Market status = "Voting" ✅
- Registry has voters ✅
- Query ID = None ❌
- Query tidak muncul

**Penyebab**:
- Message belum diproses oleh ChainListener
- ChainListener tidak running atau tidak aktif
- Message stuck di inbox

**Solusi**:
```bash
# 1. Check linera service
curl http://localhost:8080/health

# 2. If not running, start it
linera service --port 8080

# 3. Process inbox manual
./scripts/process-registry-inbox.sh
```

### 2. **Message Processing Failed** 🟡

**Gejala**:
- Message sampai ke Registry
- Tapi processing gagal
- Query tidak dibuat

**Penyebab**:
- Error di Registry contract saat memproses message
- Validation error
- State save failed

**Solusi**:
```bash
# Check linera service logs
# Look for error messages during message processing
# Look for: "📥 Received CreateQueryFromMarket" or error messages
```

### 3. **Query Created But Callback Not Processed** 🟡

**Gejala**:
- Query sudah dibuat di Registry ✅
- Tapi Market Query ID tidak ter-link ❌

**Penyebab**:
- QueryCreated callback dikirim tapi tidak diproses oleh Market
- Market inbox tidak diproses

**Solusi**:
```bash
# Process Market inbox
linera process-inbox <MARKET_CHAIN_ID>

# Or check if query exists in Registry
./scripts/quick-check-market-query.sh 1
```

### 4. **Query Already Created But Not Visible** 🟢

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

1. **Run Full Investigation**:
   ```bash
   ./scripts/investigate-market-query-detailed.sh 1
   ```

2. **Quick Check Query**:
   ```bash
   ./scripts/quick-check-market-query.sh 1
   ```

3. **Process Inbox** (Jika Perlu):
   ```bash
   ./scripts/process-registry-inbox.sh
   ```

### Based on Investigation Results:

- **If query NOT found**: Process inbox, check logs
- **If query found**: Check dashboard, refresh page
- **If message not processed**: Start linera service, process inbox

## 🔧 Quick Fixes

### Fix 1: Process Registry Inbox

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

### Fix 2: Check Linera Service Logs

```bash
# Look for these messages in logs:
# - "📥 Received CreateQueryFromMarket" (message received)
# - "✅ Query created" (query created successfully)
# - "✅ QueryCreated callback sent" (callback sent)
# - Error messages (if any)
```

### Fix 3: Verify Query via GraphQL

```bash
curl -X POST http://localhost:8080/chains/<REGISTRY_CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

## 📊 Expected Results

Setelah process inbox atau ChainListener memproses:

1. ✅ Query dibuat di Registry
2. ✅ Query muncul di dashboard
3. ✅ Market Query ID ter-link (setelah callback diproses)

## 🚨 Critical Checks

- [x] Registry has voters ✅ (3 active voters)
- [ ] Message processed (check logs or process inbox)
- [ ] Query created in Registry
- [ ] Query visible in dashboard
- [ ] Market Query ID linked

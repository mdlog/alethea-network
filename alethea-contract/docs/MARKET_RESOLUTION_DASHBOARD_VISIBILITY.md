# Market Resolution: Query Tidak Muncul di Dashboard

## 🔍 Masalah

Market yang sudah request resolution tidak muncul query-nya di Oracle Dashboard.

## 📊 Flow yang Seharusnya Terjadi

```
1. Market → requestResolution(market_id)
   ↓
2. Market Contract → send OracleRequest ke Registry Chain
   ↓
3. Registry Chain → process inbox (otomatis atau manual)
   ↓
4. Registry Contract → handle_oracle_request() → create query
   ↓
5. Dashboard → query queries { ... } → menampilkan query baru
```

## ⚠️ Kemungkinan Penyebab

### 1. **Cross-Chain Message Belum Diproses** (Paling Umum)

**Gejala**:
- Market status sudah "Voting"
- Tapi query tidak muncul di Registry
- Tidak ada error di console

**Penyebab**:
- Cross-chain message dari Market ke Registry masih stuck di inbox
- Linera service belum memproses inbox Registry chain

**Solusi**:
```bash
# Process Registry inbox
cd alethea-contract
./scripts/process-registry-inbox.sh

# Atau manual
linera process-inbox --with-chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

### 2. **Query Sudah Dibuat Tapi Tidak Terlihat**

**Gejala**:
- Query ada di Registry (bisa di-verify via GraphQL)
- Tapi tidak muncul di dashboard

**Penyebab**:
- Dashboard filter (status, date range)
- Dashboard cache
- GraphQL query error

**Solusi**:
1. Refresh dashboard page
2. Check browser console untuk error
3. Verify query via GraphQL langsung:
   ```graphql
   query {
     queries {
       id
       description
       status
     }
   }
   ```

### 3. **Message Processing Error**

**Gejala**:
- Error di linera service logs
- Message tidak bisa diproses

**Penyebab**:
- Validation error di Registry contract
- Missing voters
- Invalid parameters

**Solusi**:
1. Check linera service logs
2. Verify Registry memiliki voters yang cukup
3. Check Registry parameters (min_votes_default)

## 🔧 Diagnostic Tools

### Script Diagnostik Lengkap

```bash
cd alethea-contract
./scripts/diagnose-market-resolution.sh [market_id] [market_app_id] [chain_id]
```

Script ini akan:
1. ✅ Check market status
2. ✅ Check Registry queries
3. ✅ Cari query yang match dengan market question
4. ✅ Check cross-chain message status
5. ✅ Suggest solusi berdasarkan hasil

### Check Market Resolution Status

```bash
cd alethea-contract
./scripts/check-market-resolution-status.sh [market_id]
```

### Process Registry Inbox

```bash
cd alethea-contract
./scripts/process-registry-inbox.sh [chain_id]
```

## 📝 Step-by-Step Troubleshooting

### Step 1: Verifikasi Market Status

```bash
# Query market
curl -X POST http://localhost:8080/chains/<MARKET_CHAIN_ID>/applications/<MARKET_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ market(id: \"1\") { id question status queryId } }"}'
```

**Expected**: `status: "Voting"`

### Step 2: Check Registry Queries

```bash
# Query Registry
curl -X POST http://localhost:8080/chains/<REGISTRY_CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

**Expected**: Query dengan description yang match market question

### Step 3: Process Inbox (Jika Query Tidak Ada)

```bash
# Stop linera service jika running
pkill -f "linera service"

# Process inbox
linera process-inbox --with-chain-id <REGISTRY_CHAIN_ID>

# Start linera service lagi
linera service start
```

### Step 4: Verifikasi Query Muncul

```bash
# Run diagnostic script
./scripts/diagnose-market-resolution.sh 1
```

### Step 5: Check Dashboard

1. Refresh dashboard page
2. Check browser console untuk error
3. Verify GraphQL query berhasil
4. Check filter settings (status, date)

## 🎯 Quick Fix Checklist

- [ ] Market status = "Voting" ✅
- [ ] Process Registry inbox ✅
- [ ] Query muncul di Registry GraphQL ✅
- [ ] Refresh dashboard ✅
- [ ] Check browser console ✅
- [ ] Verify Registry App ID di dashboard config ✅

## 🔍 Verifikasi Manual via GraphQL

### Check Market

```graphql
query {
  market(id: "1") {
    id
    question
    status
    queryId
  }
}
```

### Check Registry Queries

```graphql
query {
  queries {
    id
    description
    status
    createdAt
  }
}
```

### Check Specific Query

```graphql
query {
  query(id: "1") {
    id
    description
    status
    result
    outcomes
  }
}
```

## 📊 Expected Behavior

### Setelah requestResolution:

1. **Market Status**: `"Voting"`
2. **Cross-chain Message**: Terkirim ke Registry chain
3. **Registry Inbox**: Message masuk ke inbox
4. **After process-inbox**: Query dibuat di Registry
5. **Dashboard**: Query muncul di queries list

### Timeline:

- **T+0s**: Market request resolution
- **T+1-5s**: Message terkirim ke Registry chain
- **T+5-10s**: Process inbox (otomatis atau manual)
- **T+10-15s**: Query muncul di Registry
- **T+15-20s**: Dashboard refresh dan menampilkan query

## 🚨 Common Errors

### Error: "No voters registered in Registry"

**Penyebab**: Registry tidak punya voters

**Solusi**: Register voters terlebih dahulu

### Error: "Minimum votes (3) exceeds total registered voters (2)"

**Penyebab**: `min_votes_default` terlalu tinggi

**Solusi**: Sudah fixed di contract (auto-adjust), tapi perlu redeploy Registry

### Error: "Resource temporarily unavailable"

**Penyebab**: Linera service masih running saat process inbox

**Solusi**: Stop linera service dulu, baru process inbox

## 📚 Related Documentation

- [Market Resolution Fix Summary](./MARKET_RESOLUTION_FIX_SUMMARY.md)
- [Cross-Chain Message Processing](./CROSS_CHAIN_MESSAGE_PROCESSING.md)
- [Cross-Chain Messaging Flow](./CROSS_CHAIN_MESSAGING_FLOW.md)

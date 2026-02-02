# Troubleshooting: Query dari Market Tidak Muncul di Dashboard

## 🔍 Masalah

Market sudah request resolution (status: Voting), tapi query tidak muncul di Oracle Dashboard.

## 📊 Flow yang Seharusnya Terjadi

```
1. Market → requestResolution(market_id)
   ↓
2. Market Contract → send OracleRequest ke Registry Chain
   ↓
3. Registry Chain → receive message di inbox
   ↓
4. ChainListener (otomatis) atau process-inbox (manual) → process message
   ↓
5. Registry Contract → handle_oracle_request() → create query
   ↓
6. Dashboard → query queries { ... } → menampilkan query baru
```

## ⚠️ Kemungkinan Penyebab

### 1. **Market dan Registry di Chain yang Sama** (Paling Umum)

**Gejala**:
- Market status sudah "Voting"
- Process inbox menghasilkan "0 blocks"
- Query tidak muncul

**Penyebab**:
- Market dan Registry di chain yang sama
- Cross-chain messaging mungkin tidak diperlukan
- Message seharusnya diproses otomatis oleh ChainListener

**Solusi**:
1. Pastikan linera service running dengan ChainListener:
   ```bash
   linera service --port 8080
   ```

2. Tunggu beberapa detik untuk ChainListener memproses

3. Jika masih tidak muncul, coba manual process inbox:
   ```bash
   ./scripts/process-registry-inbox.sh
   ```

4. Verifikasi Registry memiliki voters:
   ```bash
   curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
     -H "Content-Type: application/json" \
     -d '{"query": "{ voters { address } }"}'
   ```

### 2. **Message Belum Terkirim dari Market**

**Gejala**:
- Market status masih "Open" (belum "Voting")
- Tidak ada message di Registry inbox

**Penyebab**:
- Market belum request resolution
- Request resolution gagal

**Solusi**:
1. Request resolution dari Market frontend
2. Cek browser console untuk error
3. Verifikasi Market contract configuration

### 3. **Message Sudah Terkirim Tapi Belum Diproses**

**Gejala**:
- Market status "Voting"
- Process inbox menghasilkan "0 blocks"
- Query tidak muncul

**Penyebab**:
- Message belum sampai ke Registry inbox
- Message stuck di outbox Market
- ChainListener tidak running atau tidak memproses

**Solusi**:
1. Pastikan linera service running:
   ```bash
   linera service --port 8080
   ```

2. Process Registry inbox manual:
   ```bash
   pkill -f "linera service"
   linera process-inbox <REGISTRY_CHAIN_ID>
   linera service --port 8080
   ```

3. Cek linera service logs untuk error

### 4. **Message Diproses Tapi Query Creation Gagal**

**Gejala**:
- Process inbox berhasil (ada blocks processed)
- Tapi query tidak muncul

**Penyebab**:
- Registry tidak punya voters
- Validation error di Registry contract
- Invalid parameters

**Solusi**:
1. Cek linera service logs untuk error
2. Verifikasi Registry memiliki voters yang cukup
3. Check Registry parameters (min_votes_default)

### 5. **Query Sudah Dibuat Tapi Tidak Terlihat**

**Gejala**:
- Query ada di Registry (bisa di-verify via GraphQL)
- Tapi tidak muncul di dashboard

**Penyebab**:
- Dashboard filter (status, date range)
- Dashboard cache
- GraphQL query error
- CORS error

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

## 🔧 Diagnostic Tools

### Script Diagnostik Lengkap

```bash
cd alethea-contract
./scripts/diagnose-query-creation.sh [market_id]
```

Script ini akan:
1. ✅ Check chain configuration (same/different)
2. ✅ Check market status
3. ✅ Check Registry queries
4. ✅ Check linera service status
5. ✅ Provide specific recommendations

### Check Market Message Status

```bash
cd alethea-contract
./scripts/check-market-message-status.sh [market_chain_id] [registry_chain_id] [market_id]
```

### Process Registry Inbox

```bash
cd alethea-contract
./scripts/process-registry-inbox.sh [chain_id]
```

## 📝 Step-by-Step Troubleshooting

### Step 1: Run Diagnostic Script

```bash
cd alethea-contract
./scripts/diagnose-query-creation.sh 1
```

Script akan memberikan diagnosis lengkap dan rekomendasi spesifik.

### Step 2: Check Market Status

```bash
curl -X POST http://localhost:8080/chains/<MARKET_CHAIN_ID>/applications/<MARKET_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ market(id: \"1\") { id question status queryId } }"}'
```

**Expected**: `status: "Voting"`

### Step 3: Check Registry Queries

```bash
curl -X POST http://localhost:8080/chains/<REGISTRY_CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

**Expected**: Query dengan description yang match market question

### Step 4: Check Linera Service

```bash
# Check if service is running
curl http://localhost:8080/health

# If not running, start it
linera service --port 8080
```

### Step 5: Process Inbox (Jika Perlu)

```bash
# Stop service
pkill -f "linera service"

# Process inbox
linera process-inbox <REGISTRY_CHAIN_ID>

# Start service again
linera service --port 8080
```

## 🎯 Quick Fix Checklist

- [ ] Market status = "Voting" ✅
- [ ] Linera service running ✅
- [ ] Registry has voters ✅
- [ ] Process Registry inbox (if needed) ✅
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
4. **ChainListener**: Otomatis memproses (jika running)
5. **After processing**: Query dibuat di Registry
6. **Dashboard**: Query muncul di queries list

### Timeline:

- **T+0s**: Market request resolution
- **T+1-5s**: Message terkirim ke Registry chain
- **T+5-10s**: ChainListener memproses (otomatis) atau manual process-inbox
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

### Error: CORS request blocked

**Penyebab**: Frontend mengakses linera service langsung

**Solusi**: Gunakan Vite proxy (sudah fixed di code)

## 📚 Related Documentation

- [Market Resolution Dashboard Visibility](./MARKET_RESOLUTION_DASHBOARD_VISIBILITY.md)
- [Cross-Chain Message Processing](./CROSS_CHAIN_MESSAGE_PROCESSING.md)
- [Cross-Chain Messaging Flow](./CROSS_CHAIN_MESSAGING_FLOW.md)

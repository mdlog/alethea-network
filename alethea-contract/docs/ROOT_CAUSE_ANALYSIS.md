# Root Cause Analysis: Market Query Tidak Muncul

## 🔍 Temuan dari Investigasi

### ✅ Yang Sudah OK:
1. **Registry Voters**: 3 active voters ✅
2. **Market Status**: "Voting" ✅ (request resolution berhasil)
3. **Chain Configuration**: Market dan Registry di chain yang sama ✅
4. **Process Inbox**: "0 blocks" (tidak ada message pending)

### ❌ Masalah Utama:
**Linera Service NOT Running** ❌

**Impact**:
- ChainListener tidak aktif
- Messages TIDAK diproses otomatis
- Queries TIDAK dibuat

## 🎯 Root Cause

### Primary Cause: **Linera Service Not Running**

Dari investigasi:
- Market status = "Voting" ✅ (message sudah terkirim)
- Process inbox = "0 blocks" (tidak ada message di inbox)
- Linera service = NOT running ❌

**Penjelasan**:
1. Market mengirim `OracleRequest` ke Registry chain
2. Karena Market dan Registry di chain yang sama, message mungkin langsung diproses atau masuk ke inbox
3. Tapi karena Linera service tidak running, ChainListener tidak aktif
4. Message tidak diproses → Query tidak dibuat

## 🔧 Solusi

### Step 1: Start Linera Service

```bash
linera service --port 8080
```

**Atau di background**:
```bash
nohup linera service --port 8080 > linera-service.log 2>&1 &
```

### Step 2: Tunggu ChainListener Memproses

Setelah linera service running:
- ChainListener akan otomatis aktif
- ChainListener akan memproses pending messages
- Query akan dibuat otomatis

### Step 3: Verifikasi

```bash
# Check query status
./scripts/quick-check-market-query.sh 1

# Or full investigation
./scripts/investigate-market-query-detailed.sh 1
```

## 📊 Expected Behavior After Fix

### Setelah Linera Service Running:

1. **ChainListener Aktif** ✅
   - ChainListener mendeteksi pending messages
   - Otomatis memproses messages

2. **Message Diproses** ✅
   - Registry.execute_message() → Message::OracleRequest
   - Registry.handle_oracle_request() → OracleRequest::CreateQuery
   - Registry.handle_create_query_from_market() → creates query

3. **Query Dibuat** ✅
   - Query muncul di Registry
   - QueryCreated callback dikirim ke Market

4. **Query Terlihat di Dashboard** ✅
   - Refresh dashboard
   - Query muncul di "Active Queries"

## 🚨 Important Notes

### Same Chain Behavior:

Karena Market dan Registry di chain yang sama:
- Message delivery = instant
- Tapi processing masih perlu ChainListener atau manual process-inbox
- ChainListener akan otomatis memproses jika service running

### Process Inbox "0 blocks":

Ini berarti:
- Tidak ada message pending di inbox
- Message mungkin sudah diproses sebelumnya
- Atau message belum terkirim (tapi status Voting menunjukkan sudah terkirim)
- Atau message processing gagal tapi tidak ada di inbox

### Linera Service Required:

**CRITICAL**: Linera service HARUS running untuk:
- ChainListener aktif
- Automatic message processing
- Query creation
- Dashboard GraphQL queries

## 📝 Action Plan

### Immediate:

1. **Start Linera Service**:
   ```bash
   linera service --port 8080
   ```

2. **Wait 10-30 seconds** untuk ChainListener memproses

3. **Check Query Status**:
   ```bash
   ./scripts/investigate-market-query-detailed.sh 1
   ```

### If Query Still Not Created:

1. **Check Linera Service Logs**:
   - Look for "📥 Received CreateQueryFromMarket"
   - Look for "✅ Query created"
   - Look for error messages

2. **Re-request Resolution**:
   - Reset Market status (if possible)
   - Request resolution lagi dari Market frontend

3. **Manual Process Inbox** (jika perlu):
   ```bash
   ./scripts/process-registry-inbox.sh
   ```

## 🔍 Debugging Commands

### Check Linera Service:
```bash
curl http://localhost:8080/health
```

### Check Query in Registry:
```bash
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

### Check Market Status:
```bash
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<MARKET_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ market(id: \"1\") { id question status queryId } }"}'
```

## ✅ Success Criteria

Setelah fix, harus ada:
- [x] Linera service running ✅
- [ ] Query created in Registry ✅
- [ ] Query visible in dashboard ✅
- [ ] Market Query ID linked ✅

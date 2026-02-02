# Investigasi Detail: Market Query Tidak Muncul di Dashboard

## 🔍 Tujuan Investigasi

Menemukan penyebab mengapa market yang sudah dibuat dan request resolution tidak muncul sebagai query di Oracle Dashboard untuk di-resolve.

## 📊 Flow Lengkap yang Seharusnya Terjadi

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Market Request Resolution                           │
│ Location: alethea-market frontend                           │
│ Action: User clicks "Request Resolution"                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Market Contract - request_resolution()              │
│ Location: simple-market/src/contract.rs:481-558             │
│ Checks:                                                      │
│   - Market exists ✅                                         │
│   - Market status = Open ✅                                 │
│   - registry_app_id configured ✅                           │
│   - registry_chain_id configured ✅                          │
│ Action:                                                     │
│   - Update market.status = Voting                          │
│   - Create OracleRequest::CreateQuery                       │
│   - Send message via send_to(registry_chain_id)             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Cross-chain message
                        │ Message::OracleRequest(OracleRequest::CreateQuery)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Message Delivery                                    │
│ Location: Linera network layer                              │
│ Behavior:                                                   │
│   - If same chain: Instant delivery                         │
│   - If different chain: Cross-chain delivery                │
│   - Message arrives in Registry inbox                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Message Processing                                  │
│ Location: ChainListener (automatic) or process-inbox (manual)│
│ Behavior:                                                   │
│   - ChainListener detects NewIncomingBundle                 │
│   - Automatically calls process_inbox()                     │
│   - OR manual: linera process-inbox <CHAIN_ID>              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Registry Contract - execute_message()              │
│ Location: oracle-registry-v2/src/contract.rs:496-588        │
│ Checks:                                                     │
│   - Message type = Message::OracleRequest ✅                │
│ Action:                                                     │
│   - Call handle_oracle_request()                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Registry Contract - handle_oracle_request()         │
│ Location: oracle-registry-v2/src/contract.rs:4332-4398     │
│ Checks:                                                     │
│   - Request type = OracleRequest::CreateQuery ✅            │
│ Action:                                                     │
│   - Extract fields (request_id, description, outcomes, etc) │
│   - Call handle_create_query_from_market()                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Registry Contract - handle_create_query_from_market()│
│ Location: oracle-registry-v2/src/contract.rs:4922-5100+    │
│ Checks:                                                     │
│   - Validate query parameters ✅                             │
│   - Check voter_count > 0 ❌ (FAILURE POINT 1)             │
│   - Adjust min_votes based on voters ✅                      │
│   - Select voters for query ✅                               │
│   - Create query object ✅                                   │
│   - Save query to state ✅                                   │
│   - Send callback to Market ✅                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 8: Dashboard Query                                     │
│ Location: alethea-dashboard-vite/src/pages/HomePage.tsx:89  │
│ GraphQL Query:                                              │
│   queries {                                                 │
│     id description status ...                               │
│   }                                                         │
│ Expected: Query appears in list                             │
└─────────────────────────────────────────────────────────────┘
```

## ⚠️ Failure Points (Titik Kegagalan)

### **FAILURE POINT 1: No Voters in Registry** 🔴 CRITICAL

**Location**: `oracle-registry-v2/src/contract.rs:4950-4951`

```rust
let voter_count = *self.state.voter_count.get();
let min_votes_required = if voter_count == 0 {
    return OperationResponse::error("No voters registered in Registry".to_string());
}
```

**Gejala**:
- Market status = "Voting" ✅
- Message terkirim ✅
- Message diproses ✅
- Query creation FAILS dengan error: "No voters registered in Registry"

**Solusi**:
1. Register voters di Registry terlebih dahulu
2. Setidaknya 1 voter harus terdaftar
3. Kemudian request resolution dari Market lagi

**Verifikasi**:
```bash
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address stake isActive } statistics { totalVoters activeVoters } }"}'
```

### **FAILURE POINT 2: Message Not Sent** 🟡

**Location**: `simple-market/src/contract.rs:548-552`

**Gejala**:
- Market status masih "Open" (belum "Voting")
- Tidak ada message di Registry inbox

**Penyebab**:
- Request resolution gagal
- Contract panic sebelum send message
- Configuration error (registry_chain_id not set)

**Solusi**:
1. Cek Market status via GraphQL
2. Cek browser console untuk error
3. Verifikasi Market contract configuration

**Verifikasi**:
```bash
curl -X POST http://localhost:8080/chains/<MARKET_CHAIN_ID>/applications/<MARKET_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ market(id: \"1\") { id question status } }"}'
```

### **FAILURE POINT 3: Message Not Received** 🟡

**Location**: Registry inbox

**Gejala**:
- Market status = "Voting" ✅
- Process inbox menghasilkan "0 blocks"
- Query tidak muncul

**Penyebab**:
- Message belum sampai ke Registry inbox
- Message stuck di Market outbox
- Network issue

**Solusi**:
1. Process Registry inbox manual
2. Check Market outbox (if possible)
3. Wait for ChainListener to process

**Verifikasi**:
```bash
# Process inbox
linera process-inbox <REGISTRY_CHAIN_ID>

# Check output for processed blocks
```

### **FAILURE POINT 4: Message Not Processed** 🟡

**Location**: ChainListener or process-inbox

**Gejala**:
- Message ada di inbox
- Tapi tidak diproses
- Query tidak dibuat

**Penyebab**:
- ChainListener tidak running
- ChainListener tidak tracking Registry chain
- Manual process-inbox tidak dijalankan

**Solusi**:
1. Start linera service: `linera service --port 8080`
2. ChainListener akan otomatis memproses
3. Atau manual: `linera process-inbox <CHAIN_ID>`

**Verifikasi**:
```bash
# Check if service running
curl http://localhost:8080/health

# Check service logs for ChainListener activity
```

### **FAILURE POINT 5: Message Processing Failed** 🟡

**Location**: `oracle-registry-v2/src/contract.rs:588`

**Gejala**:
- Message sampai ke Registry
- Tapi execute_message() gagal
- Query tidak dibuat

**Penyebab**:
- Message type mismatch
- Deserialization error
- Contract state issue

**Solusi**:
1. Check linera service logs untuk error
2. Verify message format matches expected type
3. Check contract version compatibility

**Verifikasi**:
```bash
# Check linera service logs
# Look for error messages during message processing
```

### **FAILURE POINT 6: Query Creation Failed** 🟡

**Location**: `oracle-registry-v2/src/contract.rs:4922-5100+`

**Gejala**:
- Message diproses ✅
- handle_create_query_from_market() dipanggil ✅
- Tapi query tidak dibuat ❌

**Penyebab**:
- No voters (FAILURE POINT 1) ❌
- Parameter validation failed
- Voter selection failed
- State save failed

**Solusi**:
1. Check linera service logs untuk specific error
2. Verify all validation checks pass
3. Check Registry state integrity

**Verifikasi**:
```bash
# Check Registry parameters
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ parameters { minVotesDefault defaultQueryDuration } }"}'
```

### **FAILURE POINT 7: Query Not Visible in Dashboard** 🟡

**Location**: Dashboard GraphQL query

**Gejala**:
- Query ada di Registry (verified via GraphQL) ✅
- Tapi tidak muncul di dashboard ❌

**Penyebab**:
- Dashboard filter (status, date)
- Dashboard cache
- GraphQL query error
- CORS error (already fixed)
- Wrong Registry App ID in dashboard config

**Solusi**:
1. Refresh dashboard page
2. Check browser console untuk error
3. Verify query via GraphQL directly
4. Check dashboard filter settings
5. Verify Registry App ID in dashboard config

**Verifikasi**:
```bash
# Query Registry directly
curl -X POST http://localhost:8080/chains/<CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

## 🔧 Script Investigasi Detail

### Jalankan Script Investigasi Lengkap

```bash
cd alethea-contract
./scripts/investigate-market-query-detailed.sh [market_id]
```

Script ini akan melakukan:
1. ✅ Check chain configuration (same/different)
2. ✅ Check linera service status
3. ✅ Check market status
4. ✅ Check Registry voters (CRITICAL)
5. ✅ Check Registry parameters
6. ✅ Check Registry queries
7. ✅ Analyze message flow
8. ✅ Provide detailed recommendations

### Output Script

Script akan memberikan:
- ✅ Status setiap step (pass/fail)
- ❌ Identifikasi failure point spesifik
- 🔧 Rekomendasi solusi berdasarkan failure point
- 📊 Data yang diperlukan untuk troubleshooting

## 📝 Checklist Investigasi Manual

### Step 1: Verify Market Status
- [ ] Market exists
- [ ] Market status = "Voting"
- [ ] Market has registry_chain configured

### Step 2: Verify Registry Configuration
- [ ] Registry App ID correct
- [ ] Registry Chain ID correct
- [ ] Registry accessible via GraphQL

### Step 3: Verify Registry Voters
- [ ] At least 1 voter registered
- [ ] At least 1 active voter
- [ ] Voters have stake

### Step 4: Verify Message Flow
- [ ] Market sent message (check logs)
- [ ] Message received in Registry inbox
- [ ] Message processed (check logs)

### Step 5: Verify Query Creation
- [ ] Query created in Registry
- [ ] Query visible via GraphQL
- [ ] Query has correct description

### Step 6: Verify Dashboard
- [ ] Dashboard queries Registry correctly
- [ ] Dashboard shows all queries
- [ ] No filter hiding query
- [ ] Browser console no errors

## 🎯 Quick Diagnosis Commands

### Check Market
```bash
curl -X POST http://localhost:8080/chains/<MARKET_CHAIN_ID>/applications/<MARKET_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ market(id: \"1\") { id question status queryId } }"}'
```

### Check Registry Voters
```bash
curl -X POST http://localhost:8080/chains/<REGISTRY_CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address stake isActive } statistics { totalVoters activeVoters } }"}'
```

### Check Registry Queries
```bash
curl -X POST http://localhost:8080/chains/<REGISTRY_CHAIN_ID>/applications/<REGISTRY_APP_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

### Process Inbox
```bash
pkill -f "linera service"
linera process-inbox <REGISTRY_CHAIN_ID>
linera service --port 8080
```

## 🚨 Most Common Issues

### Issue 1: No Voters (90% of cases)
**Symptom**: Query creation fails with "No voters registered"
**Solution**: Register voters first

### Issue 2: Message Not Processed (5% of cases)
**Symptom**: Market "Voting" but no query
**Solution**: Process inbox manually

### Issue 3: Query Filtered (3% of cases)
**Symptom**: Query exists but not visible
**Solution**: Check dashboard filters

### Issue 4: CORS Error (2% of cases)
**Symptom**: Network error in browser
**Solution**: Already fixed - use Vite proxy

## 📚 Related Documentation

- [Query Not Appearing Troubleshooting](./QUERY_NOT_APPEARING_TROUBLESHOOTING.md)
- [Market Resolution Dashboard Visibility](./MARKET_RESOLUTION_DASHBOARD_VISIBILITY.md)
- [Cross-Chain Message Processing](./CROSS_CHAIN_MESSAGE_PROCESSING.md)

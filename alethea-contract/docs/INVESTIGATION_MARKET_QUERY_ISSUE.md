# INVESTIGASI DETAIL: Mengapa Request Resolution Tidak Membuat Query

## Tanggal Investigasi: 2 Februari 2026

---

## RINGKASAN MASALAH

Ketika user melakukan **Request Resolution** dari Alethea Market frontend, query **TIDAK MUNCUL** di Oracle Dashboard. Market status berubah menjadi "Voting" tapi `queryId` tetap `null`.

---

## DATA INVESTIGASI

### 1. Status Market Application

```json
{
  "markets": [
    { "id": "1", "question": "Did Bitcoin close above 100000 USD...", "status": "Voting", "queryId": null },
    { "id": "2", "question": "Did the US Federal Reserve cut...", "status": "Voting", "queryId": null },
    { "id": "3", "question": "Did Ethereum reach 5000 USD...", "status": "Voting", "queryId": null }
  ]
}
```

**Semua 3 market sudah request resolution** (status = "Voting"), tapi **TIDAK ADA yang punya queryId**!

### 2. Status Registry Queries

```json
{
  "queries": [
    { "id": 1, "description": "Did BTC close above $100,000...", "status": "Resolved" },
    { "id": 2, "description": "Did BTC close above $100,000...", "status": "Active" },
    { "id": 3, "description": "Note: Query created without bond...", "status": "Resolved" },
    { "id": 4, "description": "Did ETH close above $10,000...", "status": "Active" }
  ]
}
```

**4 queries yang ada TIDAK ADA yang berasal dari Market** - semua dibuat langsung dari dashboard.

### 3. Chain Outbox State

```json
{
  "tipState": { "nextBlockHeight": 233 },
  "outboxCounters": { "110": 1 }
}
```

🔴 **CRITICAL FINDING**: Ada **1 pesan TERSANGKUT di outbox** sejak block height 110!
- Block height sekarang: 233
- Pesan tertunda sejak: block 110
- Selisih: 123 blocks!

### 4. Service & Permission Status

```
Process:  root 353022 linera service --port 8080
Wallet:   drwxrwxr-x root root ~/.config/linera/
```

🔴 **ROOT CAUSE**: Service berjalan sebagai **ROOT** dan wallet dimiliki **ROOT**!

---

## ALUR YANG SEHARUSNYA TERJADI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXPECTED FLOW: Market Request Resolution → Query Created                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. [Frontend] User clicks "Request Resolution" on Market #1
       │
       ▼
2. [GraphQL] Mutation `requestResolution(marketId: 1)` sent to Market App
       │
       ▼
3. [Market Contract] request_resolution() executes:
   - Validates market exists and is in "Open" status
   - Creates OracleRequest::CreateQuery message
   - Calls send_to(registry_chain_id) to send cross-chain message
   - Updates market.status = "Voting" ✅ (THIS HAPPENS)
       │
       ▼
4. [Linera Runtime] Message added to OUTBOX
   ⚠️ PROBLEM: Message STUCK here at block 110!
       │
       ✖ (MESSAGE NEVER DELIVERED)
       │
5. [Registry Contract] execute_message() should receive Message::OracleRequest
   ❌ NEVER HAPPENS - message not delivered!
       │
6. [Registry Contract] handle_oracle_request() should process request
   ❌ NEVER HAPPENS
       │
7. [Registry Contract] handle_create_query_from_market() should create query
   ❌ NEVER HAPPENS
       │
8. [Registry Contract] Should send OracleCallback::QueryCreated back to Market
   ❌ NEVER HAPPENS
```

---

## ROOT CAUSE ANALYSIS

### Primary Cause: Permission Issue

**Linera service berjalan sebagai ROOT** menyebabkan:

1. **Wallet Database Lock**: ChainListener tidak bisa memproses pesan karena database dikunci
2. **Outbox Not Flushed**: Pesan yang dikirim tidak pernah di-commit ke network
3. **Cross-chain Messages Stuck**: Pesan dari block 110 masih tertunda sampai sekarang (block 233)

### Technical Details

Ketika `send_to(registry_chain_id)` dipanggil:
1. Pesan ditambahkan ke **outbox** chain
2. ChainListener seharusnya memproses outbox dan mengirim ke recipient
3. **Karena service berjalan sebagai root**, ChainListener mengalami permission issues
4. Pesan TIDAK PERNAH terkirim ke inbox Registry

### Code Path (simple-market/src/contract.rs:547-552)

```rust
// Send cross-chain message
self.runtime
    .prepare_message(message)
    .with_authentication()
    .with_tracking()
    .send_to(registry_chain_id);  // ← Message added to outbox but never delivered
```

---

## BUKTI MASALAH

| Evidence | Status | Note |
|----------|--------|------|
| Market status = "Voting" | ✅ | Contract executed, status changed |
| Market queryId = null | ❌ | No callback received |
| Registry queries count | 4 | None from Market |
| Outbox counter at block 110 | 1 | Message stuck |
| Current block height | 233 | 123 blocks passed |
| Service running as | ROOT | Permission issue |
| Wallet owned by | ROOT | Permission issue |

---

## SOLUSI

### Langkah 1: Stop Service

```bash
sudo pkill -f 'linera service'
```

### Langkah 2: Fix Ownership Wallet

```bash
sudo chown -R $USER:$USER ~/.config/linera
```

### Langkah 3: Sync dan Process Inbox

```bash
linera sync 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
linera process-inbox 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

### Langkah 4: Start Service sebagai User Biasa

```bash
# TANPA sudo!
linera service --port 8080
```

### Langkah 5: Re-request Resolution

Setelah service berjalan dengan benar:
1. Buat market baru atau reset market lama
2. Request resolution lagi
3. Query seharusnya muncul di dashboard

---

## PENCEGAHAN KE DEPAN

1. **JANGAN jalankan `linera service` sebagai root**
2. **Pastikan wallet dimiliki user yang menjalankan service**
3. **Monitor outboxCounters** - jika ada pesan tertunda, segera investigate

---

## KESIMPULAN

Masalah utama adalah **SERVICE BERJALAN SEBAGAI ROOT** yang menyebabkan:
- ChainListener tidak bisa memproses pesan
- Cross-chain messages stuck di outbox
- Query tidak pernah dibuat di Registry

**Solusi**: Fix permission dan restart service sebagai user biasa.

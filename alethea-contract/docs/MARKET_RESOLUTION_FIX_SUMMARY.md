# Market Resolution Fix Summary

## ✅ Fix yang Sudah Diterapkan

### 1. Simple Market Contract (`request_resolution`)
- **Masalah**: `call_application()` menyebabkan WASM `RuntimeError: unreachable`
- **Solusi**: Menggunakan cross-chain messaging (`send_message`) untuk mengirim `OracleRequest`
- **File**: `alethea-contract/simple-market/src/contract.rs` (line 516-557)
- **Status**: ✅ Fixed dan deployed

### 2. Registry Contract (`handle_create_query_from_market`)
- **Masalah**: `min_votes_default=3` melebihi jumlah voters yang tersedia (2)
- **Solusi**: Auto-adjust `min_votes` berdasarkan jumlah voters yang tersedia
- **File**: `alethea-contract/oracle-registry-v2/src/contract.rs` (line 4948-4966)
- **Status**: ✅ Fixed di source code (akan aktif setelah Registry di-redeploy)

## 📊 Status Saat Ini

### ✅ Yang Sudah Bekerja
1. **Market Creation**: Berhasil membuat market baru
2. **Request Resolution**: Berhasil tanpa WASM panic
   - Response: `ab26b082aa12ec32445bce88e6d7b6be4b8f574f2683fb4927eff27f4170c5ea`
   - Market status berubah menjadi "Voting"
3. **Cross-chain Messaging**: Message terkirim dari Market ke Registry

### ⚠️ Yang Perlu Diperhatikan
1. **Query Belum Muncul di Dashboard**: Cross-chain message mungkin belum diproses
   - **Solusi**: Process Registry inbox untuk menerima message
   - **Command**: `linera process-inbox --with-chain-id <REGISTRY_CHAIN_ID>`

## 🔧 Troubleshooting: Query Tidak Muncul

### Step 1: Process Registry Inbox

```bash
cd alethea-contract
./scripts/process-registry-inbox.sh
```

Atau manual:
```bash
# Stop linera service jika running (untuk avoid lock)
pkill -f "linera service"

# Process inbox
linera process-inbox --with-chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Start linera service lagi
linera service start
```

### Step 2: Verifikasi Query

```bash
cd alethea-contract
./scripts/check-market-resolution-status.sh 1
```

### Step 3: Cek Linera Service Logs

Jika query masih belum muncul, cek linera service logs untuk melihat apakah ada error saat memproses message:

```bash
# Cek logs untuk melihat apakah OracleRequest diterima
# Logs biasanya di console atau file log
```

## 📝 Deployment Info

- **Market App ID**: `afa5023760441e2fd5768f42b010f42f7fab98317612e915e51537a29d7f33d1`
- **Registry App ID**: `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990`
- **Chain ID**: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

## 🎯 Next Steps

1. **Process Registry Inbox** untuk menerima cross-chain message
2. **Verifikasi Query** muncul di Oracle Dashboard
3. **Test Voting** pada query yang baru dibuat
4. **Test Callback** ketika query di-resolve

## 🔍 Jika Masih Ada Masalah

1. **Cek apakah message terkirim**:
   - Market mengirim `OracleRequest::CreateQuery` via cross-chain message
   - Registry harus menerima sebagai `Message::OracleRequest`
   - Registry memproses via `handle_oracle_request()`

2. **Cek linera service logs**:
   - Apakah ada error saat memproses message?
   - Apakah message sampai ke Registry?

3. **Verifikasi Registry handler**:
   - `handle_oracle_request()` memanggil `handle_create_query_from_market()`
   - Query seharusnya dibuat dan callback dikirim kembali ke Market

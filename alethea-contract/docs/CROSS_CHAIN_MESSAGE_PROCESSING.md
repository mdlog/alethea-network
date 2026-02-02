# Cross-Chain Message Processing

## Perbedaan: Voting vs Cross-Chain Messages

### 1. Voting di Dashboard (Operations)
- **Cara kerja**: GraphQL mutations menggunakan `schedule_operation()`
- **Processing**: Otomatis di-execute oleh Linera service
- **Tidak perlu manual**: Operations langsung di-execute saat di-schedule
- **Contoh**: `revealVote`, `commitVote`, `submitVote`

### 2. Cross-Chain Messages (Market → Registry)
- **Cara kerja**: Market mengirim `OracleRequest` via `send_message()`
- **Processing**: 
  - **Otomatis** jika Linera service dengan ChainListener running
  - **Manual** jika ChainListener tidak running atau message stuck
- **Contoh**: `OracleRequest::CreateQuery` dari Market ke Registry

## Apakah Perlu Manual Processing?

### ✅ Tidak Perlu (Jika Linera Service Running dengan ChainListener)

Linera service dengan ChainListener akan **otomatis** memproses cross-chain messages:
- ChainListener mendeteksi `NewIncomingBundle` notifications
- Otomatis memanggil `process_inbox()` untuk chain yang di-track
- Messages diproses tanpa intervensi manual

### ⚠️ Perlu Manual (Jika Query Tidak Muncul)

Jika query tidak muncul setelah beberapa detik, kemungkinan:
1. **ChainListener tidak running** atau chain tidak di-track
2. **Message stuck di inbox** dan perlu manual processing
3. **Linera service perlu restart** untuk memproses messages

## Solusi: Process Registry Inbox

```bash
cd alethea-contract
./scripts/process-registry-inbox.sh
```

Atau manual:
```bash
# Stop linera service (untuk avoid lock)
pkill -f "linera service"

# Process Registry inbox
linera process-inbox --with-chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Start linera service lagi
linera service start
```

## Kesimpulan

**Tidak perlu manual processing seperti voting** karena:
- Voting adalah operations yang di-schedule (otomatis)
- Cross-chain messages seharusnya otomatis diproses oleh ChainListener
- Manual processing hanya diperlukan jika message stuck atau ChainListener tidak running

**Untuk Market Resolution**:
- `requestResolution` sudah berhasil ✅
- Cross-chain message terkirim ✅
- Tunggu beberapa detik untuk ChainListener memproses
- Jika tidak muncul, jalankan `process-registry-inbox.sh`

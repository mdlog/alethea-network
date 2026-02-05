# Faucet Troubleshooting Guide

## Problem: Faucet Request Sukses Tapi Token Tidak Masuk

### Penyebab
Ketika Anda request token dari faucet, token dikirim via **cross-chain message** dari treasury chain ke user chain Anda. Token tidak langsung masuk karena:

1. **Cross-chain message** perlu waktu untuk propagasi (5-10 detik)
2. **Inbox** di chain Anda perlu diproses untuk menerima message
3. Jika akses dari komputer lain, backend inbox processor tidak bisa diakses

### Solusi: Klik "Refresh Balance"

Setelah request faucet, **WAJIB klik tombol "Refresh Balance (Receive Tokens)"** untuk:
- Memproses inbox di chain Anda
- Menerima cross-chain message
- Update balance Anda

### Langkah-langkah:

1. **Request Tokens**
   - Klik tombol "Request ALTH Tokens"
   - Tunggu sampai muncul pesan "Tokens sent!"

2. **Refresh Balance** (PENTING!)
   - Klik tombol "Refresh Balance (Receive Tokens)"
   - Tunggu 2-3 detik
   - Balance Anda akan terupdate

3. **Jika Masih Belum Masuk**
   - Tunggu 10-15 detik
   - Klik "Refresh Balance" lagi
   - Atau gunakan "Force Process Inbox" di Debug Info

### Cara Kerja Cross-Chain Transfer

```
Treasury Chain (Token Source)
    ↓
    Transfer mutation (HTTP)
    ↓
Cross-Chain Message (5-10s propagation)
    ↓
User Chain Inbox (waiting)
    ↓
Process Inbox (triggered by Refresh Balance)
    ↓
Token Received! ✅
```

### Debug: Force Process Inbox

Jika token masih belum masuk setelah beberapa kali refresh:

1. Scroll ke bawah di Token Faucet card
2. Klik "Debug Info (click to expand)"
3. Klik tombol "Force Process Inbox"
4. Tunggu response
5. Klik "Refresh Balance" lagi

### Untuk Admin: Enable Remote Inbox Processing

Jika ingin inbox auto-process dari komputer lain, edit `alethea-dashboard-vite/server/inbox-processor.js`:

```javascript
// Ganti dari:
const PORT = 4003;
app.listen(PORT, 'localhost', () => {
    console.log(`✅ Inbox processor running on http://localhost:${PORT}`);
});

// Menjadi:
const PORT = 4003;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Inbox processor running on http://0.0.0.0:${PORT}`);
});
```

Kemudian restart server:
```bash
cd alethea-dashboard-vite
npm run dev
```

### Alternatif: Auto-Process via Cron

Setup cron job untuk auto-process inbox setiap 30 detik:

```bash
# Edit crontab
crontab -e

# Tambahkan:
* * * * * /path/to/alethea-network/alethea-contract/scripts/process-inbox-safe.sh >> /tmp/inbox-cron.log 2>&1
```

## FAQ

**Q: Berapa lama token masuk setelah request?**
A: Biasanya 5-15 detik setelah klik "Refresh Balance"

**Q: Kenapa harus klik Refresh Balance?**
A: Karena cross-chain message perlu diproses di inbox chain Anda. Refresh Balance trigger proses ini.

**Q: Bisa auto-process tanpa klik?**
A: Bisa, tapi perlu setup backend yang accessible dari luar atau cron job.

**Q: Token hilang?**
A: Tidak hilang! Token ada di inbox, tinggal diproses. Klik "Force Process Inbox" di Debug Info.

**Q: Cooldown berapa lama?**
A: 24 jam per chain. Setelah 24 jam bisa request lagi.

## Technical Details

### Inbox Processing Methods

1. **WASM Query** (Recommended)
   - Query balance via WASM automatically processes inbox
   - Triggered by "Refresh Balance" button
   - Works from any computer

2. **Backend HTTP** (Local only)
   - POST to `/process-inbox-retry`
   - Only works if backend accessible
   - Used by faucet component

3. **Manual CLI** (Admin)
   ```bash
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -d '{"query": "mutation { processInbox(chainId: \"YOUR_CHAIN_ID\") }"}'
   ```

### Environment Variables

```bash
# Treasury configuration
VITE_ADMIN_OWNER=0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7
VITE_TOKEN_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
```

## Monitoring

Check inbox status:
```bash
# Via GraphQL
curl -X POST http://localhost:8080/chains/YOUR_CHAIN_ID/applications/YOUR_APP_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ inbox { messages { id } } }"}'
```

Check balance:
```bash
curl -X POST http://localhost:8080/chains/YOUR_CHAIN_ID/applications/TOKEN_APP_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ balance(owner: \"YOUR_OWNER\") }"}'
```

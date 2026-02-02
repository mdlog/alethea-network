# Cara Membuat Query untuk Testing

## ✅ Metode 1: Via Dashboard (RECOMMENDED)

1. **Buka Dashboard**: http://localhost:5173
2. **Pergi ke halaman "Queries"**
3. **Klik tab "Create Query"**
4. **Isi form**:
   - **Description**: `Did Bitcoin reach $50,000 on January 1, 2025?`
   - **Outcomes**: `Yes, No` (pisahkan dengan koma atau enter)
   - **Duration**: `300` seconds (5 menit untuk testing cepat)
5. **Klik "Create Query"**

## 📋 Query Details untuk Testing

- **Description**: Past event yang mudah di-resolve
- **Outcomes**: `Yes, No`
- **Strategy**: `WeightedByStake` (default dari dashboard)
- **Min Votes**: `1` (default)
- **Reward**: `100` ALTH (default)
- **Duration**: `300` seconds (5 menit)

## 🔄 Testing Flow Setelah Query Dibuat

1. ✅ **Query Created** → Query ID muncul
2. 📝 **Commit Vote** → Pilih "Yes" atau "No", commit
3. 🔓 **Reveal Vote** → Setelah commit phase, reveal vote
4. ⏰ **Wait Deadline** → Tunggu deadline (5 menit)
5. ✅ **Resolve Query** → Klik "Resolve" di dashboard
6. 💰 **Check Escrow** → Verifikasi escrow balance bertambah!

## 🎯 Verifikasi Reward Minting

Setelah query di-resolve, jalankan:

```bash
TOKEN_APP="5e98e799a48a40ac37d5bed51581892acc31030d6ce24b1cfb142c8835af27c2"
REGISTRY_APP="b08bd0587eb941b8db83fd7dffa32ad0ebd1a55eed0f9e0789b7cf02c402b9ff"
USER_CHAIN="261a42644361e57d94bf02f14dc359f7a93243f8e3ba6aa8163c4a7834834447"

# Check escrow balance (should increase after resolve!)
curl -s "http://localhost:8080/chains/${USER_CHAIN}/applications/${TOKEN_APP}" \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"query { registryBalance(registryAppId: \\\"${REGISTRY_APP}\\\") }\"}" | \
  jq -r '.data.registryBalance'
```

Escrow balance harus bertambah sesuai reward yang didistribusikan!

## ⚠️ Troubleshooting

Jika query creation gagal:
1. Pastikan `linera service` berjalan
2. Pastikan user sudah terdaftar sebagai voter
3. Refresh dashboard
4. Coba lagi dengan description yang berbeda

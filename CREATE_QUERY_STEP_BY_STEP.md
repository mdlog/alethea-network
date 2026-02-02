# 🎯 Cara Membuat Query - Step by Step

## ✅ Metode: Via Dashboard (RECOMMENDED & TESTED)

### Step 1: Buka Dashboard
```
http://localhost:5173
```

### Step 2: Navigate ke Queries Page
- Klik menu "Queries" di sidebar
- Atau langsung ke: http://localhost:5173/queries

### Step 3: Klik Tab "Create Query"
- Di halaman Queries, klik tab "Create Query" (biasanya di atas)

### Step 4: Isi Form Query
Isi dengan data berikut untuk testing:

```
Description: Did Bitcoin reach $50,000 on January 1, 2025?
Outcomes: Yes, No
Duration: 300 seconds (5 menit untuk testing cepat)
```

**Note:**
- Strategy, Min Votes, dan Reward akan menggunakan default dari dashboard
- Default biasanya: WeightedByStake, Min Votes: 1, Reward: 100 ALTH

### Step 5: Klik "Create Query"
- Klik button "Create Query"
- Tunggu beberapa detik untuk processing
- Query akan muncul di list "Active Queries"

### Step 6: Verifikasi Query Created
Setelah query dibuat, saya bisa membantu verifikasi dengan:
- Check query ID
- Check query details
- Test voting flow
- Verify reward minting setelah resolve

## 🔄 Testing Flow Setelah Query Dibuat

1. ✅ **Query Created** → Query ID muncul
2. 📝 **Commit Vote** → Pilih "Yes" atau "No", klik "Commit Vote"
3. 🔓 **Reveal Vote** → Setelah commit phase, klik "Reveal Vote"
4. ⏰ **Wait Deadline** → Tunggu deadline (5 menit)
5. ✅ **Resolve Query** → Klik "Resolve" button di dashboard
6. 💰 **Check Escrow** → Verifikasi escrow balance bertambah!

## 🎯 Verifikasi Reward Minting

Setelah query di-resolve, saya akan membantu verifikasi:
- Escrow balance bertambah sesuai reward
- Total supply bertambah
- User bisa claim rewards

## ⚠️ Troubleshooting

Jika query creation gagal:
1. Pastikan `linera service` berjalan
2. Pastikan user sudah terdaftar sebagai voter
3. Refresh dashboard
4. Cek console browser untuk error details

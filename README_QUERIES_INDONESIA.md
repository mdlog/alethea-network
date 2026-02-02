# 🎯 Panduan Membuat Query Peristiwa yang Sudah Terjadi

## 📚 Daftar File

1. **`create_past_events_queries_complete.sh`** - Script otomatis untuk membuat semua query
2. **`PAST_EVENTS_QUERIES_DETAIL.md`** - Dokumentasi lengkap semua query dengan detail
3. **`queries_for_dashboard.json`** - Data JSON untuk referensi dashboard
4. **`README_QUERIES_INDONESIA.md`** - Panduan ini

---

## 🚀 Cara Menggunakan

### Metode 1: Via Script Otomatis (RECOMMENDED)

Script ini akan membuat 16 query sekaligus dengan kategori berbeda.

```bash
# 1. Pastikan linera service berjalan
cd alethea-contract
linera service &

# 2. Kembali ke root directory
cd ..

# 3. Jalankan script
chmod +x create_past_events_queries_complete.sh
./create_past_events_queries_complete.sh
```

**Output yang diharapkan:**
- 16 query akan dibuat otomatis
- Setiap query akan menampilkan status sukses/gagal
- Query ID akan ditampilkan untuk setiap query yang berhasil

---

### Metode 2: Via Dashboard (Manual, Satu per Satu)

Jika ingin membuat query secara manual via dashboard:

1. **Buka Dashboard**
   ```
   http://localhost:5173/queries
   ```

2. **Klik "Create Query"**

3. **Pilih Query dari Dokumentasi**
   - Buka file `PAST_EVENTS_QUERIES_DETAIL.md`
   - Pilih query yang ingin dibuat
   - Copy detail query

4. **Isi Form Dashboard**
   - **Description**: Copy dari dokumentasi (termasuk link sumber)
   - **Outcomes**: `Ya, Tidak` (atau outcomes lain sesuai query)
   - **Duration**: `50400` (14 jam = 50400 detik)
   - **Strategy**: `WeightedByStake`
   - **Min Votes**: `3`
   - **Reward**: `100` ALTH

5. **Submit**

---

### Metode 3: Via GraphQL (Advanced)

Untuk developer yang ingin menggunakan GraphQL langsung:

```bash
# Load environment variables
source alethea-dashboard-vite/.env.local

# Create query via GraphQL
curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Apakah Prabowo Subianto memenangkan Pemilihan Presiden Indonesia 2024 pada putaran pertama (14 Februari 2024)? Resolusi berdasarkan hasil resmi KPU yang diumumkan pada 20 Maret 2024. Sumber: https://pemilu2024.kpu.go.id/ dan https://www.bbc.com/indonesia/articles/c511z3z3z3zo\", outcomes: [\"Ya\", \"Tidak\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 50400) { success message queryId } }"
  }'
```

---

## 📋 Daftar Query yang Tersedia

### 🏛️ Politik (3 Query)
1. **Pemilu Indonesia 2024** - Prabowo menang putaran pertama
2. **Trump-Biden Debate** - Debat 27 Juni 2024
3. **UK General Election** - Labour menang dengan mayoritas

### ₿ Kripto (4 Query)
4. **Bitcoin Spot ETF** - SEC approval 10 Januari 2024
5. **Ethereum Dencun** - Upgrade 13 Maret 2024
6. **Bitcoin Halving** - Block 840,000 pada April 2024
7. **Solana $200** - Harga mencapai $200 di Maret 2024

### 💻 Teknologi (4 Query)
8. **GPT-4 Turbo** - Launch 6 November 2023
9. **Apple Vision Pro** - Launch 2 Februari 2024
10. **Google Gemini Ultra** - Launch 8 Februari 2024
11. **Meta Quest 3** - Launch 10 Oktober 2023

### ⚽ Sport (5 Query)
12. **Super Bowl LVIII** - Chiefs menang 11 Februari 2024
13. **Copa America 2024** - Argentina juara
14. **UEFA Euro 2024** - Spanyol juara
15. **Paris Olympics 2024** - AS juara umum
16. **NBA Finals 2024** - Boston Celtics juara

---

## ⚙️ Konfigurasi Query

Semua query menggunakan konfigurasi yang sama:

| Parameter | Nilai | Keterangan |
|-----------|-------|------------|
| **Commit Duration** | 43,200 detik | 12 jam untuk commit vote |
| **Reveal Duration** | 7,200 detik | 2 jam untuk reveal vote |
| **Total Duration** | 50,400 detik | 14 jam total |
| **Strategy** | WeightedByStake | Vote dibobot berdasarkan stake |
| **Min Votes** | 3 | Minimal 3 voter |
| **Reward** | 100 ALTH | Reward untuk voter yang benar |

---

## 🔍 Fitur Khusus Query Ini

### 1. **Peristiwa yang Sudah Terjadi**
Semua query menggunakan peristiwa yang sudah terjadi sebelum 2 Februari 2026, sehingga:
- Mudah untuk di-resolve
- Jawaban sudah pasti
- Bisa langsung testing voting dan resolution

### 2. **Link Rujukan di Description**
Setiap query memiliki link sumber yang jelas di dalam description, contoh:
```
"Apakah Prabowo Subianto memenangkan Pemilihan Presiden Indonesia 2024...
Sumber: https://pemilu2024.kpu.go.id/ dan https://www.bbc.com/indonesia/..."
```

Ini memastikan:
- Voter tahu sumber data yang valid
- Resolution berdasarkan sumber yang sama
- Tidak ada ambiguitas dalam resolusi

### 3. **Durasi yang Realistis**
- **12 jam commit**: Cukup waktu untuk voter di berbagai timezone
- **2 jam reveal**: Cukup untuk reveal tapi tidak terlalu lama
- **Total 14 jam**: Balance antara testing dan production

### 4. **Kategori Beragam**
Query mencakup 4 kategori berbeda:
- Politik (pemilu, debat, election)
- Kripto (ETF, upgrade, halving, price)
- Teknologi (AI, VR, product launch)
- Sport (Super Bowl, World Cup, Olympics)

---

## 📊 Workflow Setelah Query Dibuat

### 1. Commit Phase (12 jam pertama)
```bash
# Voter commit vote mereka
# Via dashboard: Pilih query → Pilih outcome → Klik "Commit Vote"
```

### 2. Reveal Phase (2 jam setelah commit)
```bash
# Voter reveal vote mereka
# Via dashboard: Pilih query → Klik "Reveal Vote"
```

### 3. Resolution (Setelah deadline)
```bash
# Admin atau siapa saja bisa resolve
# Via dashboard: Pilih query → Klik "Resolve Query"
```

### 4. Claim Rewards
```bash
# Voter yang benar bisa claim reward
# Via dashboard: Lihat balance bertambah otomatis
```

---

## 🔧 Troubleshooting

### Query tidak muncul setelah dibuat

```bash
# Sync dan process inbox
cd alethea-contract
linera sync
linera process-inbox
```

### Error: "Operation execution failed"

**Penyebab umum:**
1. Linera service tidak berjalan
2. Chain belum sync
3. Configuration salah

**Solusi:**
```bash
# 1. Restart linera service
pkill linera
cd alethea-contract
linera service &

# 2. Sync chain
linera sync && linera process-inbox

# 3. Check configuration
cat alethea-dashboard-vite/.env.local
```

### Query dibuat tapi tidak bisa vote

**Penyebab:**
- Belum terdaftar sebagai voter
- Balance tidak cukup untuk staking

**Solusi:**
```bash
# Check apakah sudah terdaftar sebagai voter
curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address isActive } }"}'

# Jika belum, register sebagai voter via dashboard
```

### Duration terlalu pendek/panjang

Jika ingin mengubah duration:

**Via Script:**
Edit file `create_past_events_queries_complete.sh`:
```bash
COMMIT_DURATION=43200  # Ubah sesuai kebutuhan (dalam detik)
REVEAL_DURATION=7200   # Ubah sesuai kebutuhan (dalam detik)
```

**Via Dashboard:**
Ubah nilai di field "Duration" saat create query.

---

## 📈 Monitoring Query

### Check semua queries
```bash
curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status outcomes deadline } }"}'
```

### Check specific query
```bash
curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ query(id: 1) { id description status votes { voter outcome } } }"}'
```

### Via Dashboard
Buka: `http://localhost:5173/queries`

---

## 💡 Tips

1. **Buat query secara bertahap**
   - Jangan buat semua 16 query sekaligus jika baru testing
   - Mulai dengan 2-3 query untuk testing workflow

2. **Gunakan kategori yang berbeda**
   - Test dengan query dari kategori berbeda
   - Pastikan resolution criteria jelas untuk setiap kategori

3. **Verifikasi link sumber**
   - Pastikan link sumber masih aktif
   - Gunakan archive.org jika link sudah tidak aktif

4. **Test voting flow**
   - Test commit → reveal → resolve flow
   - Verifikasi reward distribution

5. **Monitor gas/fees**
   - Check balance sebelum create banyak query
   - Pastikan ada cukup token untuk fees

---

## 📞 Support

Jika ada masalah:

1. **Check logs**
   ```bash
   # Linera service logs
   tail -f alethea-contract/linera-service.log
   ```

2. **Check documentation**
   - `PAST_EVENTS_QUERIES_DETAIL.md` - Detail semua query
   - `CREATE_QUERY_GUIDE.md` - Panduan umum create query
   - `CREATE_QUERY_STEP_BY_STEP.md` - Step by step guide

3. **Restart services**
   ```bash
   # Restart linera service
   pkill linera
   cd alethea-contract
   linera service &
   
   # Restart dashboard
   cd alethea-dashboard-vite
   npm run dev
   ```

---

## ✅ Checklist

Sebelum membuat query, pastikan:

- [ ] Linera service berjalan (`linera service &`)
- [ ] Dashboard berjalan (`npm run dev`)
- [ ] Configuration sudah benar (`.env.local`)
- [ ] Chain sudah sync (`linera sync`)
- [ ] Inbox sudah diproses (`linera process-inbox`)
- [ ] Sudah terdaftar sebagai voter (jika ingin vote)
- [ ] Balance cukup untuk fees

---

## 🎉 Selamat!

Sekarang Anda siap membuat query dengan peristiwa yang sudah terjadi untuk testing Alethea Oracle!

**Next Steps:**
1. Jalankan script untuk create queries
2. Test voting flow (commit → reveal)
3. Test resolution
4. Verify reward distribution

Good luck! 🚀

# 🚀 CLI Commands - Copy Paste untuk Membuat Query

## 📁 File yang Tersedia

1. **`COPY_PASTE_COMMANDS.txt`** ⭐ - File utama dengan semua command siap copy-paste
2. **`CREATE_QUERIES_CLI.sh`** - Script bash (alternatif)
3. **`queries_january_2026_english.json`** - Data JSON lengkap

---

## ⚡ Quick Start (Paling Mudah!)

### Step 1: Setup Environment (Sekali saja)

Buka terminal dan jalankan:

```bash
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"
```

### Step 2: Buka File COPY_PASTE_COMMANDS.txt

```bash
cat COPY_PASTE_COMMANDS.txt
```

Atau buka dengan text editor favorit Anda.

### Step 3: Copy-Paste Command yang Diinginkan

Pilih query yang ingin dibuat, copy command-nya, dan paste ke terminal.

**Contoh - Membuat Query #1 (Bitcoin):**

```bash
curl -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createQuery(description: \"Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?\", outcomes: [\"Yes, above $95,000\", \"No, below $95,000\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'
```

### Step 4: Tunggu Response

Anda akan melihat response seperti:

```json
{
  "data": {
    "createQuery": {
      "success": true,
      "message": "Query created successfully",
      "queryId": "1"
    }
  }
}
```

### Step 5: Ulangi untuk Query Lain

Copy-paste command lain dari file untuk membuat query berikutnya.

---

## 📋 Daftar 14 Query yang Tersedia

### Crypto (4 queries)
1. ✅ Bitcoin Price January 1, 2026
2. ✅ Ethereum Price January 2, 2026
3. ✅ Total Crypto Market Cap January 1, 2026
4. ✅ Solana Price January 3, 2026

### Technology (3 queries)
5. ✅ GitHub Status January 1, 2026
6. ✅ Apple Stock Price January 2, 2026
7. ✅ Tesla Stock Price January 3, 2026

### Sports (3 queries)
8. ✅ Premier League Match January 1, 2026
9. ✅ NBA Games January 2, 2026
10. ✅ La Liga Match January 3, 2026

### Others (4 queries)
11. ✅ New Year Celebration 2026
12. ✅ Tokyo Weather January 2, 2026
13. ✅ USD/IDR Exchange Rate January 3, 2026
14. ✅ Bitcoin Daily Volume January 1, 2026

---

## 🎯 Contoh Lengkap

```bash
# 1. Setup (sekali saja)
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"

# 2. Buat Query #1 (Bitcoin)
curl -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createQuery(description: \"Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?\", outcomes: [\"Yes, above $95,000\", \"No, below $95,000\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

# 3. Tunggu response, lalu buat query berikutnya
curl -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createQuery(description: \"Did Ethereum (ETH) reach or exceed $3,500 USD on January 2, 2026?\", outcomes: [\"Yes, reached $3,500+\", \"No, below $3,500\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

# ... dan seterusnya
```

---

## 🔍 Verifikasi Query yang Dibuat

### Via Dashboard
```
http://localhost:5173/queries
```

### Via CLI
```bash
curl -X POST "${REGISTRY_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status outcomes } }"}'
```

---

## ⚙️ Parameter Query

Semua query menggunakan parameter yang sama:

| Parameter | Nilai | Keterangan |
|-----------|-------|------------|
| **Duration** | 86400 detik | 24 jam (12h commit + 12h reveal) |
| **Strategy** | WeightedByStake | Vote dibobot berdasarkan stake |
| **Min Votes** | 3 | Minimal 3 voter |
| **Reward** | 100 ALTH | 100000000000000000000 (18 decimals) |

---

## 💡 Tips

1. **Setup sekali saja** - Environment variables cukup di-set sekali per session
2. **Copy-paste hati-hati** - Pastikan seluruh command ter-copy (termasuk backslash `\`)
3. **Tunggu response** - Verifikasi query berhasil dibuat sebelum lanjut
4. **Tidak perlu semua** - Buat query sesuai kebutuhan, tidak harus 14 sekaligus
5. **Check dashboard** - Verifikasi query muncul di dashboard

---

## ⚠️ Troubleshooting

### Error: "REGISTRY_ENDPOINT not set"
```bash
# Jalankan setup lagi
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"
```

### Error: "Connection refused"
```bash
# Pastikan linera service berjalan
cd alethea-contract
linera service &
```

### Query tidak muncul di dashboard
```bash
# Sync dan process inbox
linera sync && linera process-inbox
```

### Response error
- Check apakah linera service berjalan
- Verifikasi .env.local configuration
- Refresh dashboard dan coba lagi

---

## 📊 Progress Tracker

Gunakan checklist ini untuk track query yang sudah dibuat:

```
[ ] Query #1: Bitcoin Price
[ ] Query #2: Ethereum Price
[ ] Query #3: Market Cap
[ ] Query #4: Solana Price
[ ] Query #5: GitHub Status
[ ] Query #6: Apple Stock
[ ] Query #7: Tesla Stock
[ ] Query #8: Premier League
[ ] Query #9: NBA Games
[ ] Query #10: La Liga
[ ] Query #11: New Year
[ ] Query #12: Tokyo Weather
[ ] Query #13: USD/IDR
[ ] Query #14: Bitcoin Volume
```

---

## 🎉 Selesai!

Sekarang Anda bisa membuat query dengan mudah:
1. ✅ Setup environment (sekali)
2. ✅ Copy command dari file
3. ✅ Paste ke terminal
4. ✅ Tunggu response
5. ✅ Ulangi untuk query lain

**Semua query siap di-resolve karena peristiwa sudah terjadi!** 🚀

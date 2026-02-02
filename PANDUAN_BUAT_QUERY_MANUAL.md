# 📝 Panduan Membuat Query Manual (Satu per Satu)

## 🎯 Cara Menggunakan

### Step 1: Buka Dashboard
```
http://localhost:5173/queries
```

### Step 2: Klik "Create Query"

### Step 3: Isi Form dengan Data dari JSON

Buka file `queries_january_2026_manual.json` dan pilih query yang ingin dibuat.

---

## 📋 Template Form Dashboard

Untuk setiap query, isi field berikut:

### Field Wajib:

1. **Description** (Pertanyaan Utama)
   - Copy dari field `description` di JSON
   - Contoh: `Apakah harga Bitcoin (BTC) berada di atas $95,000 USD pada 1 Januari 2026 pukul 00:00 UTC?`

2. **Outcomes** (Pilihan Jawaban)
   - Copy dari field `outcomes` di JSON
   - Pisahkan dengan koma atau enter
   - Contoh: `Ya, di atas $95,000` dan `Tidak, di bawah $95,000`

3. **Duration** (Durasi)
   - Isi: `86400` (24 jam)

4. **Strategy**
   - Pilih: `WeightedByStake`

5. **Min Votes**
   - Isi: `3`

6. **Reward Amount**
   - Isi: `100` (ALTH)

### Field Opsional (Jika Dashboard Support):

7. **Title**
   - Copy dari field `title` di JSON
   - Contoh: `Bitcoin Price 1 Januari 2026`

8. **Category**
   - Copy dari field `category` di JSON
   - Contoh: `Kripto`

9. **Context**
   - Copy dari field `context` di JSON

10. **Resolution Criteria**
    - Copy dari field `resolution_criteria` di JSON

11. **Source URLs**
    - Copy dari field `source_urls` di JSON

12. **Tags**
    - Copy dari field `tags` di JSON

---

## 🔢 Query #1: Bitcoin Price 1 Januari 2026

### Copy-Paste ke Dashboard:

**Description:**
```
Apakah harga Bitcoin (BTC) berada di atas $95,000 USD pada 1 Januari 2026 pukul 00:00 UTC?
```

**Outcomes:**
```
Ya, di atas $95,000
Tidak, di bawah $95,000
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Bitcoin Price 1 Januari 2026
```

**Category (opsional):**
```
Kripto
```

**Context (opsional):**
```
Bitcoin mengalami volatilitas di akhir 2025 dan awal 2026. Query ini memverifikasi harga BTC pada awal tahun 2026 berdasarkan data historis yang sudah tersedia.
```

**Resolution Criteria (opsional):**
```
Resolusi berdasarkan harga penutupan Bitcoin pada 1 Januari 2026 pukul 00:00 UTC dari CoinGecko. Gunakan harga BTC/USD pada timestamp tersebut.
```

**Source URLs (opsional):**
```
https://www.coingecko.com/en/coins/bitcoin, https://coinmarketcap.com/currencies/bitcoin/historical-data/
```

---

## 🔢 Query #2: Ethereum Price 2 Januari 2026

**Description:**
```
Apakah harga Ethereum (ETH) mencapai atau melampaui $3,500 USD pada 2 Januari 2026?
```

**Outcomes:**
```
Ya, mencapai $3,500+
Tidak, di bawah $3,500
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Ethereum Price 2 Januari 2026
```

**Category (opsional):**
```
Kripto
```

**Context (opsional):**
```
Ethereum menunjukkan pergerakan harga yang menarik di awal 2026. Query ini memverifikasi apakah ETH mencapai level $3,500 pada 2 Januari 2026.
```

**Resolution Criteria (opsional):**
```
Resolusi berdasarkan harga tertinggi (high) Ethereum pada 2 Januari 2026 dari CoinGecko atau CoinMarketCap. ETH harus mencapai atau melampaui $3,500 kapan saja di tanggal tersebut.
```

**Source URLs (opsional):**
```
https://www.coingecko.com/en/coins/ethereum, https://coinmarketcap.com/currencies/ethereum/historical-data/
```

---

## 🔢 Query #3: Total Crypto Market Cap 1 Januari 2026

**Description:**
```
Apakah total market cap cryptocurrency melebihi $3.2 triliun USD pada 1 Januari 2026?
```

**Outcomes:**
```
Ya, di atas $3.2T
Tidak, di bawah $3.2T
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Total Crypto Market Cap 1 Januari 2026
```

**Category (opsional):**
```
Kripto
```

**Source URLs (opsional):**
```
https://www.coingecko.com/en/global-charts, https://coinmarketcap.com/charts/
```

---

## 🔢 Query #4: Solana Price 3 Januari 2026

**Description:**
```
Apakah harga Solana (SOL) berada di atas $180 USD pada 3 Januari 2026?
```

**Outcomes:**
```
Ya, di atas $180
Tidak, di bawah $180
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Solana Price 3 Januari 2026
```

**Category (opsional):**
```
Kripto
```

**Source URLs (opsional):**
```
https://www.coingecko.com/en/coins/solana, https://coinmarketcap.com/currencies/solana/historical-data/
```

---

## 🔢 Query #5: GitHub Status 1 Januari 2026

**Description:**
```
Apakah GitHub mengalami outage atau incident pada 1 Januari 2026?
```

**Outcomes:**
```
Ya, ada outage/incident
Tidak, tidak ada gangguan
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
GitHub Status 1 Januari 2026
```

**Category (opsional):**
```
Teknologi
```

**Source URLs (opsional):**
```
https://www.githubstatus.com/, https://www.githubstatus.com/history
```

---

## 🔢 Query #6: Apple Stock Price 2 Januari 2026

**Description:**
```
Apakah harga saham Apple (AAPL) ditutup di atas $230 USD pada 2 Januari 2026?
```

**Outcomes:**
```
Ya, di atas $230
Tidak, di bawah $230
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Apple Stock Price 2 Januari 2026
```

**Category (opsional):**
```
Teknologi
```

**Source URLs (opsional):**
```
https://finance.yahoo.com/quote/AAPL/, https://www.nasdaq.com/market-activity/stocks/aapl
```

---

## 🔢 Query #7: Tesla Stock Price 3 Januari 2026

**Description:**
```
Apakah harga saham Tesla (TSLA) mencapai atau melampaui $400 USD pada 3 Januari 2026?
```

**Outcomes:**
```
Ya, mencapai $400+
Tidak, di bawah $400
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Tesla Stock Price 3 Januari 2026
```

**Category (opsional):**
```
Teknologi
```

**Source URLs (opsional):**
```
https://finance.yahoo.com/quote/TSLA/, https://www.nasdaq.com/market-activity/stocks/tsla
```

---

## 🔢 Query #8: Premier League Match 1 Januari 2026

**Description:**
```
Apakah ada pertandingan Premier League yang berlangsung pada 1 Januari 2026?
```

**Outcomes:**
```
Ya, ada pertandingan
Tidak, tidak ada pertandingan
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Premier League Match 1 Januari 2026
```

**Category (opsional):**
```
Sport
```

**Source URLs (opsional):**
```
https://www.premierleague.com/fixtures, https://www.espn.com/soccer/fixtures/_/league/eng.1
```

---

## 🔢 Query #9: NBA Games 2 Januari 2026

**Description:**
```
Apakah ada minimal 5 pertandingan NBA yang berlangsung pada 2 Januari 2026?
```

**Outcomes:**
```
Ya, 5+ pertandingan
Tidak, kurang dari 5
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
NBA Games 2 Januari 2026
```

**Category (opsional):**
```
Sport
```

**Source URLs (opsional):**
```
https://www.nba.com/schedule, https://www.espn.com/nba/schedule
```

---

## 🔢 Query #10: La Liga Match 3 Januari 2026

**Description:**
```
Apakah Real Madrid atau Barcelona bermain di La Liga pada 3 Januari 2026?
```

**Outcomes:**
```
Ya, salah satu bermain
Tidak, keduanya tidak bermain
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
La Liga Match 3 Januari 2026
```

**Category (opsional):**
```
Sport
```

**Source URLs (opsional):**
```
https://www.laliga.com/en-GB/fixtures, https://www.espn.com/soccer/fixtures/_/league/esp.1
```

---

## 🔢 Query #11: Perayaan Tahun Baru 2026

**Description:**
```
Apakah perayaan kembang api Tahun Baru berlangsung di Times Square, New York pada 1 Januari 2026?
```

**Outcomes:**
```
Ya, berlangsung
Tidak, dibatalkan
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Perayaan Tahun Baru 2026
```

**Category (opsional):**
```
Politik
```

**Source URLs (opsional):**
```
https://www.timessquarenyc.org/times-square-new-years-eve, https://www.cnn.com/, https://www.bbc.com/news
```

---

## 🔢 Query #12: Cuaca Tokyo 2 Januari 2026

**Description:**
```
Apakah suhu udara di Tokyo, Jepang berada di bawah 10°C pada 2 Januari 2026?
```

**Outcomes:**
```
Ya, di bawah 10°C
Tidak, 10°C atau lebih
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Cuaca Tokyo 2 Januari 2026
```

**Category (opsional):**
```
Politik
```

**Source URLs (opsional):**
```
https://www.jma.go.jp/jma/indexe.html, https://weather.com/weather/today/l/Tokyo+Japan
```

---

## 🔢 Query #13: Kurs USD/IDR 3 Januari 2026

**Description:**
```
Apakah kurs USD/IDR berada di atas Rp 16,000 pada 3 Januari 2026?
```

**Outcomes:**
```
Ya, di atas Rp 16,000
Tidak, di bawah Rp 16,000
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (opsional):**
```
Kurs USD/IDR 3 Januari 2026
```

**Category (opsional):**
```
Politik
```

**Source URLs (opsional):**
```
https://www.bi.go.id/id/statistik/informasi-kurs/default.aspx, https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=IDR
```

---

## 💡 Tips

1. **Mulai dari Query Sederhana**
   - Coba buat 1-2 query dulu untuk testing
   - Verifikasi query berhasil dibuat sebelum lanjut

2. **Copy-Paste dengan Hati-hati**
   - Pastikan tidak ada karakter aneh
   - Cek format outcomes (pisahkan dengan koma)

3. **Verifikasi Setelah Submit**
   - Cek apakah query muncul di list
   - Verifikasi detail query benar

4. **Buat Bertahap**
   - Tidak perlu buat semua 14 query sekaligus
   - Buat sesuai kebutuhan testing

---

## ⚠️ Troubleshooting

### Query tidak muncul setelah submit
```bash
linera sync && linera process-inbox
```

### Error saat submit
- Refresh dashboard
- Coba lagi dengan query yang lebih sederhana
- Check console browser untuk error details

### Field tidak tersedia
- Jika dashboard tidak support field tertentu, skip saja
- Field wajib: Description, Outcomes, Duration

---

## 📊 Progress Tracker

Gunakan checklist ini untuk track query yang sudah dibuat:

- [ ] Query #1: Bitcoin Price 1 Jan
- [ ] Query #2: Ethereum Price 2 Jan
- [ ] Query #3: Total Market Cap 1 Jan
- [ ] Query #4: Solana Price 3 Jan
- [ ] Query #5: GitHub Status 1 Jan
- [ ] Query #6: Apple Stock 2 Jan
- [ ] Query #7: Tesla Stock 3 Jan
- [ ] Query #8: Premier League 1 Jan
- [ ] Query #9: NBA Games 2 Jan
- [ ] Query #10: La Liga 3 Jan
- [ ] Query #11: Tahun Baru Times Square
- [ ] Query #12: Cuaca Tokyo 2 Jan
- [ ] Query #13: Kurs USD/IDR 3 Jan

---

**Selamat membuat query!** 🚀

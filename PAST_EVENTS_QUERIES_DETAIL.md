# 📋 Daftar Query Peristiwa yang Sudah Terjadi

## ⚙️ Konfigurasi Query

- **Commit Duration**: 12 jam (43,200 detik)
- **Reveal Duration**: 2 jam (7,200 detik)
- **Total Duration**: 14 jam (50,400 detik)
- **Strategy**: WeightedByStake
- **Min Votes**: 3
- **Reward**: 100 ALTH

---

## 🏛️ KATEGORI: POLITIK (3 Queries)

### 1. Pemilu Indonesia 2024 - Prabowo Menang

**Title**: `Pemilu Indonesia 2024 - Prabowo Menang`

**Description**: 
```
Apakah Prabowo Subianto memenangkan Pemilihan Presiden Indonesia 2024 pada putaran pertama (14 Februari 2024)? 
Resolusi berdasarkan hasil resmi KPU yang diumumkan pada 20 Maret 2024.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Politik`

**Resolution Criteria**:
- Berdasarkan hasil resmi KPU (Komisi Pemilihan Umum)
- Prabowo harus mendapat >50% suara untuk menang putaran pertama
- Pengumuman resmi: 20 Maret 2024

**Source URLs**:
- https://pemilu2024.kpu.go.id/
- https://www.bbc.com/indonesia/articles/c511z3z3z3zo

**Expected Answer**: `Ya` (Prabowo menang dengan ~58% suara)

---

### 2. Trump-Biden Debate Juni 2024

**Title**: `Trump-Biden Debate Juni 2024`

**Description**: 
```
Apakah debat presiden AS antara Donald Trump dan Joe Biden berlangsung pada 27 Juni 2024? 
Resolusi berdasarkan laporan resmi dari CNN yang menjadi host debat.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Politik`

**Resolution Criteria**:
- Debat harus berlangsung pada tanggal 27 Juni 2024
- Diselenggarakan oleh CNN
- Kedua kandidat hadir dan berpartisipasi

**Source URLs**:
- https://www.cnn.com/politics/live-news/cnn-presidential-debate-06-27-24/
- https://www.nytimes.com/live/2024/06/27/us/biden-trump-debate

**Expected Answer**: `Ya` (Debat berlangsung sesuai jadwal)

---

### 3. UK General Election 2024 - Labour Menang

**Title**: `UK General Election 2024 - Labour Menang`

**Description**: 
```
Apakah Partai Labour memenangkan UK General Election pada 4 Juli 2024 dengan mayoritas mutlak? 
Resolusi berdasarkan hasil resmi Electoral Commission UK.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Politik`

**Resolution Criteria**:
- Pemilu berlangsung 4 Juli 2024
- Labour harus menang dengan mayoritas mutlak (>326 kursi dari 650)
- Berdasarkan hasil resmi Electoral Commission

**Source URLs**:
- https://www.electoralcommission.org.uk/
- https://www.bbc.com/news/election/2024/uk/results

**Expected Answer**: `Ya` (Labour menang dengan 411 kursi)

---

## ₿ KATEGORI: KRIPTO (4 Queries)

### 4. Bitcoin Spot ETF Approval 2024

**Title**: `Bitcoin Spot ETF Approval 2024`

**Description**: 
```
Apakah SEC (Securities and Exchange Commission) menyetujui Bitcoin Spot ETF pada 10 Januari 2024? 
Resolusi berdasarkan pengumuman resmi SEC.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Kripto`

**Resolution Criteria**:
- SEC harus menyetujui minimal 1 Bitcoin Spot ETF
- Persetujuan pada atau sebelum 10 Januari 2024
- Berdasarkan press release resmi SEC

**Source URLs**:
- https://www.sec.gov/news/press-release/2024-6
- https://www.coindesk.com/policy/2024/01/10/sec-approves-spot-bitcoin-etfs/

**Expected Answer**: `Ya` (SEC menyetujui 11 Bitcoin Spot ETF)

---

### 5. Ethereum Dencun Upgrade Maret 2024

**Title**: `Ethereum Dencun Upgrade Maret 2024`

**Description**: 
```
Apakah Ethereum Dencun upgrade (EIP-4844) berhasil diaktifkan pada 13 Maret 2024? 
Resolusi berdasarkan data blockchain Ethereum resmi.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Kripto`

**Resolution Criteria**:
- Upgrade Dencun (EIP-4844) harus aktif
- Aktivasi pada 13 Maret 2024
- Verifikasi melalui Etherscan dan node Ethereum

**Source URLs**:
- https://etherscan.io/
- https://ethereum.org/en/roadmap/dencun/

**Expected Answer**: `Ya` (Dencun upgrade berhasil diaktifkan)

---

### 6. Bitcoin Halving April 2024

**Title**: `Bitcoin Halving April 2024`

**Description**: 
```
Apakah Bitcoin halving (block reward berkurang dari 6.25 BTC menjadi 3.125 BTC) terjadi pada 19-20 April 2024 di block 840,000? 
Resolusi berdasarkan data blockchain Bitcoin.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Kripto`

**Resolution Criteria**:
- Halving terjadi di block 840,000
- Tanggal: 19-20 April 2024
- Block reward berkurang dari 6.25 BTC ke 3.125 BTC

**Source URLs**:
- https://www.blockchain.com/explorer/blocks/btc/840000
- https://bitcoinblockhalf.com/

**Expected Answer**: `Ya` (Halving terjadi pada 20 April 2024)

---

### 7. Solana Mencapai $200 di 2024

**Title**: `Solana Mencapai $200 di 2024`

**Description**: 
```
Apakah harga Solana (SOL) mencapai atau melampaui $200 USD pada bulan Maret 2024? 
Resolusi berdasarkan data harga dari CoinGecko dan CoinMarketCap.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Kripto`

**Resolution Criteria**:
- Harga SOL/USD harus mencapai atau melampaui $200
- Periode: Maret 2024 (1-31 Maret)
- Berdasarkan data dari CoinGecko dan CoinMarketCap

**Source URLs**:
- https://www.coingecko.com/en/coins/solana
- https://coinmarketcap.com/currencies/solana/

**Expected Answer**: `Ya` (SOL mencapai ~$210 pada Maret 2024)

---

## 💻 KATEGORI: TEKNOLOGI (4 Queries)

### 8. OpenAI GPT-4 Turbo Launch 2023

**Title**: `OpenAI GPT-4 Turbo Launch 2023`

**Description**: 
```
Apakah OpenAI meluncurkan GPT-4 Turbo pada OpenAI DevDay tanggal 6 November 2023? 
Resolusi berdasarkan pengumuman resmi OpenAI.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Teknologi`

**Resolution Criteria**:
- GPT-4 Turbo diumumkan pada OpenAI DevDay
- Tanggal: 6 November 2023
- Berdasarkan blog post dan dokumentasi resmi OpenAI

**Source URLs**:
- https://openai.com/blog/new-models-and-developer-products-announced-at-devday
- https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4

**Expected Answer**: `Ya` (GPT-4 Turbo diluncurkan pada DevDay)

---

### 9. Apple Vision Pro Diluncurkan Februari 2024

**Title**: `Apple Vision Pro Diluncurkan Februari 2024`

**Description**: 
```
Apakah Apple Vision Pro resmi diluncurkan dan mulai dijual di AS pada 2 Februari 2024? 
Resolusi berdasarkan pengumuman resmi Apple.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Teknologi`

**Resolution Criteria**:
- Vision Pro mulai dijual di AS
- Tanggal: 2 Februari 2024
- Berdasarkan Apple Newsroom dan website resmi

**Source URLs**:
- https://www.apple.com/newsroom/2024/01/apple-vision-pro-available-february-2/
- https://www.apple.com/apple-vision-pro/

**Expected Answer**: `Ya` (Vision Pro diluncurkan 2 Februari 2024)

---

### 10. Google Gemini Ultra Launch 2024

**Title**: `Google Gemini Ultra Launch 2024`

**Description**: 
```
Apakah Google meluncurkan Gemini Ultra (model AI paling canggih) pada 8 Februari 2024? 
Resolusi berdasarkan pengumuman resmi Google.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Teknologi`

**Resolution Criteria**:
- Gemini Ultra diluncurkan untuk publik
- Tanggal: 8 Februari 2024
- Berdasarkan Google Blog dan DeepMind

**Source URLs**:
- https://blog.google/technology/ai/google-gemini-update-sundar-pichai-2024/
- https://deepmind.google/technologies/gemini/

**Expected Answer**: `Ya` (Gemini Ultra diluncurkan via Google One AI Premium)

---

### 11. Meta Quest 3 Diluncurkan Oktober 2023

**Title**: `Meta Quest 3 Diluncurkan Oktober 2023`

**Description**: 
```
Apakah Meta Quest 3 resmi diluncurkan dan mulai dijual pada 10 Oktober 2023? 
Resolusi berdasarkan pengumuman resmi Meta.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Teknologi`

**Resolution Criteria**:
- Quest 3 mulai dijual
- Tanggal: 10 Oktober 2023
- Berdasarkan Meta Newsroom

**Source URLs**:
- https://www.meta.com/quest/quest-3/
- https://about.fb.com/news/2023/09/meta-quest-3-mixed-reality-headset/

**Expected Answer**: `Ya` (Quest 3 diluncurkan 10 Oktober 2023)

---

## ⚽ KATEGORI: SPORT (5 Queries)

### 12. Super Bowl LVIII 2024 Winner

**Title**: `Super Bowl LVIII 2024 Winner`

**Description**: 
```
Apakah Kansas City Chiefs memenangkan Super Bowl LVIII melawan San Francisco 49ers pada 11 Februari 2024? 
Resolusi berdasarkan hasil resmi NFL.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Sport`

**Resolution Criteria**:
- Chiefs harus menang melawan 49ers
- Tanggal: 11 Februari 2024
- Berdasarkan hasil resmi NFL

**Source URLs**:
- https://www.nfl.com/super-bowl/
- https://www.espn.com/nfl/game/_/gameId/401671762

**Expected Answer**: `Ya` (Chiefs menang 25-22 overtime)

---

### 13. Copa America 2024 Winner

**Title**: `Copa America 2024 Winner`

**Description**: 
```
Apakah Argentina memenangkan Copa America 2024 yang berlangsung di AS (final 14 Juli 2024)? 
Resolusi berdasarkan hasil resmi CONMEBOL.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Sport`

**Resolution Criteria**:
- Argentina harus menang di final
- Tanggal final: 14 Juli 2024
- Berdasarkan hasil resmi CONMEBOL

**Source URLs**:
- https://www.conmebol.com/copaamerica/
- https://www.espn.com/soccer/copa-america/

**Expected Answer**: `Ya` (Argentina menang 1-0 vs Colombia)

---

### 14. UEFA Euro 2024 Winner

**Title**: `UEFA Euro 2024 Winner`

**Description**: 
```
Apakah Spanyol memenangkan UEFA Euro 2024 yang berlangsung di Jerman (final 14 Juli 2024)? 
Resolusi berdasarkan hasil resmi UEFA.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Sport`

**Resolution Criteria**:
- Spanyol harus menang di final
- Tanggal final: 14 Juli 2024
- Berdasarkan hasil resmi UEFA

**Source URLs**:
- https://www.uefa.com/euro2024/
- https://www.espn.com/soccer/uefa-euro/

**Expected Answer**: `Ya` (Spanyol menang 2-1 vs Inggris)

---

### 15. Paris Olympics 2024 - AS Juara Umum

**Title**: `Paris Olympics 2024 - AS Juara Umum`

**Description**: 
```
Apakah Amerika Serikat menjadi juara umum (total medali terbanyak) di Olimpiade Paris 2024 (26 Juli - 11 Agustus 2024)? 
Resolusi berdasarkan data resmi IOC.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Sport`

**Resolution Criteria**:
- AS harus memiliki total medali terbanyak
- Periode: 26 Juli - 11 Agustus 2024
- Berdasarkan tabel medali resmi IOC

**Source URLs**:
- https://olympics.com/en/paris-2024/medals
- https://www.olympic.org/paris-2024

**Expected Answer**: `Ya` (AS: 126 medali total, China: 91 medali)

---

### 16. NBA Finals 2024 Winner

**Title**: `NBA Finals 2024 Winner`

**Description**: 
```
Apakah Boston Celtics memenangkan NBA Finals 2024 melawan Dallas Mavericks (final berakhir Juni 2024)? 
Resolusi berdasarkan hasil resmi NBA.
```

**Outcomes**: `["Ya", "Tidak"]`

**Category**: `Sport`

**Resolution Criteria**:
- Celtics harus menang series melawan Mavericks
- Final berakhir Juni 2024
- Berdasarkan hasil resmi NBA

**Source URLs**:
- https://www.nba.com/finals
- https://www.espn.com/nba/playoffs/

**Expected Answer**: `Ya` (Celtics menang 4-1 series)

---

## 📊 Ringkasan

| Kategori | Jumlah Query | Query IDs |
|----------|--------------|-----------|
| Politik | 3 | #1, #2, #3 |
| Kripto | 4 | #4, #5, #6, #7 |
| Teknologi | 4 | #8, #9, #10, #11 |
| Sport | 5 | #12, #13, #14, #15, #16 |
| **TOTAL** | **16** | |

---

## 🚀 Cara Menggunakan

### Opsi 1: Via Script (Otomatis)

```bash
# Pastikan linera service berjalan
cd /path/to/alethea-network

# Jalankan script
chmod +x create_past_events_queries_complete.sh
./create_past_events_queries_complete.sh
```

### Opsi 2: Via Dashboard (Manual)

1. Buka dashboard: `http://localhost:5173/queries`
2. Klik "Create Query"
3. Copy-paste detail dari dokumen ini
4. Submit

### Opsi 3: Via GraphQL (Advanced)

```bash
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createQuery(...) }"}'
```

---

## ⏱️ Timeline Voting

1. **Commit Phase**: 12 jam pertama
   - Voter submit commit vote (hash)
   - Vote masih tersembunyi

2. **Reveal Phase**: 2 jam setelah commit
   - Voter reveal vote mereka
   - Vote menjadi visible

3. **Resolution**: Setelah deadline
   - Query dapat di-resolve
   - Reward didistribusikan ke voter yang benar

---

## 🔍 Verifikasi

Setelah query dibuat, verifikasi dengan:

```bash
# Check queries
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status outcomes } }"}'
```

Atau lihat di dashboard: `http://localhost:5173/queries`

---

## 📝 Catatan Penting

1. **Semua query menggunakan peristiwa yang SUDAH TERJADI** - mudah untuk di-resolve
2. **Setiap query memiliki sumber rujukan yang jelas** - untuk memastikan resolusi yang akurat
3. **Duration 14 jam total** - cukup waktu untuk testing tapi tidak terlalu lama
4. **Reward 100 ALTH** - cukup untuk incentivize voter
5. **Min votes 3** - memastikan ada konsensus minimal

---

## ❓ Troubleshooting

### Query tidak muncul setelah dibuat
```bash
linera sync && linera process-inbox
```

### Error saat create query
- Pastikan linera service berjalan
- Check .env.local configuration
- Verifikasi REGISTRY_APP_ID dan CHAIN_ID

### Tidak bisa vote
- Pastikan sudah terdaftar sebagai voter
- Check apakah masih dalam commit/reveal phase
- Verifikasi balance cukup untuk staking


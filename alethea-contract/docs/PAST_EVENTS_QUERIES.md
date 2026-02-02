# Query untuk Peristiwa yang Sudah Terjadi

Dokumen ini berisi contoh query tentang peristiwa real yang sudah terjadi (Crypto & Sports) yang bisa langsung di-resolve.

## 📋 Daftar Query

### 🪙 Crypto Queries

#### 1. Bitcoin Halving 2024
- **Pertanyaan**: Did Bitcoin halving occur on or before April 20, 2024?
- **Outcomes**: ["Yes", "No"]
- **Jawaban Benar**: Yes
- **Konteks**: Bitcoin halving terjadi di block 840,000 pada April 19-20, 2024, mengurangi reward dari 6.25 BTC menjadi 3.125 BTC per block.
- **Sumber**: https://www.blockchain.com/explorer/blocks/btc

#### 2. Ethereum Merge
- **Pertanyaan**: Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022?
- **Outcomes**: ["Yes", "No"]
- **Jawaban Benar**: Yes
- **Konteks**: Ethereum Merge adalah upgrade besar yang mengubah Ethereum dari Proof-of-Work ke Proof-of-Stake di block 15,537,393.
- **Sumber**: https://ethereum.org/en/upgrades/merge/

#### 3. Bitcoin All-Time High 2024
- **Pertanyaan**: Did Bitcoin reach a new all-time high price above $73,000 USD in March 2024?
- **Outcomes**: ["Yes", "No"]
- **Jawaban Benar**: Yes
- **Konteks**: Bitcoin mencapai ATH baru di atas $73,000 pada Maret 2024, didorong oleh ETF approvals dan institutional adoption.
- **Sumber**: https://www.coindesk.com/price/bitcoin/

### ⚽ Sports Queries

#### 4. FIFA World Cup 2022
- **Pertanyaan**: Who won the FIFA World Cup 2022 final match on December 18, 2022?
- **Outcomes**: ["Argentina", "France"]
- **Jawaban Benar**: Argentina
- **Konteks**: Final World Cup 2022 dimainkan di Qatar pada 18 Desember 2022. Argentina mengalahkan Prancis dalam adu penalti.
- **Sumber**: https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/qatar2022

#### 5. Super Bowl LVIII
- **Pertanyaan**: Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?
- **Outcomes**: ["Kansas City Chiefs", "San Francisco 49ers"]
- **Jawaban Benar**: Kansas City Chiefs
- **Konteks**: Super Bowl LVIII dimainkan di Las Vegas pada 11 Februari 2024. Kansas City Chiefs mengalahkan San Francisco 49ers 25-22 dalam overtime.
- **Sumber**: https://www.nfl.com/super-bowl/

#### 6. UEFA Champions League 2023
- **Pertanyaan**: Which team won the UEFA Champions League 2022-23 final on June 10, 2023?
- **Outcomes**: ["Manchester City", "Inter Milan"]
- **Jawaban Benar**: Manchester City
- **Konteks**: Final Champions League 2022-23 dimainkan di Istanbul pada 10 Juni 2023. Manchester City mengalahkan Inter Milan 1-0.
- **Sumber**: https://www.uefa.com/uefachampionsleague/

## 🚀 Cara Membuat Query

### Metode 1: Via Dashboard
1. Buka dashboard di `http://localhost:5173`
2. Klik "Create Query"
3. Isi form dengan detail dari query di atas
4. Submit query

### Metode 2: Via GraphQL Mutation

```bash
# Pastikan linera service berjalan
linera service &

# Buat query Bitcoin Halving
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createQuery(description: \"Did Bitcoin halving occur on or before April 20, 2024?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1713571200000000\", durationSecs: 300) { success message } }"
  }'
```

### Metode 3: Via Script

```bash
cd alethea-contract/scripts
./create-past-event-queries.sh
```

## 📝 Format Query Details

Setiap query memerlukan:
- **description**: Pertanyaan yang jelas
- **outcomes**: Array outcomes (min 2, max 10)
- **strategy**: "Majority", "Median", "WeightedByStake", atau "WeightedByReputation"
- **minVotes**: Minimum jumlah vote (default: 3)
- **rewardAmount**: Jumlah reward dalam attos (contoh: "50000000000000000000" = 50 ALTH)
- **deadline**: Timestamp dalam microseconds (past date untuk event yang sudah terjadi)
- **durationSecs**: Durasi voting dalam detik (default: 300)

## ✅ Resolusi Query

Setelah query dibuat dan voters sudah vote:
1. Query akan otomatis resolve setelah deadline + duration
2. Atau bisa manual resolve menggunakan `resolveQuery` mutation
3. Voters yang vote dengan benar akan mendapat reward

## 🔍 Verifikasi Query

```bash
# List semua queries
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ queries { id description status outcomes } }"
  }'

# Check query specific
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ query(id: 1) { id description status votes { voter outcome stake } } }"
  }'
```

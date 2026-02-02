# Create Query via Dashboard

## ✅ Fitur Create Query di Dashboard

Dashboard memiliki fitur lengkap untuk membuat query melalui UI. Fitur ini tersedia di halaman **Queries** dengan tab **"Create Query"**.

## 🚀 Cara Menggunakan

### 1. Akses Dashboard

```bash
cd alethea-dashboard-vite
npm run dev
```

Buka browser: `http://localhost:5173`

### 2. Navigasi ke Queries Page

- Klik menu **"Queries"** di navigation bar
- Atau klik **"Create Query"** card di homepage
- Atau langsung ke: `http://localhost:5173/queries`

### 3. Buka Tab "Create Query"

Di halaman Queries, klik tab **"Create Query"** (tab ketiga)

### 4. Isi Form

Form memiliki 3 field:

#### a. Question (Required)
- **Field**: Textarea untuk pertanyaan
- **Contoh**: "Did Bitcoin halving occur on or before April 20, 2024?"
- **Tip**: Dashboard menyarankan untuk bertanya tentang event yang sudah terjadi, bukan prediksi

#### b. Outcomes (Required)
- **Default**: `["Yes", "No"]`
- **Bisa diubah**: Klik input field untuk mengubah outcomes
- **Contoh untuk World Cup**: `["Argentina", "France"]`
- **Contoh untuk Super Bowl**: `["Kansas City Chiefs", "San Francisco 49ers"]`

#### c. Duration (Required)
- **Options**:
  - 2 Minutes (1m commit + 1m reveal)
  - 5 Minutes (2.5m + 2.5m) - **Default**
  - 10 Minutes (5m + 5m)
  - 1 Hour (30m + 30m)
  - 24 Hours (12h + 12h)
  - 7 Days (3.5d + 3.5d)

### 5. Submit Query

- Klik tombol **"Create Query"**
- Dashboard akan:
  1. Mengirim `sendCreateQueryMessage` mutation
  2. Default reward: **100 ALTH** (100 * 10^18 attos)
  3. Strategy: **WeightedByStake**
  4. Min votes: **1**
  5. Menunggu 3 detik
  6. Auto-refresh queries list
  7. Switch ke tab "Active Queries"

## 📋 Contoh Query untuk Peristiwa yang Sudah Terjadi

### 1. Bitcoin Halving 2024

**Question:**
```
Did Bitcoin halving occur on or before April 20, 2024? (Halving reduces block reward from 6.25 BTC to 3.125 BTC at block 840,000)
```

**Outcomes:**
- Yes
- No

**Duration:** 5 Minutes

**Expected Answer:** Yes

---

### 2. Ethereum Merge

**Question:**
```
Was Ethereum Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022 at block 15,537,393?
```

**Outcomes:**
- Yes
- No

**Duration:** 5 Minutes

**Expected Answer:** Yes

---

### 3. FIFA World Cup 2022

**Question:**
```
Who won the FIFA World Cup 2022 final match on December 18, 2022?
```

**Outcomes:**
- Argentina
- France

**Duration:** 5 Minutes

**Expected Answer:** Argentina

---

### 4. Super Bowl LVIII

**Question:**
```
Who won Super Bowl LVIII played on February 11, 2024 at Allegiant Stadium?
```

**Outcomes:**
- Kansas City Chiefs
- San Francisco 49ers

**Duration:** 5 Minutes

**Expected Answer:** Kansas City Chiefs

---

### 5. UEFA Champions League 2023

**Question:**
```
Which team won the UEFA Champions League 2022-23 final on June 10, 2023?
```

**Outcomes:**
- Manchester City
- Inter Milan

**Duration:** 5 Minutes

**Expected Answer:** Manchester City

---

### 6. Bitcoin ATH 2024

**Question:**
```
Did Bitcoin reach a new all-time high price above $73,000 USD in March 2024?
```

**Outcomes:**
- Yes
- No

**Duration:** 5 Minutes

**Expected Answer:** Yes

## ⚙️ Technical Details

### Mutation yang Digunakan

Dashboard menggunakan `sendCreateQueryMessage` mutation (cross-chain message):

```graphql
mutation {
  sendCreateQueryMessage(
    targetChain: "${CHAIN_ID}",
    description: "${description}",
    outcomes: ["Yes", "No"],
    strategy: "WeightedByStake",
    rewardAmount: "100000000000000000000000",  # 100 ALTH
    minVotes: 1,
    durationSecs: 300
  )
}
```

### Default Parameters

- **Reward**: 100 ALTH (100 * 10^18 attos)
- **Strategy**: WeightedByStake
- **Min Votes**: 1
- **Duration**: 600 seconds (10 minutes) - bisa diubah di form

### Setelah Create Query

1. **Message dikirim** ke target chain
2. **Perlu sync dan process inbox** untuk memproses message:
   ```bash
   linera sync && linera process-inbox
   ```
3. **Query akan muncul** di tab "Active Queries" setelah diproses

## 🔍 Verifikasi Query Berhasil Dibuat

### Via Dashboard

1. Setelah create query, dashboard auto-switch ke tab "Active Queries"
2. Query akan muncul di list jika sudah diproses
3. Jika belum muncul, jalankan: `linera sync && linera process-inbox`

### Via GraphQL

```bash
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ queries { id description status outcomes } }"
  }'
```

## ⚠️ Troubleshooting

### Query tidak muncul setelah dibuat

**Penyebab**: Message belum diproses

**Solusi**:
```bash
# Stop linera service jika berjalan
pkill -f "linera service"

# Sync dan process inbox
linera sync && linera process-inbox

# Restart linera service
linera service &
```

### Error: "Please connect your wallet first"

**Penyebab**: Wallet belum terhubung

**Solusi**: 
1. Klik "Connect Wallet" di header
2. Pilih wallet provider (Linera Wallet)
3. Pastikan wallet sudah terhubung sebelum create query

### Error: "Failed to create query"

**Penyebab**: 
- Network issue
- Chain ID tidak sesuai
- Insufficient balance untuk reward

**Solusi**:
1. Check console untuk error detail
2. Pastikan `VITE_CHAIN_ID` di `.env.local` benar
3. Pastikan balance cukup (minimal 100 ALTH untuk reward)

## 📝 Perbandingan: Dashboard vs GraphQL

| Feature | Dashboard | GraphQL Direct |
|---------|-----------|---------------|
| **Ease of Use** | ✅ Sangat mudah | ⚠️ Perlu tahu format |
| **Reward Amount** | Fixed 100 ALTH | Custom |
| **Strategy** | Fixed WeightedByStake | Custom |
| **Min Votes** | Fixed 1 | Custom |
| **Duration** | Pilihan dropdown | Custom |
| **Method** | sendCreateQueryMessage | createQuery |
| **Cross-chain** | ✅ Yes | ❌ No |

## 🎯 Rekomendasi

**Untuk testing cepat**: Gunakan **Dashboard** - lebih mudah dan cepat

**Untuk production/custom**: Gunakan **GraphQL** dengan parameter custom

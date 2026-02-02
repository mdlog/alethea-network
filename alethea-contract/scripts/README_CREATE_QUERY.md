# Cara Membuat Query untuk Peristiwa yang Sudah Terjadi

## 🚀 Quick Start

### Opsi 1: Via Script (Paling Mudah)

```bash
cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-contract/scripts

# Pastikan linera service berjalan
linera service &

# Buat query Bitcoin Halving 2024
./create-past-query.sh 1

# Atau query lainnya:
# 1 = Bitcoin Halving 2024
# 2 = Ethereum Merge
# 3 = Bitcoin ATH 2024
# 4 = FIFA World Cup 2022
# 5 = Super Bowl LVIII
# 6 = UEFA Champions League 2023
```

### Opsi 2: Via Dashboard (Recommended)

1. Buka dashboard: `http://localhost:5173`
2. Klik "Create Query"
3. Isi form dengan detail dari file `PAST_EVENTS_QUERIES.md`
4. Submit

### Opsi 3: Via GraphQL Mutation

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

## 📋 Daftar Query yang Tersedia

| # | Title | Category | Expected Answer |
|---|-------|----------|-----------------|
| 1 | Bitcoin Halving 2024 | Crypto | Yes |
| 2 | Ethereum Merge | Crypto | Yes |
| 3 | Bitcoin ATH 2024 | Crypto | Yes |
| 4 | FIFA World Cup 2022 | Sports | Argentina |
| 5 | Super Bowl LVIII | Sports | Kansas City Chiefs |
| 6 | UEFA Champions League 2023 | Sports | Manchester City |

## ⚠️ Troubleshooting

### Error: Linera service not running
```bash
# Start linera service
linera service &
```

### Error: Operation execution failed
- Pastikan chain sudah sync: `linera sync && linera process-inbox`
- Gunakan dashboard sebagai alternatif
- Check logs: `linera service` output

### Query tidak muncul setelah dibuat
```bash
# Sync dan process inbox
linera sync && linera process-inbox

# Check queries
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{REGISTRY_APP_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id description status } }"}'
```

## 📝 Format Operation JSON

Jika ingin membuat query manual, gunakan format ini:

```json
{
  "CreateQuery": {
    "description": "Your question here",
    "outcomes": ["Option 1", "Option 2"],
    "strategy": "WeightedByStake",
    "min_votes": 3,
    "reward_amount": "50000000000000000000",
    "deadline": 1713571200000000,
    "duration_secs": 300
  }
}
```

Strategies yang tersedia:
- `"Majority"` - Simple majority vote
- `"Median"` - Median value (for numeric outcomes)
- `"WeightedByStake"` - Weighted by voter stake
- `"WeightedByReputation"` - Weighted by voter reputation

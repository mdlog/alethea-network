# ⚡ Quick Start - CLI Copy-Paste

## 🎯 Cara Tercepat Membuat Query

### 1️⃣ Setup (Sekali Saja)

```bash
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"
```

### 2️⃣ Pilih & Copy-Paste Command

Buka file **`COPY_PASTE_COMMANDS.txt`** dan copy command yang diinginkan.

---

## 📝 Example: Membuat 3 Query Pertama

```bash
# Setup
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"

# Query #1: Bitcoin
curl -X POST "${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?\", outcomes: [\"Yes, above $95,000\", \"No, below $95,000\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

# Query #2: Ethereum
curl -X POST "${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did Ethereum (ETH) reach or exceed $3,500 USD on January 2, 2026?\", outcomes: [\"Yes, reached $3,500+\", \"No, below $3,500\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

# Query #3: Market Cap
curl -X POST "${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did total cryptocurrency market cap exceed $3.2 trillion USD on January 1, 2026?\", outcomes: [\"Yes, above $3.2T\", \"No, below $3.2T\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'
```

---

## ✅ Verifikasi

```bash
# Check di dashboard
open http://localhost:5173/queries

# Atau via CLI
curl -X POST "${REGISTRY_ENDPOINT}" -H "Content-Type: application/json" -d '{"query": "{ queries { id description status } }"}'
```

---

## 📚 File Referensi

- **`COPY_PASTE_COMMANDS.txt`** ⭐ - Semua 14 command siap copy-paste
- **`README_CLI_COMMANDS.md`** - Panduan lengkap
- **`queries_january_2026_english.json`** - Data JSON detail

---

**That's it!** Tinggal copy-paste! 🚀

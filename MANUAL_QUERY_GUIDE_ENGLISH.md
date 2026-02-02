# 📝 Manual Query Creation Guide (One by One)

## 🎯 How to Use

### Step 1: Open Dashboard
```
http://localhost:5173/queries
```

### Step 2: Click "Create Query"

### Step 3: Fill Form with Data from JSON

Open file `queries_january_2026_english.json` and select the query you want to create.

---

## 📋 Dashboard Form Template

For each query, fill in the following fields:

### Required Fields:

1. **Description** (Main Question)
   - Copy from `description` field in JSON
   - Example: `Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?`

2. **Outcomes** (Answer Options)
   - Copy from `outcomes` field in JSON
   - Separate with comma or enter
   - Example: `Yes, above $95,000` and `No, below $95,000`

3. **Duration**
   - Enter: `86400` (24 hours)

4. **Strategy**
   - Select: `WeightedByStake`

5. **Min Votes**
   - Enter: `3`

6. **Reward Amount**
   - Enter: `100` (ALTH)

### Optional Fields (If Dashboard Supports):

7. **Title**
   - Copy from `title` field in JSON
   - Example: `Bitcoin Price January 1, 2026`

8. **Category**
   - Copy from `category` field in JSON
   - Example: `Crypto`

9. **Context**
   - Copy from `context` field in JSON

10. **Resolution Criteria**
    - Copy from `resolution_criteria` field in JSON

11. **Source URLs**
    - Copy from `source_urls` field in JSON

12. **Tags**
    - Copy from `tags` field in JSON

---

## 🔢 Query #1: Bitcoin Price January 1, 2026

### Copy-Paste to Dashboard:

**Description:**
```
Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?
```

**Outcomes:**
```
Yes, above $95,000
No, below $95,000
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
Bitcoin Price January 1, 2026
```

**Category (optional):**
```
Crypto
```

**Context (optional):**
```
Bitcoin experienced volatility in late 2025 and early 2026. This query verifies BTC price at the start of 2026 based on available historical data.
```

**Resolution Criteria (optional):**
```
Resolution based on Bitcoin closing price on January 1, 2026 at 00:00 UTC from CoinGecko. Use BTC/USD price at that timestamp.
```

**Source URLs (optional):**
```
https://www.coingecko.com/en/coins/bitcoin, https://coinmarketcap.com/currencies/bitcoin/historical-data/
```

---

## 🔢 Query #2: Ethereum Price January 2, 2026

**Description:**
```
Did Ethereum (ETH) reach or exceed $3,500 USD on January 2, 2026?
```

**Outcomes:**
```
Yes, reached $3,500+
No, below $3,500
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
Ethereum Price January 2, 2026
```

**Category (optional):**
```
Crypto
```

**Source URLs (optional):**
```
https://www.coingecko.com/en/coins/ethereum, https://coinmarketcap.com/currencies/ethereum/historical-data/
```

---

## 🔢 Query #3: Total Crypto Market Cap January 1, 2026

**Description:**
```
Did total cryptocurrency market cap exceed $3.2 trillion USD on January 1, 2026?
```

**Outcomes:**
```
Yes, above $3.2T
No, below $3.2T
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
Total Crypto Market Cap January 1, 2026
```

**Category (optional):**
```
Crypto
```

**Source URLs (optional):**
```
https://www.coingecko.com/en/global-charts, https://coinmarketcap.com/charts/
```

---

## 🔢 Query #4: Solana Price January 3, 2026

**Description:**
```
Was Solana (SOL) price above $180 USD on January 3, 2026?
```

**Outcomes:**
```
Yes, above $180
No, below $180
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
Solana Price January 3, 2026
```

**Category (optional):**
```
Crypto
```

**Source URLs (optional):**
```
https://www.coingecko.com/en/coins/solana, https://coinmarketcap.com/currencies/solana/historical-data/
```

---

## 🔢 Query #5: GitHub Status January 1, 2026

**Description:**
```
Did GitHub experience an outage or incident on January 1, 2026?
```

**Outcomes:**
```
Yes, had outage/incident
No, no disruption
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
GitHub Status January 1, 2026
```

**Category (optional):**
```
Technology
```

**Source URLs (optional):**
```
https://www.githubstatus.com/, https://www.githubstatus.com/history
```

---

## 🔢 Query #6: Apple Stock Price January 2, 2026

**Description:**
```
Did Apple (AAPL) stock close above $230 USD on January 2, 2026?
```

**Outcomes:**
```
Yes, above $230
No, below $230
```

**Duration:** `86400`

**Strategy:** `WeightedByStake`

**Min Votes:** `3`

**Reward:** `100`

**Title (optional):**
```
Apple Stock Price January 2, 2026
```

**Category (optional):**
```
Technology
```

**Source URLs (optional):**
```
https://finance.yahoo.com/quote/AAPL/, h
# 🎯 Post-Deployment Steps - v3.4.0

**Deployment Date:** 1 Februari 2026  
**Status:** ✅ Contracts Deployed Successfully

---

## ✅ Deployment Summary

**ALTH Token:**
- Application ID: `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
- Initial Supply: 1,000,000,000 ALTH

**Oracle Registry V2:**
- Application ID: `1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892`
- Token Config: ⚠️ **Not Set** (needs to be set)

**Chain ID:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

---

## 📋 Required Steps

### **Step 1: Start Linera Service** (if not running)

```bash
linera service &
```

**Verify service is running:**
```bash
curl http://localhost:8080/health
```

---

### **Step 2: Set Token Configuration**

**Option A: Using Script (Recommended)**
```bash
cd alethea-contract/scripts
./set-token-config.sh
```

**Option B: Manual via GraphQL** (if service running)
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTokenConfig(tokenAppId: \"6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110\", tokenChainId: \"9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec\") { success message } }"
  }'
```

**Option C: Manual via CLI** (if service not running)
```bash
linera service execute-operation \
  --application-id 1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  --operation '{"SetTokenConfig": {"token_app_id": {"chain_id": "9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec", "bytes": "6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110"}, "token_chain_id": "9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"}}' \
  --chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

---

### **Step 3: Set Initial Parameters for Inflation Control**

**CRITICAL:** Set ini untuk inflation control berfungsi!

```bash
cd alethea-contract/scripts
./set-initial-parameters.sh
```

**What this does:**
- Sets `protocol_launch_timestamp` (current time)
- Updates `total_supply` (1B ALTH)
- Updates `expected_queries_per_year` (10,000)

**Manual Alternative:**
```bash
# Set launch timestamp
CURRENT_TIMESTAMP=$(date +%s)000000

linera service execute-operation \
  --application-id 1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  --operation "{\"SetProtocolLaunchTimestamp\": {\"timestamp\": $CURRENT_TIMESTAMP}}" \
  --chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Update inflation control
linera service execute-operation \
  --application-id 1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  --operation '{"UpdateInflationControl": {"total_supply": "1000000000000000000000000000", "expected_queries_per_year": 10000}}' \
  --chain-id 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

---

### **Step 4: Update Dashboard Environment Variables**

**✅ Already Updated!** `.env.local` sudah di-update dengan App IDs baru.

**Verify:**
```bash
cd alethea-dashboard-vite
cat .env.local | grep VITE_TOKEN_APP_ID
cat .env.local | grep VITE_REGISTRY_APP_ID
```

**Should show:**
```
VITE_TOKEN_APP_ID=6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110
VITE_REGISTRY_APP_ID=1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892
```

---

### **Step 5: Restart Dashboard**

```bash
cd alethea-dashboard-vite
npm run dev
```

---

## ✅ Verification Checklist

Setelah semua steps selesai, verifikasi:

- [ ] **Token Config Set**
  ```bash
  # Check via GraphQL
  curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{"query": "{ parameters }"}' | grep tokenAppId
  ```

- [ ] **Initial Parameters Set**
  ```bash
  # Check via GraphQL
  curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{"query": "{ parameters }"}' | grep protocolLaunchTimestamp
  ```

- [ ] **Dashboard Connected**
  - Open: http://localhost:5173
  - Check if it connects to registry
  - Try requesting faucet tokens

---

## 🧪 Testing Checklist

Setelah semua setup selesai, test:

1. **Voter Registration**
   - Request faucet tokens
   - Register as voter dengan 200 ALTH stake
   - Verify stake di-escrow

2. **Query Creation**
   - Create query dengan:
     - Bond: 100 ALTH
     - Service Fee: 10 ALTH
     - Priority Fee: 1 ALTH (optional)
   - Verify service fee collected to treasury
   - Verify `queries_this_year` incremented

3. **Query Resolution**
   - Vote on query (commit + reveal)
   - Wait for resolution
   - Verify rate-based reward calculated
   - Verify `total_inflation_distributed` updated

4. **Reward Claiming**
   - Claim rewards
   - Verify tokens transferred from escrow
   - Verify stake increased

---

## 📊 New Features in v3.4.0

1. ✅ **Service Fee Mechanism**
   - Non-refundable fee per query (10 ALTH minimum)
   - Collected to protocol treasury

2. ✅ **Decreasing Inflation Schedule**
   - Year 1: 7% annual rate
   - Year 2: 6% annual rate
   - Year 3: 5% annual rate
   - Year 4: 3.5% annual rate
   - Year 5: 2.5% annual rate
   - Year 6+: 2% annual rate

3. ✅ **Rate-Based Reward Calculation**
   - Dynamic reward per query
   - Based on annual inflation rate
   - Adjusts based on query volume

4. ✅ **Protocol Treasury**
   - Collects service fees
   - Collects protocol fees (10% of rewards)
   - Collects slashed bonds (50%)

---

## ⚠️ Important Notes

1. **Data Reset:** Deployment baru reset semua data
   - Users perlu re-register
   - Queries perlu dibuat ulang

2. **Initial Parameters:** Harus di-set untuk inflation control
   - Tanpa ini, inflation reward akan menggunakan default (50 ALTH flat)

3. **Token Config:** Harus di-set untuk reward minting
   - Tanpa ini, rewards tidak bisa di-mint

---

## 🎯 Quick Command Summary

```bash
# 1. Start service (if not running)
linera service &

# 2. Set token config
cd alethea-contract/scripts
./set-token-config.sh

# 3. Set initial parameters
./set-initial-parameters.sh

# 4. Restart dashboard
cd ../../alethea-dashboard-vite
npm run dev
```

---

**Deployment Complete!** 🎉

**Last Updated:** 1 Februari 2026  
**Version:** 3.4.0

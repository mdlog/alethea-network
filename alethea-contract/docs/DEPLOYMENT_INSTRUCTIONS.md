# 🚀 Deployment Instructions - v3.4.0

**Version:** 3.4.0 (Decreasing Inflation + Service Fee)  
**Date:** 1 Februari 2026  
**Status:** Ready to Deploy

---

## 📋 Prerequisites

1. **Linera CLI** installed and configured
2. **Linera Wallet** initialized with Conway testnet
3. **Linera Service** running (optional, for automatic token config)
4. **Rust** toolchain (1.86.0+)

---

## 🔧 Step-by-Step Deployment

### **Step 1: Start Linera Service (Optional but Recommended)**

```bash
# Start linera service in background
linera service &

# Verify service is running
curl http://localhost:8080/health
```

**Note:** Service diperlukan untuk:
- Automatic token configuration
- GraphQL queries/mutations
- Real-time chain synchronization

---

### **Step 2: Deploy Contracts**

```bash
cd alethea-contract/scripts
./deploy-complete-system.sh
```

**What this script does:**
1. ✅ Checks Linera wallet
2. ✅ Builds ALTH Token contract
3. ✅ Deploys ALTH Token
4. ✅ Builds Oracle Registry V2 contract
5. ✅ Deploys Oracle Registry V2
6. ✅ **Automatically sets token configuration** (if service running)
7. ✅ Saves deployment info to `deployment-info.txt`

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║              DEPLOYMENT SUCCESSFUL!                          ║
╚═══════════════════════════════════════════════════════════════╝

ALTH Token:
  Application ID: <NEW_TOKEN_APP_ID>
  
Oracle Registry V2:
  Application ID: <NEW_REGISTRY_APP_ID>
  Token Config: ✅ Set (or ⚠️ Not Set)
```

**Time Required:** ~5-10 minutes (depends on build time)

---

### **Step 3: Set Initial Parameters**

Setelah deployment selesai, set initial parameters untuk inflation control:

```bash
cd alethea-contract/scripts
./set-initial-parameters.sh
```

**What this script does:**
1. ✅ Sets `protocol_launch_timestamp` (current time)
2. ✅ Updates `total_supply` (1B ALTH)
3. ✅ Updates `expected_queries_per_year` (10,000)
4. ✅ Verifies parameters

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║              PARAMETERS SET SUCCESSFULLY!                   ║
╚═══════════════════════════════════════════════════════════════╝

Summary:
  • Protocol Launch Timestamp: <timestamp>
  • Total Supply: 1,000,000,000 ALTH
  • Expected Queries Per Year: 10,000
```

---

### **Step 4: Update Dashboard Environment Variables**

Update `.env.local` dengan App IDs baru:

```bash
cd alethea-dashboard-vite

# Copy from deployment-info.txt
cat ../alethea-contract/deployment-info.txt | grep VITE_ >> .env.local
```

**Or manually update `.env.local`:**
```bash
VITE_TOKEN_APP_ID=<NEW_TOKEN_APP_ID>
VITE_REGISTRY_APP_ID=<NEW_REGISTRY_APP_ID>
VITE_CHAIN_ID=<CHAIN_ID>
VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net
VITE_NETWORK=Conway Testnet
```

---

### **Step 5: Restart Dashboard**

```bash
cd alethea-dashboard-vite
npm run dev
```

---

## ✅ Verification Checklist

Setelah deployment, verifikasi:

- [ ] **Token Contract Deployed**
  ```bash
  linera service query-block <CHAIN_ID> | grep <TOKEN_APP_ID>
  ```

- [ ] **Registry Contract Deployed**
  ```bash
  linera service query-block <CHAIN_ID> | grep <REGISTRY_APP_ID>
  ```

- [ ] **Token Config Set** (jika auto-set gagal)
  ```bash
  cd alethea-contract/scripts
  ./set-token-config.sh
  ```

- [ ] **Initial Parameters Set**
  ```bash
  # Check via GraphQL (if service running)
  curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{"query": "{ parameters }"}'
  ```

- [ ] **Dashboard Connected**
  - Open dashboard: http://localhost:5173
  - Check if it connects to registry
  - Try requesting faucet tokens

---

## 🔍 Troubleshooting

### **Issue: Token Config Not Set**

**Solution:**
```bash
cd alethea-contract/scripts
./set-token-config.sh
```

**Or manually via GraphQL:**
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTokenConfig(tokenAppId: \"<TOKEN_APP_ID>\", tokenChainId: \"<CHAIN_ID>\") { success message } }"
  }'
```

---

### **Issue: Initial Parameters Not Set**

**Solution:**
```bash
cd alethea-contract/scripts
./set-initial-parameters.sh
```

**Or manually via linera execute-operation:**
```bash
# Set launch timestamp
linera service execute-operation \
  --application-id <REGISTRY_APP_ID> \
  --operation '{"SetProtocolLaunchTimestamp": {"timestamp": <CURRENT_TIMESTAMP>}}' \
  --chain-id <CHAIN_ID>

# Update inflation control
linera service execute-operation \
  --application-id <REGISTRY_APP_ID> \
  --operation '{"UpdateInflationControl": {"total_supply": "1000000000000000000000000000", "expected_queries_per_year": 10000}}' \
  --chain-id <CHAIN_ID>
```

---

### **Issue: Deployment Script Timeout**

**Solution:**
- Deployment bisa memakan waktu lama (build contracts)
- Biarkan script berjalan sampai selesai
- Check log di terminal untuk progress

---

## 📊 Post-Deployment Testing

### **1. Test Voter Registration**

```bash
# Request faucet tokens from dashboard
# Register as voter with 200 ALTH stake
```

### **2. Test Query Creation**

```bash
# Create query via dashboard with:
# - Bond: 100 ALTH
# - Service Fee: 10 ALTH
# - Priority Fee: 1 ALTH (optional)
```

**Verify:**
- ✅ Service fee collected to protocol treasury
- ✅ `queries_this_year` incremented
- ✅ Query created successfully

### **3. Test Query Resolution**

```bash
# Vote on query (commit + reveal)
# Wait for resolution
```

**Verify:**
- ✅ Rate-based reward calculated correctly
- ✅ `total_inflation_distributed` updated
- ✅ Rewards distributed to correct voters

### **4. Test Reward Claiming**

```bash
# Claim rewards from dashboard
```

**Verify:**
- ✅ Tokens transferred from escrow to user balance
- ✅ Stake increased
- ✅ Pending rewards cleared

---

## 📝 Important Notes

1. **Data Reset:** Deployment baru akan reset semua data (voters, queries, dll)
2. **Re-Registration:** Users perlu re-register dan re-stake setelah deployment
3. **Initial Parameters:** Harus di-set setelah deployment untuk inflation control
4. **Token Config:** Harus di-set untuk reward minting berfungsi

---

## 🎯 Next Steps After Deployment

1. ✅ Set initial parameters (`set-initial-parameters.sh`)
2. ✅ Update dashboard `.env.local`
3. ✅ Test voter registration
4. ✅ Test query creation dengan bond + service fee
5. ✅ Test query resolution dan reward distribution
6. ✅ Monitor protocol treasury balance
7. ✅ Monitor inflation distribution

---

**Deployment Complete!** 🎉

**Last Updated:** 1 Februari 2026  
**Version:** 3.4.0

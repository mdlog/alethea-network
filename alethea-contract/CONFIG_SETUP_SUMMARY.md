# ⚙️ Configuration Setup Summary - v3.4.0

**Deployment Date:** 1 Februari 2026  
**Status:** ✅ Contracts Deployed, ⚠️ Config Needs to be Set

---

## ✅ Completed Steps

1. ✅ **Contracts Deployed**
   - Token App ID: `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
   - Registry App ID: `1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892`
   - Chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

2. ✅ **Dashboard `.env.local` Updated**
   - App IDs sudah di-update dengan deployment baru

---

## ⚠️ Required Configuration Steps

### **Step 1: Set Token Configuration**

**Status:** ⚠️ Not Set

**Method 1: Via Dashboard (Easiest)**
1. Start dashboard: `cd alethea-dashboard-vite && npm run dev`
2. Open: http://localhost:5173
3. Go to Admin section
4. Set Token Config:
   - Token App ID: `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
   - Token Chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

**Method 2: Via GraphQL (if service running)**
```bash
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mutation { setTokenConfig(tokenAppId: \"6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110\", tokenChainId: \"9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec\") }"
  }'
```

---

### **Step 2: Set Initial Parameters for Inflation Control**

**Status:** ⚠️ Not Set

**CRITICAL:** Set ini untuk inflation control berfungsi dengan benar!

**Current Timestamp:** `1769908558000000` (akan berubah jika dijalankan lagi)

**Method 1: Via Dashboard (Easiest)**
1. Go to Admin section
2. Set Protocol Launch Timestamp: `1769908558000000` (atau current timestamp)
3. Update Inflation Control:
   - Total Supply: `1000000000000000000000000000` (1B ALTH)
   - Expected Queries Per Year: `10000`

**Method 2: Via GraphQL (if mutations available)**
```bash
# Check available mutations first
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ __schema { mutationType { fields { name } } } }"}'

# If mutations exist, try:
CURRENT_TIMESTAMP=$(date +%s)000000

# Set launch timestamp
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d "{\"query\": \"mutation { setProtocolLaunchTimestamp(timestamp: $CURRENT_TIMESTAMP) { success message } }\"}"

# Update inflation control
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{"query": "mutation { updateInflationControl(totalSupply: \"1000000000000000000000000000\", expectedQueriesPerYear: 10000) { success message } }"}'
```

---

## ✅ Verification

Setelah set config, verify:

```bash
# Check parameters
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters }"}'
```

**Expected:**
- `tokenAppId` should be set
- `protocolLaunchTimestamp` should be set
- `totalSupply` should be `1000000000000000000000000000`
- `expectedQueriesPerYear` should be `10000`

---

## 📝 Quick Reference

**App IDs:**
- Token: `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
- Registry: `1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892`
- Chain: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

**Parameters:**
- Total Supply: `1000000000000000000000000000` (1B ALTH)
- Expected Queries: `10000` per year
- Min Service Fee: `10 ALTH` (default)
- Min Bond: `100 ALTH` (default)

---

## 🎯 Next Steps After Config Setup

1. ✅ Test voter registration
2. ✅ Test query creation dengan bond + service fee
3. ✅ Verify service fee collected to treasury
4. ✅ Test query resolution
5. ✅ Verify rate-based reward calculation
6. ✅ Test reward claiming

---

**Last Updated:** 1 Februari 2026  
**Version:** 3.4.0

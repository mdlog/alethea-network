# ⚙️ Set Configuration via Dashboard - v3.4.0

**Status:** ✅ Contracts Deployed  
**Next Step:** Set Token Config & Initial Parameters via Dashboard

---

## 🎯 Quick Setup Guide

### **Step 1: Start Dashboard**

```bash
cd alethea-dashboard-vite
npm run dev
```

Dashboard akan berjalan di: **http://localhost:5173**

---

### **Step 2: Set Token Configuration**

1. **Buka Dashboard:** http://localhost:5173
2. **Login/Connect Wallet** (jika diperlukan)
3. **Navigate ke Admin Section**
4. **Find "Set Token Config" atau "Token Configuration"**
5. **Enter Values:**
   - **Token App ID:** `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
   - **Token Chain ID:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
6. **Click "Set" atau "Submit"**
7. **Wait for confirmation**

---

### **Step 3: Set Initial Parameters**

**CRITICAL:** Set ini untuk inflation control berfungsi!

1. **Navigate ke Admin Section**
2. **Find "Set Protocol Launch Timestamp" atau "Initial Parameters"**
3. **Set Protocol Launch Timestamp:**
   - **Timestamp:** `1769908558000000` (atau current timestamp)
   - **Note:** Ini adalah timestamp saat ini dalam microseconds
   - **Format:** Unix timestamp × 1,000,000
4. **Update Inflation Control:**
   - **Total Supply:** `1000000000000000000000000000` (1B ALTH in attos)
   - **Expected Queries Per Year:** `10000`
5. **Click "Set" atau "Submit"**
6. **Wait for confirmation**

---

## 📊 Current Deployment Info

**App IDs:**
- **Token:** `6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110`
- **Registry:** `1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892`
- **Chain:** `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

**Parameters to Set:**
- **Protocol Launch Timestamp:** Current time (in microseconds)
- **Total Supply:** `1000000000000000000000000000` (1B ALTH)
- **Expected Queries:** `10000` per year

---

## ✅ Verification

Setelah set config, verify di dashboard:

1. **Check Parameters:**
   - Go to Admin → View Parameters
   - Verify `tokenAppId` is set
   - Verify `protocolLaunchTimestamp` is set
   - Verify `totalSupply` is `1000000000000000000000000000`
   - Verify `expectedQueriesPerYear` is `10000`

2. **Test Query Creation:**
   - Create a test query dengan bond + service fee
   - Verify service fee collected
   - Verify `queries_this_year` incremented

---

## 🔍 Troubleshooting

### **Issue: Dashboard tidak bisa connect ke registry**

**Solution:**
- Verify `.env.local` sudah di-update dengan App IDs baru
- Restart dashboard: `npm run dev`
- Check browser console untuk errors

### **Issue: Admin operations tidak muncul di dashboard**

**Solution:**
- Pastikan menggunakan chain ID yang benar
- Pastikan wallet connected dengan chain yang memiliki admin access
- Check jika ada error di browser console

### **Issue: Operations gagal**

**Solution:**
- Pastikan `linera service` berjalan: `linera service &`
- Sync chain: `linera sync <CHAIN_ID>`
- Process inbox: `linera process-inbox <CHAIN_ID>`

---

## 📝 Alternative: Manual GraphQL (if dashboard not available)

Jika dashboard tidak tersedia, bisa coba via GraphQL langsung:

```bash
# Set Token Config
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "mutation { setTokenConfig(tokenAppId: \"6719738763376451b2b4ab318ef5b8965a4c21131eaf21a3c0d6acba337bc110\", tokenChainId: \"9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec\") }"
  }'

# Set Protocol Launch Timestamp
CURRENT_TIMESTAMP=$(date +%s)000000
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d "{\"query\": \"mutation { setProtocolLaunchTimestamp(timestamp: $CURRENT_TIMESTAMP) { success message } }\"}"

# Update Inflation Control
curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892 \
  -H 'Content-Type: application/json' \
  -d '{"query": "mutation { updateInflationControl(totalSupply: \"1000000000000000000000000000\", expectedQueriesPerYear: 10000) { success message } }"}'
```

**Note:** GraphQL mutations mungkin tidak tersedia jika tidak di-expose di service layer.

---

## 🎯 Recommended Approach

**✅ BEST:** Use Dashboard
- User-friendly
- Proper error handling
- Visual confirmation
- No CLI required

**⚠️ ALTERNATIVE:** Use GraphQL (if mutations available)
- Requires `linera service` running
- May need proper authentication
- Check mutations availability first

---

**Last Updated:** 1 Februari 2026  
**Version:** 3.4.0

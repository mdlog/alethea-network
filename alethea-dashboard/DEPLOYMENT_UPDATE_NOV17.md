# Dashboard Update - November 17, 2025

## ✅ Update Complete

Dashboard telah diupdate untuk menggunakan deployment terbaru dengan Voter Selection System.

---

## 📋 Deployment Information Terbaru

### Network Details
- **Network:** Linera Conway Testnet
- **Deployment Date:** November 17, 2025

### Chain & Application IDs
- **Chain ID:** `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef`
- **App ID:** `9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2`
- **Owner:** `0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318`

### Endpoints
- **GraphQL:** `http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2`
- **Backend:** `http://localhost:3001`
- **Frontend:** `http://localhost:3000` (atau 4000)

---

## 🔄 Files Updated

### 1. Environment Configuration ✅
**File:** `alethea-dashboard/.env.local`

```bash
NEXT_PUBLIC_CHAIN_ID=8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
NEXT_PUBLIC_APP_ID=9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 2. GraphQL Client ✅
**File:** `alethea-dashboard/lib/graphql.ts`

Updated default values:
```typescript
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 
  '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || 
  process.env.NEXT_PUBLIC_APP_ID || 
  '9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2';
```

### 3. Linera Operations ✅
**File:** `alethea-dashboard/lib/linera-operations.ts`

Updated default values:
```typescript
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 
  '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || 
  '9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2';
```

---

## ✨ New Features in This Deployment

### 1. Voter Selection by Power
- Voters dipilih berdasarkan power (stake × reputation)
- Top N voters berpartisipasi dalam setiap query
- Algoritma seleksi otomatis

### 2. Voting Permissions
- Hanya selected voters yang bisa vote
- Error message yang jelas untuk non-selected voters
- Mencegah spam dan sybil attacks

### 3. Power-Based Rewards
- Rewards didistribusikan proporsional berdasarkan power
- Higher power = higher reward share
- Struktur insentif yang fair

---

## 🚀 How to Start Dashboard

### 1. Pastikan Backend Running
```bash
cd oracle-api-backend
cargo run --release
```

### 2. Start Dashboard
```bash
cd alethea-dashboard
npm run dev
```

Dashboard akan berjalan di:
- **Development:** http://localhost:3000
- **Alternative:** http://localhost:4000

---

## 🧪 Testing

### Test GraphQL Connection
```bash
curl -X POST "http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterCount }"}'
```

Expected response:
```json
{"data":{"voterCount":0}}
```

### Test Dashboard
1. Open http://localhost:3000
2. Check console for configuration:
   ```
   🚀 Oracle Registry v2 Configuration:
   CHAIN_ID: 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
   REGISTRY_ID: 9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2
   ```

---

## 📊 Comparison with Previous Deployment

### Previous (November 16, 2025)
- Chain ID: `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`
- App ID: `640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6`
- Features: Account-based registration with executeRegisterVoterFor

### Current (November 17, 2025)
- Chain ID: `8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef`
- App ID: `9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2`
- Features: Voter Selection System + Power-based rewards

---

## ✅ Verification Checklist

- [x] `.env.local` updated with new IDs
- [x] `lib/graphql.ts` updated with new default IDs
- [x] `lib/linera-operations.ts` updated with new default IDs
- [x] No hardcoded old IDs in TypeScript/JavaScript files
- [x] GraphQL endpoint accessible
- [x] Configuration documented

---

## 🎯 Next Steps

1. **Start Services:**
   ```bash
   # Terminal 1: Backend
   cd oracle-api-backend && cargo run --release
   
   # Terminal 2: Dashboard
   cd alethea-dashboard && npm run dev
   ```

2. **Test Voter Registration:**
   - Open http://localhost:3000/voters
   - Click "Register as Voter"
   - Follow registration flow

3. **Test Voter Selection:**
   - Register multiple voters with different stakes
   - Create a query
   - Check which voters are selected
   - Verify voting permissions

---

## 📚 Related Documentation

- **DEPLOYMENT_SUCCESS.md** - Full deployment details
- **VOTER_SELECTION_IMPLEMENTED.md** - Voter selection implementation
- **CARA_MENDAFTAR_VOTER.md** - Voter registration guide (Indonesian)
- **WHO_CAN_BE_VOTER.md** - Voter eligibility guide

---

## 🎉 Summary

Dashboard berhasil diupdate untuk menggunakan deployment terbaru dengan:
- ✅ Chain ID dan App ID terbaru
- ✅ Voter Selection System
- ✅ Power-based rewards
- ✅ Semua file konfigurasi tersinkronisasi

**Status:** Ready for testing! 🚀

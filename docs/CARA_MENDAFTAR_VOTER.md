# Cara Mendaftar Sebagai Voter di Alethea Network

**Panduan Lengkap untuk User Lain**

**Date:** November 17, 2025

---

## 🎯 Overview

Ada **3 cara** untuk mendaftar sebagai voter di Alethea Network:

1. **Via Dashboard (Web UI)** - Paling mudah untuk user biasa
2. **Via Backend API** - Untuk developer/advanced user
3. **Via GraphQL Direct** - Untuk integration/automation

---

## 📋 Prerequisites (Yang Dibutuhkan)

### 1. Linera Wallet & Account ✅

**User lain harus punya:**
- Linera wallet (buat dengan `linera wallet init`)
- Account address (contoh: `0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318`)
- Minimum 100 tokens untuk stake

**Cara mendapatkan wallet:**
```bash
# Install Linera CLI
# (User lain harus install Linera CLI dulu)

# Buat wallet baru
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Request chain baru
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

# Lihat address
linera wallet show
```

### 2. Tokens untuk Stake ✅

**Testnet (Gratis):**
- Dapatkan dari faucet: https://faucet.testnet-conway.linera.net
- Gratis untuk testing

**Mainnet (Future):**
- Beli tokens dari exchange
- Transfer ke wallet Linera

---

## 🌐 Cara 1: Via Dashboard (Paling Mudah)

### Step-by-Step untuk User Biasa:

**Step 1: Akses Dashboard**
```
URL: http://localhost:4000/voters
(atau URL production jika sudah deploy)
```

**Step 2: Connect Wallet**
- Klik "Connect Wallet" atau "Register as Voter"
- Masukkan Linera account address
- Contoh: `0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318`

**Step 3: Isi Form Registrasi**
```
┌─────────────────────────────────────┐
│  Register as Voter                  │
├─────────────────────────────────────┤
│                                     │
│  Voter Address: *                   │
│  [0x1378c5e5c37d5b1264af7f3ecd...] │
│                                     │
│  Stake Amount: * (minimum 100)      │
│  [1000]                             │
│                                     │
│  Name: (optional)                   │
│  [Alice]                            │
│                                     │
│  Metadata URL: (optional)           │
│  [https://myprofile.com]            │
│                                     │
│  [Register as Voter]                │
│                                     │
└─────────────────────────────────────┘
```

**Step 4: Submit**
- Klik "Register as Voter"
- Tunggu proses (2-5 detik)
- Lihat loading indicator

**Step 5: Konfirmasi**
```
✅ Success!

Certificate Hash: 
4972a1a47e2781ca056eb217bde6a7487b7573ea5c6c7aedb9c1e9b5c3560770

Your voter registration has been submitted!

Voter Details:
- Address: 0x1378...
- Stake: 1,000 tokens
- Reputation: 50 (default)
- Power: 50,000 (stake × reputation)
- Status: Active ✅

You can now participate in queries!
```

**Step 6: Verify**
- Cek voter profile di dashboard
- Lihat stake dan reputation
- Siap untuk voting!

---

## 🔧 Cara 2: Via Backend API

### Untuk Developer atau Advanced User:

**Endpoint:**
```
POST http://localhost:3001/api/transaction/register-voter
```

**Request Format:**
```bash
curl -X POST http://localhost:3001/api/transaction/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318",
    "stake": "1000",
    "name": "Alice",
    "metadata_url": "https://alice.com/profile"
  }'
```

**Parameters:**
- `voter_address` (required) - Linera account address
- `stake` (required) - Amount to stake (minimum 100)
- `name` (optional) - Display name
- `metadata_url` (optional) - Profile URL

**Response (Success):**
```json
{
  "success": true,
  "message": "Voter registered successfully",
  "data": {
    "certificateHash": "4972a1a47e2781ca056eb217bde6a7487b7573ea5c6c7aedb9c1e9b5c3560770",
    "voterAddress": "0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318",
    "stake": "1000",
    "reputation": 50,
    "power": 50000
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Already registered as voter"
}
```

---

## 📡 Cara 3: Via GraphQL Direct

### Untuk Integration/Automation:

**Endpoint:**
```
POST http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}
```

**GraphQL Mutation:**
```graphql
mutation RegisterVoter {
  executeRegisterVoterFor(
    voterAddress: "0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318",
    stake: "1000",
    name: "Alice",
    metadataUrl: "https://alice.com/profile"
  )
}
```

**Via cURL:**
```bash
curl -X POST "http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { executeRegisterVoterFor(voterAddress: \"0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318\", stake: \"1000\", name: \"Alice\") }"
  }'
```

---

## 🌍 Skenario: User Lain Mendaftar

### Skenario 1: User Biasa (Non-Technical)

**Alice ingin mendaftar:**

1. **Buat Wallet**
   - Install Linera CLI atau gunakan web wallet
   - Dapatkan address: `0xAlice...`

2. **Dapatkan Tokens**
   - Testnet: Request dari faucet
   - Mainnet: Beli dari exchange

3. **Akses Dashboard**
   - Buka: `https://alethea.network/voters`
   - Atau: `http://localhost:4000/voters`

4. **Isi Form**
   - Address: `0xAlice...`
   - Stake: `1000`
   - Name: `Alice`

5. **Submit**
   - Klik "Register"
   - Tunggu konfirmasi
   - Done! ✅

**Total Time:** 5-10 menit

---

### Skenario 2: Developer Integration

**Bob ingin integrate ke aplikasinya:**

```javascript
// Bob's Application Code
async function registerVoter(address, stake, name) {
  const response = await fetch('http://localhost:3001/api/transaction/register-voter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voter_address: address,
      stake: stake.toString(),
      name: name
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Registered!', result.data);
    return result.data;
  } else {
    console.error('Failed:', result.error);
    throw new Error(result.error);
  }
}

// Usage
await registerVoter(
  '0xBob...',
  5000,
  'Bob'
);
```

**Total Time:** 1-2 menit (automated)

---

### Skenario 3: DAO Participation

**DeFi DAO ingin mendaftar:**

1. **DAO Governance Vote**
   - Proposal: "Register as Alethea voter"
   - Stake amount: 100,000 tokens
   - Vote passes ✅

2. **Execute via Multisig**
   ```bash
   # DAO multisig executes
   curl -X POST http://localhost:3001/api/transaction/register-voter \
     -d '{
       "voter_address": "0xDAO_MULTISIG...",
       "stake": "100000",
       "name": "DeFi DAO"
     }'
   ```

3. **DAO Registered**
   - Power: 5,000,000 (100k × 50)
   - Selected for all major queries
   - Earns rewards to treasury

**Total Time:** Depends on governance process

---

## 📊 Contoh Registrasi Multiple Users

### 5 Users Mendaftar:

**User 1: Alice (Casual)**
```json
{
  "voter_address": "0xAlice...",
  "stake": "1000",
  "name": "Alice"
}
→ Power: 50,000
```

**User 2: Bob (Whale)**
```json
{
  "voter_address": "0xBob...",
  "stake": "15000",
  "name": "Bob"
}
→ Power: 750,000
```

**User 3: Carol (Moderate)**
```json
{
  "voter_address": "0xCarol...",
  "stake": "10000",
  "name": "Carol"
}
→ Power: 500,000
```

**User 4: Dave (Active)**
```json
{
  "voter_address": "0xDave...",
  "stake": "8000",
  "name": "Dave"
}
→ Power: 400,000
```

**User 5: Eve (Starter)**
```json
{
  "voter_address": "0xEve...",
  "stake": "5000",
  "name": "Eve"
}
→ Power: 250,000
```

**Result:**
- All 5 registered successfully ✅
- Selection order: Bob > Carol > Dave > Eve > Alice
- All can participate based on power

---

## 🔍 Verification (Cek Registrasi)

### Cara Cek Apakah Sudah Terdaftar:

**Via Dashboard:**
```
1. Buka http://localhost:4000/voters
2. Masukkan address
3. Lihat voter profile
```

**Via API:**
```bash
curl -X POST http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ voter(address: \"0xAlice...\") { address stake reputation power isActive } }"
  }'
```

**Response:**
```json
{
  "data": {
    "voter": {
      "address": "0xAlice...",
      "stake": "1000",
      "reputation": 50,
      "power": "50000",
      "isActive": true
    }
  }
}
```

---

## ❓ FAQ - Pertanyaan Umum

### Q1: Apakah saya perlu approval untuk mendaftar?
**A:** Tidak! Registrasi langsung, tidak perlu approval.

### Q2: Berapa minimum stake?
**A:** 100 tokens minimum, tapi recommended 1,000+ untuk selection chances lebih baik.

### Q3: Apakah stake saya bisa hilang?
**A:** Tidak. Stake aman dan bisa di-withdraw kapan saja (jika tidak ada active votes).

### Q4: Bagaimana jika saya tidak punya tokens?
**A:** 
- Testnet: Gratis dari faucet
- Mainnet: Beli dari exchange

### Q5: Apakah saya harus voting setiap hari?
**A:** Tidak. Voting optional, hanya jika Anda terpilih untuk query tertentu.

### Q6: Bagaimana cara increase selection chances?
**A:** 
- Increase stake (immediate effect)
- Build reputation (vote correctly)
- Both = best results

### Q7: Apakah bisa mendaftar dari negara manapun?
**A:** Ya! Global, permissionless, no restrictions.

### Q8: Apakah perlu KYC?
**A:** Tidak! Anonymous participation.

### Q9: Berapa lama proses registrasi?
**A:** 2-5 detik untuk submit, instant confirmation.

### Q10: Apakah bisa mendaftar multiple accounts?
**A:** Ya, tapi tidak efisien. Better: 1 account dengan stake besar.

---

## 🚨 Common Errors & Solutions

### Error 1: "Already registered as voter"
**Solution:** Anda sudah terdaftar! Cek voter profile.

### Error 2: "Insufficient stake"
**Solution:** Minimum 100 tokens. Tambah stake amount.

### Error 3: "Invalid address format"
**Solution:** Pastikan address format benar (0x + 64 hex chars).

### Error 4: "Failed to fetch"
**Solution:** Backend tidak running. Start backend dulu.

### Error 5: "GraphQL error"
**Solution:** Linera service tidak running. Start service dulu.

---

## 📝 Checklist Registrasi

### Before Registration:
- [ ] Punya Linera wallet
- [ ] Punya account address
- [ ] Punya minimum 100 tokens
- [ ] Backend & service running (jika local)

### During Registration:
- [ ] Isi address dengan benar
- [ ] Isi stake (minimum 100)
- [ ] Isi name (optional)
- [ ] Submit form

### After Registration:
- [ ] Terima certificate hash
- [ ] Verify voter profile
- [ ] Check stake dan reputation
- [ ] Ready untuk voting!

---

## 🎯 Summary

### 3 Cara Mendaftar:

**1. Dashboard (Easiest)** ⭐
- Buka web UI
- Isi form
- Submit
- Done!

**2. Backend API (Developer)**
- POST request
- JSON payload
- Get response
- Done!

**3. GraphQL Direct (Advanced)**
- GraphQL mutation
- Direct to blockchain
- Full control
- Done!

### Requirements:
- ✅ Linera account
- ✅ Minimum 100 tokens
- ✅ 5 minutes time

### Result:
- ✅ Registered as voter
- ✅ Can participate in queries
- ✅ Earn rewards
- ✅ Build reputation

---

## 🚀 Get Started Now!

**Ready to register?**

1. **Get wallet** - Create Linera account
2. **Get tokens** - Faucet (testnet) or buy (mainnet)
3. **Register** - Use dashboard or API
4. **Start voting** - Earn rewards!

---

**Alethea Network: Open for Everyone!** 🌍

**No barriers, just register and participate!** 🎉


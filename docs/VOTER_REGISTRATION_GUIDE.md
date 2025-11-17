# How to Register as a Voter on Alethea Network

**Complete Guide for Users**

**Date:** November 17, 2025

---

## 🎯 Overview

There are **3 ways** to register as a voter on Alethea Network:

1. **Via Dashboard (Web UI)** - Easiest for regular users
2. **Via Backend API** - For developers/advanced users
3. **Via GraphQL Direct** - For integration/automation

---

## 📋 Prerequisites

### 1. Linera Wallet & Account ✅

**You need:**
- Linera wallet (create with `linera wallet init`)
- Account address (example: `0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318`)
- Minimum 100 tokens for stake

**How to get a wallet:**
```bash
# Install Linera CLI

# Create new wallet
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Request new chain
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

# View your address
linera wallet show
```

### 2. Tokens for Stake ✅

**Testnet (Free):**
- Get from faucet: https://faucet.testnet-conway.linera.net
- Free for testing

**Mainnet (Future):**
- Buy tokens from exchange
- Transfer to Linera wallet

---

## 🌐 Method 1: Via Dashboard (Easiest)

### Step-by-Step for Regular Users:

**Step 1: Access Dashboard**
```
URL: http://localhost:3000/voters
(or production URL if deployed)
```

**Step 2: Fill Registration Form**
- Click "Register as Voter"
- Enter your Linera account address
- Enter stake amount (minimum 100)
- Enter name (optional)
- Click "Register"

**Step 3: Confirmation**
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

**Total Time:** ~30 seconds

---

## 🔧 Method 2: Via Backend API

### For Developers or Advanced Users:

**Endpoint:**
```
POST http://localhost:3001/api/transaction/register-voter
```

**Request:**
```bash
curl -X POST http://localhost:3001/api/transaction/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x1378c5e5c37d5b1264af7f3ecd4e913493fc7a6796bd5fb0439b4438c7f0d318",
    "stake": "1000",
    "name": "Alice"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Voter registered successfully",
  "data": {
    "certificateHash": "4972a1a47e2781ca056eb217bde6a7487b7573ea5c6c7aedb9c1e9b5c3560770",
    "voterAddress": "0x1378...",
    "stake": "1000",
    "reputation": 50,
    "power": 50000
  }
}
```

---

## 📡 Method 3: Via GraphQL Direct

### For Integration/Automation:

**GraphQL Mutation:**
```graphql
mutation RegisterVoter {
  registerVoter(
    stake: "1000",
    name: "Alice"
  ) {
    address
    stake
    reputation
    power
    isActive
  }
}
```

**Via cURL:**
```bash
curl -X POST "http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { registerVoter(stake: \"1000\", name: \"Alice\") { address stake reputation power isActive } }"
  }'
```

---

## 📊 Example: Multiple Users Registration

**5 Users Register:**

1. **Alice (Casual)** - Stake: 1,000 → Power: 50,000
2. **Bob (Whale)** - Stake: 15,000 → Power: 750,000
3. **Carol (Moderate)** - Stake: 10,000 → Power: 500,000
4. **Dave (Active)** - Stake: 8,000 → Power: 400,000
5. **Eve (Starter)** - Stake: 5,000 → Power: 250,000

**Selection Order:** Bob > Carol > Dave > Eve > Alice

All can participate based on their power!

---

## 🔍 Verification

### Check if Registered:

**Via Dashboard:**
- Open http://localhost:3000/voters
- View voter leaderboard
- Find your address

**Via GraphQL:**
```bash
curl -X POST "http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ myVoterInfo { address stake reputation power isActive } }"
  }'
```

---

## ❓ FAQ

**Q: Do I need approval to register?**  
A: No! Registration is instant, no approval needed.

**Q: What's the minimum stake?**  
A: 100 tokens minimum, but 1,000+ recommended for better selection chances.

**Q: Can I lose my stake?**  
A: No. Stake is safe and can be withdrawn anytime (if no active votes).

**Q: How do I increase selection chances?**  
A: Increase stake (immediate) and build reputation (vote correctly).

**Q: Is KYC required?**  
A: No! Anonymous participation.

**Q: How long does registration take?**  
A: ~30 seconds for submission, instant confirmation.

---

## 🚨 Common Errors

**"Already registered as voter"**  
→ You're already registered! Check your voter profile.

**"Insufficient stake"**  
→ Minimum 100 tokens required. Increase stake amount.

**"Invalid address format"**  
→ Ensure address format is correct (0x + 64 hex chars).

**"Failed to fetch"**  
→ Backend not running. Start backend first.

---

## 📝 Registration Checklist

### Before Registration:
- [ ] Have Linera wallet
- [ ] Have account address
- [ ] Have minimum 100 tokens
- [ ] Backend & service running (if local)

### During Registration:
- [ ] Enter address correctly
- [ ] Enter stake (minimum 100)
- [ ] Enter name (optional)
- [ ] Submit form

### After Registration:
- [ ] Receive certificate hash
- [ ] Verify voter profile
- [ ] Check stake and reputation
- [ ] Ready for voting!

---

## 🎯 Summary

### 3 Registration Methods:

**1. Dashboard (Easiest)** ⭐
- Open web UI → Fill form → Submit → Done!

**2. Backend API (Developer)**
- POST request → JSON payload → Get response → Done!

**3. GraphQL Direct (Advanced)**
- GraphQL mutation → Direct to blockchain → Done!

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

1. **Get wallet** - Create Linera account
2. **Get tokens** - Faucet (testnet) or buy (mainnet)
3. **Register** - Use dashboard or API
4. **Start voting** - Earn rewards!

---

**Alethea Network: Open for Everyone!** 🌍

**No barriers, just register and participate!** 🎉

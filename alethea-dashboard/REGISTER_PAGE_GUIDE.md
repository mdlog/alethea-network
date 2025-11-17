# 📝 Register Page Guide

**How to use the Voter Registration page**

---

## 🎯 Overview

The Register page (`/register`) allows users to register as voters in the Alethea Oracle Network using MetaMask wallet.

**URL:** `http://localhost:4000/register`

---

## 🔧 Prerequisites

### 1. MetaMask Extension
- Install MetaMask browser extension
- Create or import a wallet
- Have some test tokens

### 2. Backend API (Required for Account-Based Model)
The registry uses Linera's account-based model, which requires backend API for transaction execution.

**Start Backend API:**
```bash
cd oracle-api-backend
cargo run
```

Backend should be running on: `http://localhost:3001`

### 3. Linera Service
Linera service should be running:
```bash
linera service --port 8080
```

---

## 📋 Step-by-Step Guide

### Step 1: Navigate to Register Page
```
http://localhost:4000/register
```

### Step 2: Check MetaMask Status
- Page will show if MetaMask is installed
- If not installed, download from: https://metamask.io/download/

### Step 3: Connect MetaMask
1. Click **"Connect MetaMask"** button
2. MetaMask popup will appear
3. Select account to connect
4. Approve connection
5. Your address will be displayed

**Note:** Form fields are disabled until wallet is connected.

### Step 4: Fill Registration Form
Once wallet is connected, fill in:

1. **Stake Amount** (required)
   - Minimum: 100 tokens
   - Default: 1000 tokens
   - Your stake is locked during active votes

2. **Voter Name** (optional)
   - Display name for leaderboard
   - Max 50 characters
   - Example: "Alice"

3. **Metadata URL** (optional)
   - Link to your profile
   - Additional information
   - Example: "https://example.com/profile"

### Step 5: Submit Registration
1. Click **"Register Voter"** button
2. Wait for processing
3. Backend API will:
   - Build the transaction
   - Sign with chain owner key
   - Submit to Linera
   - Return certificate hash

### Step 6: Confirmation
- Success message will appear
- Certificate hash displayed (proof of submission)
- Automatically redirected to Voters page
- Your voter info will appear in the list

---

## 🔄 Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Connect MetaMask"                           │
│    ↓                                                         │
│ 2. MetaMask popup appears                                   │
│    ↓                                                         │
│ 3. User approves connection                                 │
│    ↓                                                         │
│ 4. Wallet address displayed                                 │
│    ↓                                                         │
│ 5. Form fields become active                                │
│    ↓                                                         │
│ 6. User fills in stake, name, metadata                      │
│    ↓                                                         │
│ 7. User clicks "Register Voter"                             │
│    ↓                                                         │
│ 8. Frontend sends request to Backend API                    │
│    ↓                                                         │
│ 9. Backend builds RegisterVoterFor operation                │
│    ↓                                                         │
│ 10. Backend signs with chain owner key                      │
│    ↓                                                         │
│ 11. Backend submits to Linera service                       │
│    ↓                                                         │
│ 12. Linera executes operation                               │
│    ↓                                                         │
│ 13. Certificate hash returned                               │
│    ↓                                                         │
│ 14. Success message displayed                               │
│    ↓                                                         │
│ 15. Redirect to Voters page                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration

### Environment Variables (.env.local)
```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_USE_BACKEND_API=true

# Registry Configuration
NEXT_PUBLIC_CHAIN_ID=95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
NEXT_PUBLIC_REGISTRY_ID=640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
```

### Backend API Endpoints
```
POST http://localhost:3001/api/register-voter
```

**Request Body:**
```json
{
  "voter_address": "0x1234...5678",
  "stake": "1000",
  "name": "Alice",
  "metadata_url": "https://example.com/profile"
}
```

**Response:**
```json
{
  "success": true,
  "certificate_hash": "0xabc...def",
  "message": "Voter registered successfully"
}
```

---

## 🐛 Troubleshooting

### Issue 1: Form Fields Disabled
**Symptom:** Cannot type in form fields

**Solution:**
1. Check if MetaMask is connected
2. Look for green "✅ MetaMask Connected" box
3. If not connected, click "Connect MetaMask"
4. Approve connection in MetaMask popup

### Issue 2: "Backend API Not Available"
**Symptom:** Error message about backend API

**Solution:**
1. Start backend API:
   ```bash
   cd oracle-api-backend
   cargo run
   ```
2. Verify it's running on port 3001
3. Check `.env.local` has `NEXT_PUBLIC_USE_BACKEND_API=true`
4. Restart dashboard

### Issue 3: "Account-Based Execution" Error
**Symptom:** Message about account-based model

**Solution:**
This means backend API is not enabled. Enable it:
```bash
# In .env.local
NEXT_PUBLIC_USE_BACKEND_API=true
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Then restart dashboard and backend.

### Issue 4: MetaMask Not Found
**Symptom:** Red warning box about MetaMask

**Solution:**
1. Install MetaMask extension
2. Visit: https://metamask.io/download/
3. Restart browser after installation
4. Refresh the page

### Issue 5: Registration Fails
**Symptom:** Error message after clicking Register

**Possible Causes:**
1. **Backend not running** - Start backend API
2. **Linera service not running** - Start `linera service`
3. **Invalid stake amount** - Must be ≥ 100
4. **Network issues** - Check console for errors

**Debug Steps:**
```bash
# Check backend is running
curl http://localhost:3001/health

# Check Linera service
curl http://localhost:8080

# Check browser console (F12)
# Look for error messages
```

---

## 🎨 UI States

### 1. Initial State (No MetaMask)
```
┌────────────────────────────────────┐
│ ❌ MetaMask Not Found              │
│ Please install MetaMask extension  │
│ [Download MetaMask →]              │
└────────────────────────────────────┘
```

### 2. MetaMask Installed (Not Connected)
```
┌────────────────────────────────────┐
│ 🔐 Wallet Required                 │
│ Connect MetaMask to register       │
│ [Connect MetaMask]                 │
└────────────────────────────────────┘
```

### 3. MetaMask Connected
```
┌────────────────────────────────────┐
│ ✅ MetaMask Connected              │
│ 0x1234...5678                      │
│ [Disconnect]                       │
└────────────────────────────────────┘

[Form fields are now active]
```

### 4. Submitting
```
┌────────────────────────────────────┐
│ [Registering...]                   │
│ (Button disabled, spinner showing) │
└────────────────────────────────────┘
```

### 5. Success
```
┌────────────────────────────────────┐
│ ✅ Registration successful!        │
│ Redirecting...                     │
└────────────────────────────────────┘
```

### 6. Error
```
┌────────────────────────────────────┐
│ ❌ Registration failed             │
│ Error message here...              │
└────────────────────────────────────┘
```

---

## 📊 Backend API Status

The page shows backend API status at the bottom:

### Backend Enabled:
```
🔧 Backend API: ✓ Enabled (http://localhost:3001)
```

### Backend Disabled:
```
🔧 Backend API: ✗ Disabled (http://localhost:3001)
Enable backend API in .env.local for account-based execution
```

---

## 🔐 Security Notes

1. **Private Keys:** Never stored in frontend
2. **Signing:** Done by backend with chain owner key
3. **MetaMask:** Only used for address identification
4. **Transactions:** Signed and submitted by backend
5. **Certificate Hash:** Proof of successful submission

---

## 🎯 Testing Checklist

- [ ] Page loads without errors
- [ ] MetaMask detection works
- [ ] Connect MetaMask button works
- [ ] MetaMask popup appears
- [ ] Connection successful
- [ ] Address displays correctly
- [ ] Form fields become active
- [ ] Can type in all fields
- [ ] Validation works (min stake 100)
- [ ] Submit button works
- [ ] Backend API called
- [ ] Success message appears
- [ ] Certificate hash shown
- [ ] Redirect to voters page
- [ ] Voter appears in list

---

## 📚 Related Documentation

- [COMPLETE_TESTING_GUIDE.md](./COMPLETE_TESTING_GUIDE.md) - Full testing guide
- [DASHBOARD_FEATURES_MAP.md](./DASHBOARD_FEATURES_MAP.md) - Features overview
- [UI_UPDATE_COMPLETE.md](./UI_UPDATE_COMPLETE.md) - UI updates

---

## 🚀 Quick Start

**Minimal setup to test registration:**

```bash
# Terminal 1: Start Linera service
linera service --port 8080

# Terminal 2: Start Backend API
cd oracle-api-backend
cargo run

# Terminal 3: Start Dashboard
cd alethea-dashboard
npm run dev -- -p 4000

# Browser: Open
http://localhost:4000/register
```

Then:
1. Click "Connect MetaMask"
2. Approve connection
3. Fill in stake: 1000
4. Fill in name: "Test Voter"
5. Click "Register Voter"
6. Wait for success
7. Check voters page

---

**Happy registering!** 🎉

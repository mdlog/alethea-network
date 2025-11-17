# 🗺️ Dashboard Features Map

**Visual guide untuk semua fitur di Alethea Dashboard**

---

## 📊 Dashboard Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     TESTNET BANNER                          │
│  (Hidden on localhost, shows on testnet)                    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  [Logo] ALETHEA ORACLE                                      │
│  [Markets] [Voters] [Wallet] [Demo] [Docs]                 │
│  [MetaMask] [Create Market] [Refresh]                       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  MAIN CONTENT                                                │
│  (Changes based on current page)                            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FOOTER                                                      │
│  ALETHEA NETWORK - Conway Testnet - SDK v0.15.5            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏠 Page 1: Home / Markets

**URL:** `/` or `http://localhost:4000/`

```
┌─────────────────────────────────────────────────────────────┐
│  STATISTICS CARDS                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Total   │ │  Active  │ │ Resolved │ │  Total   │      │
│  │ Markets  │ │ Markets  │ │ Markets  │ │  Voters  │      │
│  │    12    │ │     8    │ │     4    │ │    25    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SEARCH & FILTER                                             │
│  [Search markets...        ] [All] [OPEN] [RESOLVED]       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  MARKETS GRID                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Market 1    │ │ Market 2    │ │ Market 3    │          │
│  │ Question    │ │ Question    │ │ Question    │          │
│  │ Outcomes    │ │ Outcomes    │ │ Outcomes    │          │
│  │ [OPEN]      │ │ [RESOLVED]  │ │ [OPEN]      │          │
│  │ Deadline    │ │ Result      │ │ Deadline    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Market 4    │ │ Market 5    │ │ Market 6    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Features:
1. **Statistics Cards** - Real-time stats
2. **Search** - Filter markets by question
3. **Filter** - Show All/OPEN/RESOLVED
4. **Markets Grid** - Display all markets
5. **Create Market** - Button in header
6. **Refresh** - Manual and auto-refresh (30s)

---

## 👥 Page 2: Voters

**URL:** `/voters` or `http://localhost:4000/voters`

```
┌─────────────────────────────────────────────────────────────┐
│  VOTER REGISTRATION                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Register as Voter                                     │ │
│  │                                                        │ │
│  │  Wallet Address: [0x...                            ]  │ │
│  │  Stake Amount:   [100                              ]  │ │
│  │  Name:           [Your Name                        ]  │ │
│  │                                                        │ │
│  │  [Register]  [Cancel]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  REGISTRATION PROGRESS (when submitting)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ⏳ Submitting...                                      │ │
│  │  ✓ Submitted! Certificate: 0xabc...                   │ │
│  │  ⏰ Confirming... [████████░░] 80%                     │ │
│  │  🎉 Confirmed! You are now a voter                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  REGISTERED VOTERS LIST                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Alice        | 0x1234... | 100 tokens | Active       │ │
│  │ Bob          | 0x5678... | 150 tokens | Active       │ │
│  │ Charlie      | 0x9abc... | 200 tokens | Active       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Features:
1. **Registration Form** - Register new voters
2. **Progress Tracking** - Multi-state UI
3. **Certificate Display** - Proof of submission
4. **Voter List** - All registered voters
5. **Voter Info** - Individual voter details

---

## 💼 Page 3: Wallet

**URL:** `/wallet` or `http://localhost:4000/wallet`

```
┌─────────────────────────────────────────────────────────────┐
│  METAMASK CONNECTION                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MetaMask Wallet                                       │ │
│  │                                                        │ │
│  │  Status: Not Connected                                │ │
│  │                                                        │ │
│  │  [Connect MetaMask]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  OR (when connected):                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MetaMask Wallet                                       │ │
│  │                                                        │ │
│  │  Status: ✓ Connected                                  │ │
│  │  Address: 0x1234...5678                               │ │
│  │  Network: Ethereum Mainnet                            │ │
│  │                                                        │ │
│  │  [Disconnect]  [Copy Address]                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  LINERA WALLET INFO                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Linera Configuration                                  │ │
│  │                                                        │ │
│  │  Chain ID:  95f032d7...                               │ │
│  │  App ID:    3fdcb1e9...                               │ │
│  │  Service:   http://localhost:8080                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Features:
1. **MetaMask Connection** - Connect/disconnect
2. **Wallet Info** - Address, network, balance
3. **Linera Config** - Chain and app info
4. **Copy Address** - Quick copy button

---

## 🎮 Page 4: Linera Demo

**URL:** `/linera-demo` or `http://localhost:4000/linera-demo`

```
┌─────────────────────────────────────────────────────────────┐
│  LINERA CLIENT DEMO                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Counter Demo                                          │ │
│  │                                                        │ │
│  │  Current Count: 42                                    │ │
│  │                                                        │ │
│  │  [-]  [+]                                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  CONNECTION STATUS                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Linera Service: ✓ Connected                          │ │
│  │  Chain ID: 95f032d7...                                │ │
│  │  Application: Counter Demo                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Features:
1. **Counter Demo** - Simple increment/decrement
2. **Connection Status** - Linera service status
3. **Chain Info** - Current chain details

---

## 📝 Page 5: Register (Alternative)

**URL:** `/register` or `http://localhost:4000/register`

Alternative voter registration interface (similar to /voters page)

---

## 🧪 Page 6: Test Pages

### Test Polling
**URL:** `/test-polling`

```
┌─────────────────────────────────────────────────────────────┐
│  POLLING TEST INTERFACE                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Test Voter Registration with Polling                  │ │
│  │                                                        │ │
│  │  Instructions:                                         │ │
│  │  1. Enter wallet address                              │ │
│  │  2. Set stake amount                                  │ │
│  │  3. Enter name                                        │ │
│  │  4. Click Register                                    │ │
│  │  5. Watch polling progress                            │ │
│  │                                                        │ │
│  │  [Test Form]                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Test Environment
**URL:** `/test-env`

```
┌─────────────────────────────────────────────────────────────┐
│  ENVIRONMENT VARIABLES                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NEXT_PUBLIC_CHAIN_ID: 95f032d7...                    │ │
│  │  NEXT_PUBLIC_REGISTRY_ID: 3fdcb1e9...                 │ │
│  │  NEXT_PUBLIC_GRAPHQL_URL: http://localhost:8080/...   │ │
│  │  NEXT_PUBLIC_SERVICE_URL: http://localhost:8080       │ │
│  │  ...                                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Components

### 1. TestnetBanner
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ [TESTNET] Running on Linera Conway Testnet         [×] │
│                                                              │
│ ⏳ Slow confirmations expected: Testnet validators...       │
│                                                              │
│ ✓ Transactions submitted  ⏰ Waiting  📋 Certificate       │
└─────────────────────────────────────────────────────────────┘
```
**Status:** Hidden on localhost ✅

### 2. Market Card
```
┌─────────────────────────────┐
│ Will it rain tomorrow?      │
│                             │
│ Outcomes:                   │
│ • Yes                       │
│ • No                        │
│                             │
│ Status: [OPEN]              │
│ Deadline: Nov 18, 2025      │
│ Creator: 0x1234...          │
└─────────────────────────────┘
```

### 3. Stats Card
```
┌─────────────────────────────┐
│ 📊                          │
│                             │
│ Total Markets               │
│       12                    │
└─────────────────────────────┘
```

---

## 🔄 User Flows

### Flow 1: Create Market
```
Home → Click "Create Market" → Fill Form → Submit → 
Wait for Confirmation → Success → Market Appears
```

### Flow 2: Register Voter
```
Voters Page → Fill Registration → Submit → 
Submitting → Certificate Hash → Confirming → 
Success/Timeout/Error
```

### Flow 3: Connect Wallet
```
Wallet Page → Click "Connect MetaMask" → 
Approve in MetaMask → Connected → Address Shows
```

---

## 📊 Feature Matrix

| Feature | Page | Status | Priority |
|---------|------|--------|----------|
| View Markets | Home | ✅ | High |
| Create Market | Home | ✅ | High |
| Search Markets | Home | ✅ | Medium |
| Filter Markets | Home | ✅ | Medium |
| Register Voter | Voters | ✅ | High |
| View Voters | Voters | ✅ | Medium |
| Connect MetaMask | Wallet | ✅ | High |
| View Wallet Info | Wallet | ✅ | Medium |
| Linera Demo | Demo | ✅ | Low |
| Test Polling | Test | ✅ | Low |
| TestnetBanner | All | ✅ | High |

---

## 🎯 Testing Priority

### Must Test (Critical):
1. ✅ Home page loads
2. ✅ Markets display
3. ✅ Create market
4. ✅ Register voter
5. ✅ Navigation

### Should Test (Important):
6. ✅ Search/filter
7. ✅ Wallet connection
8. ✅ Stats update
9. ✅ Refresh

### Nice to Test (Optional):
10. ✅ Demo page
11. ✅ Test pages
12. ✅ Responsive design

---

**Use this map to understand the complete dashboard structure!** 🗺️

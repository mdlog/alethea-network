# Why Demo Page Shows "mock_loaded"

## 🔍 Current Behavior

Demo page (`/linera-demo`) menampilkan:
```
Chain ID: mock_loaded
```

## 💡 Explanation

Ini **by design** karena:

### 1. Demo Page Purpose
Demo page dibuat untuk **educational purposes**:
- ✅ Show Linera client API patterns
- ✅ Demonstrate wallet management
- ✅ Show notification system
- ✅ No infrastructure needed

### 2. Mock Client Benefits
```typescript
// hooks/useLineraClient.ts
import { lineraClient } from '@/lib/services/linera-client-mock';
```

**Why mock?**
- ✅ Works without blockchain
- ✅ No wallet file needed
- ✅ Safe (no private keys)
- ✅ Fast (instant response)
- ✅ Educational value

### 3. Production Dashboard Different
Main dashboard (`/`) uses **real blockchain**:
```typescript
// lib/graphql.ts
const REGISTRY_URL = 'http://localhost:8080/chains/95f032d7.../applications/99740274...';
```

**Real data:**
- ✅ Actual chain ID: `95f032d7...`
- ✅ Real voters
- ✅ Real markets
- ✅ Real blockchain state

## 🎯 Two Different Approaches

### Demo Page (/linera-demo)
```
Purpose: Education & Tutorial
Method: Mock Client
Data: Simulated
Chain ID: mock_loaded
```

### Main Dashboard (/)
```
Purpose: Production Use
Method: HTTP GraphQL
Data: Real Blockchain
Chain ID: 95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
```

## 🔧 If You Want Real Chain ID in Demo

### Option 1: Update Demo to Use HTTP GraphQL

Create new service that uses HTTP instead of mock:

```typescript
// lib/services/linera-client-http.ts
export class HttpLineraClient {
  async initialize() {
    // Just check if service is available
    const response = await fetch('http://localhost:8080');
    return response.ok;
  }

  async createWalletFromFaucet() {
    // Return actual chain ID from env
    return {
      wallet: { type: 'http' },
      chainId: process.env.NEXT_PUBLIC_CHAIN_ID
    };
  }

  async graphqlQuery(query: string) {
    // Use actual HTTP GraphQL
    const response = await fetch(REGISTRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return response.json();
  }
}
```

### Option 2: Keep Mock but Show Real Chain ID

Update mock to use real chain ID:

```typescript
// lib/services/linera-client-mock.ts
const REAL_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || 'mock_loaded';

async createWalletFromFaucet() {
  // Use real chain ID instead of random
  this.state.chainId = REAL_CHAIN_ID;
  return { wallet: mockWallet, chainId: REAL_CHAIN_ID };
}
```

### Option 3: Add Toggle

Let user choose mock or real:

```typescript
// .env.local
NEXT_PUBLIC_USE_MOCK_CLIENT=true  # false for real

// hooks/useLineraClient.ts
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_CLIENT === 'true';
const client = useMock ? mockClient : httpClient;
```

## 💡 Recommendation

**Keep current implementation** because:

1. **Clear Separation**
   - Demo = Educational (mock)
   - Dashboard = Production (real)
   - No confusion

2. **Safety**
   - Demo doesn't need real wallet
   - No risk of accidental transactions
   - Safe for users to experiment

3. **Performance**
   - Mock is instant
   - No network latency
   - Better demo experience

4. **Purpose**
   - Demo shows **patterns**, not real data
   - Dashboard shows **real data**
   - Each serves its purpose

## 🎓 Understanding the Architecture

```
┌─────────────────────────────────────────────┐
│           Alethea Dashboard                 │
├─────────────────────────────────────────────┤
│                                             │
│  Main Dashboard (/)                         │
│  ├─ HTTP GraphQL                            │
│  ├─ Real Blockchain                         │
│  └─ Chain: 95f032d7...                      │
│                                             │
│  Demo Page (/linera-demo)                   │
│  ├─ Mock Client                             │
│  ├─ Simulated                               │
│  └─ Chain: mock_loaded                      │
│                                             │
└─────────────────────────────────────────────┘
```

## 📊 Comparison

| Feature | Demo Page | Main Dashboard |
|---------|-----------|----------------|
| Purpose | Education | Production |
| Client | Mock | HTTP GraphQL |
| Chain ID | mock_loaded | 95f032d7... |
| Data | Simulated | Real |
| Wallet | Not needed | Not needed* |
| Speed | Instant | Fast |
| Safety | 100% | 100% |

*Both use server-side operations, no wallet in browser

## ✅ What to Do

### If You Want to See Real Data
👉 **Use Main Dashboard** at `http://localhost:4000/`
- Real chain ID
- Real voters
- Real markets
- Real blockchain state

### If You Want to Learn Linera Patterns
👉 **Use Demo Page** at `http://localhost:4000/linera-demo`
- Shows API patterns
- Safe to experiment
- No setup needed
- Educational value

## 🚀 Quick Fix (If You Really Want)

If you absolutely want demo page to show real chain ID:

```typescript
// alethea-dashboard/lib/services/linera-client-mock.ts
// Line ~50, change:
const mockChainId = 'mock_' + Math.random().toString(36).substring(2, 15);

// To:
const mockChainId = process.env.NEXT_PUBLIC_CHAIN_ID || 'mock_loaded';
```

But honestly, **current implementation is better** because it clearly shows demo vs production.

---

**Recommendation**: Keep as-is
**Reason**: Clear separation between demo and production
**Alternative**: Use main dashboard for real data

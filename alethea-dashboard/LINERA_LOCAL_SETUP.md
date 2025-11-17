# Using Real Linera Client with Local Service

## ✅ Prerequisites Met

Anda sudah punya:
- ✅ Linera service running di `http://localhost:8080`
- ✅ Wallet dengan beberapa chains
- ✅ Alethea Registry deployed di chain `95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4`

## 🎯 Current Status

**Using**: Mock Client (untuk demo)
**Reason**: `@linera/client` WebAssembly membutuhkan setup khusus untuk browser

## 🔧 Options untuk Production

### Option 1: HTTP GraphQL (Recommended - Current)

**Pros:**
- ✅ Sudah working
- ✅ No WebAssembly issues
- ✅ Direct HTTP to Linera service
- ✅ Simple dan reliable

**Implementation:**
```typescript
// lib/graphql.ts (already implemented)
const REGISTRY_URL = 'http://localhost:8080/chains/CHAIN_ID/applications/APP_ID';

async function query(graphqlQuery: string) {
  const response = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: graphqlQuery })
  });
  return response.json();
}
```

**Status**: ✅ Already working in dashboard

### Option 2: Linera Client WebAssembly (Complex)

**Challenges:**
1. WebAssembly needs wallet file
2. Browser can't access local filesystem
3. Need to load wallet via API or input

**Possible Solutions:**

#### A. Load Wallet via File Upload

```typescript
// User uploads wallet.json file
async function loadWalletFromFile(file: File) {
  const walletJson = await file.text();
  const wallet = await linera.Wallet.fromJson(walletJson);
  const client = await new linera.Client(wallet);
  return client;
}
```

#### B. Export Wallet to JSON

```bash
# Export wallet
linera wallet show --with-private-keys > wallet.json

# User can then upload this file to dashboard
```

**Cons:**
- Security risk (private keys in browser)
- Complex UX
- Not recommended for production

### Option 3: Hybrid Approach (Best of Both)

Use HTTP GraphQL for queries, WebAssembly for signing:

```typescript
class HybridClient {
  async query(query: string) {
    // Use HTTP for queries (fast, simple)
    return fetch(REGISTRY_URL, {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  async mutate(mutation: string) {
    // Use WebAssembly for mutations (signed)
    return lineraClient.graphqlMutation(mutation);
  }
}
```

## 📊 Comparison

| Feature | HTTP GraphQL | WebAssembly Client | Hybrid |
|---------|-------------|-------------------|--------|
| Setup | Easy | Complex | Medium |
| Security | Server-side | Client-side | Mixed |
| Performance | Fast | Medium | Fast |
| Signing | Server | Client | Client |
| Recommended | ✅ Yes | ❌ No | 🔄 Maybe |

## 🚀 Current Implementation

Dashboard menggunakan **HTTP GraphQL** (Option 1):

```typescript
// lib/graphql.ts
export async function queryGraphQL(query: string) {
  const response = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
}

// Usage in components
const markets = await getActiveMarkets();
const stats = await getProtocolStats();
```

**Benefits:**
- ✅ No WebAssembly complexity
- ✅ Works with local Linera service
- ✅ Fast and reliable
- ✅ Easy to debug

## 🎓 Why Mock Client for Demo?

Mock client digunakan untuk **Linera Demo page** karena:

1. **Educational Purpose**
   - Show Linera client API
   - Demonstrate patterns
   - No infrastructure needed

2. **Development Speed**
   - Fast iteration
   - No wallet setup
   - Works offline

3. **User Experience**
   - No wallet upload needed
   - Instant demo
   - No security concerns

## 🔄 Migration Path

### Current (Working)
```
Dashboard → HTTP GraphQL → Linera Service → Blockchain
```

### Future (If Needed)
```
Dashboard → WebAssembly Client → Linera Service → Blockchain
```

### Recommended (Stay Current)
```
Dashboard → HTTP GraphQL → Linera Service → Blockchain
         ↓
    Mock Client for Demo Page Only
```

## 💡 Recommendations

### For Production Dashboard
✅ **Keep using HTTP GraphQL**
- Already working
- Simple and reliable
- No WebAssembly complexity
- Easy to maintain

### For Demo/Tutorial
✅ **Use Mock Client**
- Educational value
- No setup needed
- Safe for users

### For Advanced Features
🔄 **Consider Hybrid**
- HTTP for queries
- WebAssembly for client-side signing
- Best of both worlds

## 📝 Testing Current Setup

### Test HTTP GraphQL (Production)
```bash
# Test registry endpoint
curl -X POST http://localhost:8080/chains/95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4/applications/640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6 \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterCount }"}'
```

### Test Dashboard
```bash
cd alethea-dashboard
npm run dev
# Open: http://localhost:4000
```

### Test Demo Page
```bash
# Open: http://localhost:4000/linera-demo
# Uses mock client - no real blockchain needed
```

## 🎯 Conclusion

**Current Setup is Optimal:**
- ✅ HTTP GraphQL for production features
- ✅ Mock client for demo/tutorial
- ✅ Local Linera service running
- ✅ All features working

**No Need to Change:**
- WebAssembly client adds complexity
- Current approach is simpler and more reliable
- Mock client serves its purpose for demos

**If You Really Want WebAssembly:**
1. Export wallet to JSON
2. Implement file upload
3. Handle security properly
4. Test thoroughly

But honestly, **current setup is better** for production use.

---

**Recommendation**: Keep current implementation
**Status**: ✅ Working and Optimal
**Next Steps**: Focus on features, not infrastructure changes

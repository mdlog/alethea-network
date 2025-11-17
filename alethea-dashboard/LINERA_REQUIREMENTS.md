# Linera Client Requirements - Penjelasan Lengkap

## 🚨 Mengapa Error "Storage Contract Tidak Ada"

### Root Cause

Error `RuntimeError: unreachable executed` dan "storage contract tidak ada" terjadi karena:

1. **Linera Client Bukan Library Standalone**
   - `@linera/client` adalah **client library** untuk berkomunikasi dengan blockchain
   - Bukan simulator atau mock blockchain
   - Membutuhkan koneksi ke **actual Linera node**

2. **Missing Infrastructure**
   ```
   ❌ Tidak ada Linera node running
   ❌ Tidak ada storage backend (database)
   ❌ Tidak ada validator network
   ❌ Contract belum di-deploy
   ```

3. **WebAssembly Limitation**
   - WebAssembly di browser tidak bisa akses filesystem
   - Tidak bisa akses database lokal
   - Tidak bisa spawn processes (untuk validator)

## 📋 Yang Dibutuhkan untuk Linera Client Bekerja

### Option 1: Full Linera Setup (Production)

```bash
# 1. Install Linera CLI
cargo install linera-service

# 2. Start local Linera network
linera net up

# 3. Deploy contract
linera project publish-and-create

# 4. Start node service
linera service --port 8080

# 5. Baru bisa connect dari browser
```

**Struktur:**
```
Browser (WebAssembly Client)
    ↓ HTTP/WebSocket
Linera Service (localhost:8080)
    ↓
Linera Node (Validator)
    ↓
Storage (RocksDB/Database)
    ↓
Blockchain State
```

### Option 2: Connect to Testnet (Recommended)

```javascript
// Connect ke testnet yang sudah running
const faucet = new linera.Faucet('https://faucet.testnet-conway.linera.net');
const wallet = await faucet.createWallet();
const client = new linera.Client(wallet);

// Testnet sudah punya:
// ✅ Validators running
// ✅ Storage backend
// ✅ Contracts deployed
```

**Struktur:**
```
Browser (WebAssembly Client)
    ↓ HTTPS
Testnet Faucet
    ↓
Testnet Validators
    ↓
Testnet Storage
    ↓
Deployed Contracts
```

### Option 3: Mock Implementation (Demo Only)

```javascript
// Untuk demo/testing tanpa blockchain
// Tidak butuh infrastructure
// Hanya simulasi di memory
```

## 🔧 Kenapa Tutorial Linera Bisa Bekerja?

Tutorial di dokumentasi Linera bekerja karena:

1. **Menggunakan Testnet**
   ```javascript
   // Tutorial connect ke testnet yang sudah running
   const faucet = new linera.Faucet('https://faucet.testnet-conway.linera.net');
   ```

2. **Counter App Sudah Di-Deploy**
   ```javascript
   // App ID ini sudah exist di testnet
   const COUNTER_APP_ID = '2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8';
   ```

3. **Testnet Infrastructure**
   - Validators: ✅ Running
   - Storage: ✅ Available
   - Contracts: ✅ Deployed
   - Network: ✅ Active

## 🎯 Solusi untuk Alethea Dashboard

### Solusi 1: Connect ke Testnet (Ideal)

**Pros:**
- Real blockchain interaction
- Actual Linera experience
- Real-time notifications
- Production-like environment

**Cons:**
- Butuh internet connection
- Tergantung testnet availability
- Slower (network latency)

**Implementation:**
```typescript
// Gunakan real linera-client
import * as linera from '@linera/client';

await linera.default();
const faucet = new linera.Faucet('https://faucet.testnet-conway.linera.net');
const wallet = await faucet.createWallet();
const client = new linera.Client(wallet);

// Connect ke Alethea Registry di testnet
const backend = await client.frontend().application(REGISTRY_APP_ID);
```

**Requirements:**
1. Alethea Registry harus di-deploy ke testnet
2. Testnet harus accessible
3. Faucet harus working

### Solusi 2: Local Linera Network

**Pros:**
- Full control
- Fast (no network latency)
- Can test everything
- Production-ready

**Cons:**
- Complex setup
- Butuh Rust toolchain
- Butuh deploy contracts locally
- Resource intensive

**Setup:**
```bash
# 1. Install Linera
cargo install linera-service

# 2. Start local network
linera net up

# 3. Deploy Alethea contracts
cd oracle-registry-v2
linera project publish-and-create

# 4. Start service
linera service --port 8080

# 5. Update .env.local
NEXT_PUBLIC_LINERA_SERVICE=http://localhost:8080
```

### Solusi 3: Mock Implementation (Current)

**Pros:**
- No infrastructure needed
- Fast development
- Easy testing
- Works offline

**Cons:**
- Not real blockchain
- No actual persistence
- Simulated behavior only
- Demo purposes only

**Current Implementation:**
```typescript
// lib/services/linera-client-mock.ts
// Simulates Linera behavior without blockchain
```

## 🚀 Recommended Approach

### Phase 1: Development (Current)
✅ **Use Mock Implementation**
- Fast iteration
- No infrastructure overhead
- Focus on UI/UX

### Phase 2: Integration Testing
🔄 **Connect to Testnet**
- Deploy Alethea to testnet
- Test real blockchain interaction
- Verify all features

### Phase 3: Production
🎯 **Deploy to Mainnet**
- Full Linera infrastructure
- Production validators
- Real storage backend

## 📊 Comparison

| Feature | Mock | Testnet | Local Network | Mainnet |
|---------|------|---------|---------------|---------|
| Setup Time | 0 min | 5 min | 30 min | Hours |
| Infrastructure | None | External | Local | Production |
| Real Blockchain | ❌ | ✅ | ✅ | ✅ |
| Persistence | ❌ | ✅ | ✅ | ✅ |
| Notifications | Simulated | Real | Real | Real |
| Cost | Free | Free | Free | Gas fees |
| Speed | Instant | Medium | Fast | Medium |
| Reliability | 100% | 95% | 99% | 99.9% |

## 🔍 Debugging Tips

### Check if Testnet is Available
```bash
curl https://faucet.testnet-conway.linera.net
```

### Check if Contract Exists
```bash
# Query testnet
curl -X POST https://testnet-conway.linera.net/chains/YOUR_CHAIN/applications/YOUR_APP \
  -H "Content-Type: application/json" \
  -d '{"query": "query { __typename }"}'
```

### Check Local Linera
```bash
# Check if service running
curl http://localhost:8080

# Check wallet
linera wallet show
```

## 💡 Best Practice

1. **Development**: Use Mock
   - Fast iteration
   - No dependencies
   - Focus on features

2. **Testing**: Use Testnet
   - Real blockchain
   - Verify integration
   - Test edge cases

3. **Production**: Use Mainnet
   - Full infrastructure
   - Production validators
   - Real users

## 🎓 Learning Path

1. **Understand the Architecture**
   ```
   Client (Browser) → Service (Node) → Blockchain → Storage
   ```

2. **Start with Mock**
   - Learn the API
   - Build UI
   - Test flows

3. **Move to Testnet**
   - Deploy contracts
   - Test integration
   - Verify behavior

4. **Deploy to Production**
   - Setup infrastructure
   - Deploy validators
   - Launch!

## 📚 Resources

- [Linera Documentation](https://linera.dev)
- [Linera GitHub](https://github.com/linera-io/linera-protocol)
- [Testnet Info](https://linera.dev/testnet)
- [Deploy Guide](https://linera.dev/developers/deploy)

---

**Summary**: 
- ❌ `@linera/client` alone tidak cukup
- ✅ Butuh blockchain backend (testnet/local/mainnet)
- ✅ Untuk demo, gunakan mock implementation
- ✅ Untuk production, deploy ke testnet/mainnet

**Current Status**: Using mock implementation for demo purposes
**Next Step**: Deploy Alethea to testnet for real blockchain interaction

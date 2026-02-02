# For Builders

## Integrasi Alethea Resolution untuk Market DApps Anda

Panduan ini ditujukan untuk developer yang memiliki prediction market DApps dan ingin menggunakan Alethea Network sebagai solusi resolution yang terdesentralisasi.

## 🎯 Mengapa Menggunakan Alethea?

Alethea Network menyediakan:
- **Decentralized Resolution**: Hasil market ditentukan oleh konsensus voter, bukan otoritas terpusat
- **Commit-Reveal Voting**: Sistem voting yang aman dan mencegah manipulasi
- **Cross-Chain Support**: Bekerja di berbagai blockchain melalui Linera protocol
- **Transparent & Auditable**: Semua voting dan hasil dapat diverifikasi on-chain
- **Flexible Integration**: SDK yang mudah digunakan untuk berbagai use case

## 📋 Persyaratan

Untuk mengintegrasikan Alethea ke market DApp Anda:

1. **Linera Chain**: Market DApp Anda harus berjalan di Linera atau kompatibel dengan Linera messaging
2. **Oracle Registry Connection**: Koneksi ke Alethea Oracle Registry
3. **SDK Installation**: Install Alethea SDK di project Anda

## 🚀 Quick Start Integration

### 1. Install SDK

```bash
# Untuk TypeScript/JavaScript projects
npm install @alethea/sdk

# Atau untuk Rust projects
cargo add alethea-oracle-sdk
```

### 2. Inisialisasi Client

```typescript
import { AletheaClient } from '@alethea/sdk';

const client = new AletheaClient({
  registryAppId: 'YOUR_REGISTRY_APP_ID',
  chainId: 'YOUR_CHAIN_ID',
  nodeUrl: 'https://linera-node.example.com'
});
```

### 3. Buat Query untuk Market

Ketika market Anda dibuat, buat query di Alethea untuk resolution:

```typescript
// Contoh: Market prediction "Will Bitcoin reach $100k by end of 2025?"
const query = await client.createQuery({
  question: "Will Bitcoin reach $100k by end of 2025?",
  description: "Bitcoin price prediction for end of year 2025",
  resolutionCriteria: "Based on CoinMarketCap closing price on Dec 31, 2025",
  commitDeadline: new Date('2025-12-31T23:00:00Z'),
  revealDeadline: new Date('2026-01-01T23:00:00Z'),
  metadata: {
    marketId: 'your-market-id',
    category: 'crypto',
    source: 'coinmarketcap'
  }
});

console.log('Query created:', query.id);
```

## 🔄 Integration Workflow

### Step 1: Market Creation
Ketika user membuat market di DApp Anda:

```typescript
async function createMarket(marketData) {
  // 1. Buat market di DApp Anda
  const market = await yourDApp.createMarket(marketData);
  
  // 2. Buat query di Alethea untuk resolution
  const query = await aletheaClient.createQuery({
    question: marketData.question,
    description: marketData.description,
    resolutionCriteria: marketData.criteria,
    commitDeadline: marketData.endDate,
    revealDeadline: addHours(marketData.endDate, 24),
    metadata: {
      marketId: market.id,
      dappName: 'YourDApp'
    }
  });
  
  // 3. Simpan query ID di market Anda
  await yourDApp.updateMarket(market.id, {
    aletheaQueryId: query.id
  });
  
  return { market, query };
}
```

### Step 2: Monitor Resolution Status

```typescript
async function checkResolutionStatus(queryId) {
  const status = await aletheaClient.getQueryStatus(queryId);
  
  return {
    phase: status.phase, // 'Pending', 'Commit', 'Reveal', 'Resolved'
    isResolved: status.isResolved,
    result: status.result,
    consensus: status.consensus,
    totalVotes: status.totalVotes
  };
}
```

### Step 3: Resolve Market

Ketika query sudah resolved, update market Anda:

```typescript
async function resolveMarket(marketId) {
  // 1. Ambil query ID dari market
  const market = await yourDApp.getMarket(marketId);
  
  // 2. Cek status resolution di Alethea
  const resolution = await aletheaClient.getResolution(market.aletheaQueryId);
  
  if (resolution.isResolved) {
    // 3. Resolve market dengan hasil dari Alethea
    await yourDApp.resolveMarket(marketId, {
      result: resolution.result,
      consensus: resolution.consensus,
      proof: resolution.proof // Untuk verifikasi on-chain
    });
    
    // 4. Distribute payouts
    await yourDApp.distributePayout(marketId);
  }
}
```

## 🔧 Advanced Integration

### Auto-Trigger Resolution

Anda dapat mengatur auto-trigger untuk otomatis resolve market ketika query sudah resolved:

```typescript
// Setup listener untuk resolution events
aletheaClient.onQueryResolved(async (event) => {
  const { queryId, result, consensus } = event;
  
  // Cari market yang terkait dengan query ini
  const market = await yourDApp.findMarketByQueryId(queryId);
  
  if (market) {
    await resolveMarket(market.id);
  }
});
```

### Custom Resolution Logic

Untuk use case yang lebih kompleks:

```typescript
async function customResolution(marketId) {
  const market = await yourDApp.getMarket(marketId);
  const resolution = await aletheaClient.getResolution(market.aletheaQueryId);
  
  // Implementasi logic custom Anda
  if (resolution.consensus >= 0.75) { // 75% consensus
    // High confidence resolution
    await yourDApp.resolveMarket(marketId, {
      result: resolution.result,
      confidence: 'high'
    });
  } else if (resolution.consensus >= 0.60) {
    // Medium confidence - mungkin perlu review manual
    await yourDApp.flagForReview(marketId, {
      reason: 'low_consensus',
      consensus: resolution.consensus
    });
  } else {
    // Low consensus - cancel market atau extend voting
    await yourDApp.handleLowConsensus(marketId);
  }
}
```

## 📊 SDK API Reference

### Create Query

```typescript
interface CreateQueryParams {
  question: string;
  description: string;
  resolutionCriteria: string;
  commitDeadline: Date;
  revealDeadline: Date;
  metadata?: Record<string, any>;
}

client.createQuery(params: CreateQueryParams): Promise<Query>
```

### Get Query Status

```typescript
client.getQueryStatus(queryId: string): Promise<QueryStatus>
```

### Get Resolution

```typescript
client.getResolution(queryId: string): Promise<Resolution>
```

### Subscribe to Events

```typescript
client.onQueryResolved(callback: (event: ResolutionEvent) => void)
client.onQueryCreated(callback: (event: QueryEvent) => void)
```

## 🔗 Cross-Chain Integration

Jika market DApp Anda berjalan di chain yang berbeda:

```typescript
// Setup cross-chain messaging
const crossChainClient = new AletheaClient({
  registryAppId: 'REGISTRY_APP_ID',
  sourceChainId: 'YOUR_MARKET_CHAIN_ID',
  targetChainId: 'ALETHEA_CHAIN_ID',
  bridgeConfig: {
    // Konfigurasi bridge sesuai kebutuhan
  }
});

// Create query dengan cross-chain support
const query = await crossChainClient.createQueryCrossChain({
  question: "Market question",
  // ... params lainnya
});
```

## 💡 Best Practices

### 1. Deadline Management
```typescript
// Berikan waktu yang cukup untuk voting
const commitDeadline = marketEndDate;
const revealDeadline = addHours(commitDeadline, 24); // 24 jam untuk reveal
```

### 2. Error Handling
```typescript
try {
  const query = await client.createQuery(params);
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    // Handle insufficient balance
  } else if (error.code === 'INVALID_DEADLINE') {
    // Handle invalid deadline
  }
  // Log error dan notify user
}
```

### 3. Caching & Performance
```typescript
// Cache query status untuk mengurangi network calls
const cache = new Map();

async function getCachedQueryStatus(queryId) {
  if (cache.has(queryId)) {
    const cached = cache.get(queryId);
    if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
  }
  
  const status = await client.getQueryStatus(queryId);
  cache.set(queryId, { data: status, timestamp: Date.now() });
  return status;
}
```

## 🎨 UI Components

Kami menyediakan pre-built UI components untuk mempercepat integrasi:

```typescript
import { QueryStatusWidget, VotingInterface } from '@alethea/ui-components';

// Display query status di market page Anda
<QueryStatusWidget 
  queryId={market.aletheaQueryId}
  showVoterCount={true}
  showConsensus={true}
/>

// Optional: Tampilkan voting interface untuk voters
<VotingInterface 
  queryId={market.aletheaQueryId}
  onVoteSubmitted={handleVoteSubmitted}
/>
```

## 📈 Analytics & Monitoring

Track performa resolution untuk market Anda:

```typescript
const analytics = await client.getAnalytics({
  marketIds: ['market-1', 'market-2'],
  dateRange: {
    from: '2025-01-01',
    to: '2025-12-31'
  }
});

console.log({
  totalQueries: analytics.totalQueries,
  resolvedQueries: analytics.resolvedQueries,
  averageConsensus: analytics.averageConsensus,
  averageResolutionTime: analytics.averageResolutionTime
});
```

## 🧪 Testing

Test integrasi Anda di testnet sebelum production:

```typescript
// Use testnet configuration
const testClient = new AletheaClient({
  registryAppId: 'TEST_REGISTRY_APP_ID',
  chainId: 'TEST_CHAIN_ID',
  nodeUrl: 'https://testnet.linera.example.com',
  network: 'testnet'
});

// Run integration tests
describe('Alethea Integration', () => {
  it('should create query and resolve market', async () => {
    const market = await createTestMarket();
    const query = await testClient.createQuery({...});
    
    // Simulate voting
    await simulateVoting(query.id);
    
    // Check resolution
    const resolution = await testClient.getResolution(query.id);
    expect(resolution.isResolved).toBe(true);
  });
});
```

## 📚 Example Projects

Lihat contoh implementasi lengkap:

- [Simple Prediction Market](../../simple-market/) - Contoh market sederhana dengan Alethea integration
- [Sports Betting DApp](../../examples/sports-betting/) - DApp betting olahraga
- [Governance Voting](../../examples/governance/) - Sistem voting governance

## 🆘 Troubleshooting

### Query Tidak Terbuat
- Verifikasi Registry App ID sudah benar
- Cek balance chain Anda untuk gas fees
- Pastikan deadline valid (di masa depan)

### Resolution Tidak Muncul
- Tunggu hingga reveal phase selesai
- Cek apakah ada cukup voter yang participate
- Verifikasi query ID yang digunakan

### Cross-Chain Issues
- Pastikan bridge configuration sudah benar
- Cek status message di kedua chain
- Verifikasi chain IDs

## 💬 Support & Community

- **Documentation**: [Full API Docs](./api-reference.md)
- **GitHub**: [github.com/alethea-network](https://github.com/alethea-network)
- **Discord**: Join our builder community
- **Email**: builders@alethea.network

## 🔄 Migration Guide

Jika Anda sudah memiliki market DApp dengan resolution system lain:

1. [Migration from Centralized Oracle](../guides/MIGRATION_FROM_CENTRALIZED.md)
2. [Migration from Chainlink](../guides/MIGRATION_FROM_CHAINLINK.md)
3. [Migration from UMA](../guides/MIGRATION_FROM_UMA.md)

---

**Mulai build dengan Alethea dan ciptakan prediction market yang lebih terdesentralisasi dan trustless!**

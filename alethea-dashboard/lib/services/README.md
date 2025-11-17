# Alethea Services Documentation

Dokumentasi lengkap untuk menggunakan services dan mutations di Alethea Dashboard.

## 📁 Struktur Services

```
lib/
├── services/
│   ├── index.ts                    # Export semua services
│   ├── registry.service.ts         # Market management
│   └── voter.service.ts            # Voting operations
├── hooks/
│   ├── index.ts                    # Export semua hooks
│   ├── useMarket.ts                # Market hooks
│   ├── useVoting.ts                # Voting hooks
│   └── useResolution.ts            # Resolution hooks (via Registry)
└── graphql.ts                      # GraphQL client
```

## 🚀 Quick Start

### 1. Registry Service - Market Management

```typescript
import { RegistryService } from '@/lib/services';

// Create new market
const market = await RegistryService.createMarket({
  question: "Will Bitcoin reach $100k in 2025?",
  outcomes: ["Yes", "No"],
  deadline: Date.now() + 86400000, // 24 hours
  metadata: "Crypto prediction market"
});

// Get market details
const marketDetails = await RegistryService.getMarket(1);

// Get all active markets
const activeMarkets = await RegistryService.getActiveMarkets();

// Update market status
const updated = await RegistryService.updateMarketStatus(1, "CLOSED");

// Register oracle
const oracle = await RegistryService.registerOracle({
  name: "My Oracle",
  endpoint: "https://oracle.example.com",
  publicKey: "0x..."
});
```

### 2. Voter Service - Voting Operations

```typescript
import { VoterService } from '@/lib/services';

// Register as voter
const voter = await VoterService.registerVoter({
  address: "0x123...",
  stake: 1000
});

// Submit vote
const vote = await VoterService.submitVote({
  marketId: 1,
  outcomeIndex: 0,
  confidence: 95
});

// Get voter stats
const stats = await VoterService.getVoterStats("0x123...");

// Update stake
const updatedVoter = await VoterService.updateVoterStake("0x123...", 2000);

// Get market votes
const votes = await VoterService.getMarketVotes(1);
```

## 🎣 Using React Hooks

### useMarket Hook

```typescript
'use client';

import { useMarket } from '@/lib/hooks';

export default function CreateMarketForm() {
  const { createMarket, loading, error } = useMarket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const market = await createMarket({
      question: "Your question?",
      outcomes: ["Yes", "No"],
      deadline: Date.now() + 86400000
    });

    if (market) {
      console.log('Market created:', market);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Market'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### useVoting Hook

```typescript
'use client';

import { useVoting } from '@/lib/hooks';

export default function VoteButton({ marketId, outcomeIndex }) {
  const { submitVote, loading, error } = useVoting();

  const handleVote = async () => {
    const vote = await submitVote({
      marketId,
      outcomeIndex,
      confidence: 100
    });

    if (vote) {
      console.log('Vote submitted:', vote);
    }
  };

  return (
    <>
      <button onClick={handleVote} disabled={loading}>
        {loading ? 'Voting...' : 'Vote'}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
```

### useResolution Hook

**Note:** Resolution operations are now handled via Registry, not a separate coordinator.

```typescript
'use client';

import { useResolution } from '@/lib/hooks';

export default function ResolutionStatus({ marketId }) {
  const { getResolutionStatus, getMarketDetails, loading, error } = useResolution();

  const handleCheckStatus = async () => {
    const status = await getResolutionStatus(marketId);
    console.log('Resolution status:', status);
  };

  const handleGetDetails = async () => {
    const details = await getMarketDetails(marketId);
    console.log('Market details:', details);
  };

  return (
    <>
      <button onClick={handleCheckStatus} disabled={loading}>
        {loading ? 'Loading...' : 'Check Status'}
      </button>
      <button onClick={handleGetDetails} disabled={loading}>
        {loading ? 'Loading...' : 'Get Details'}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
```

**Note:** For actual resolution requests (mutations), use Linera operations via `operations.ts`:
```typescript
import { createMarketDirect } from '@/lib/helpers/operations';

// Create market via Linera operation
const result = await createMarketDirect(params, chainUrl, applicationId);
```

## 📊 Type Definitions

### Market Types

```typescript
interface Market {
  id: number;
  question: string;
  outcomes: string[];
  status: string;
  createdAt: number;
  deadline: number;
  metadata?: string;
}

interface CreateMarketParams {
  question: string;
  outcomes: string[];
  deadline: number;
  metadata?: string;
}
```

### Voter Types

```typescript
interface Vote {
  marketId: number;
  voter: string;
  outcomeIndex: number;
  confidence: number;
  timestamp: number;
}

interface Voter {
  address: string;
  reputation: number;
  totalVotes: number;
  correctVotes: number;
  stake: number;
  isActive: boolean;
}

interface VoterStats {
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  reputation: number;
}
```

### Resolution Types

```typescript
interface ResolutionRequest {
  marketId: number;
  status: string;
  requestedAt: number;
}

interface MarketResolution {
  marketId: number;
  winningOutcome: number;
  finalizedAt: number;
  status: string;
}

interface VoteAggregation {
  marketId: number;
  voteCount: number;
  consensus: number;
  aggregatedAt: number;
  distribution: number[];
}
```

## 🔧 Error Handling

Semua services menggunakan try-catch dan mengembalikan error yang informatif:

```typescript
try {
  const market = await RegistryService.createMarket(params);
  // Success
} catch (error) {
  console.error('Failed to create market:', error);
  // Handle error
}
```

Dengan hooks, error handling lebih mudah:

```typescript
const { createMarket, loading, error } = useMarket();

// error state otomatis di-update
if (error) {
  console.log('Error:', error);
}
```

## 🎯 Best Practices

1. **Gunakan hooks di client components** - Hooks hanya bisa digunakan di client components (`'use client'`)

2. **Error handling** - Selalu handle error dengan proper feedback ke user

3. **Loading states** - Gunakan loading state untuk UX yang lebih baik

4. **Type safety** - Manfaatkan TypeScript types untuk menghindari bugs

5. **Reusability** - Services bisa digunakan di mana saja (components, API routes, etc.)

## 📝 Examples

Lihat folder `examples/` untuk contoh implementasi lengkap:
- Create Market Form
- Voting Interface
- Market Resolution Dashboard
- Voter Registration

## 🔗 Related

- [GraphQL Client Documentation](../graphql.ts)
- [API Endpoints Configuration](.env.local)
- [Component Examples](../../components/)

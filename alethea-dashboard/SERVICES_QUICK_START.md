# Quick Start - Alethea Services & Mutations

## 🚀 Langsung Pakai!

### Import Services

```typescript
// Import individual services
import { RegistryService, VoterService, CoordinatorService } from '@/lib/services';

// Or import hooks
import { useMarket, useVoting, useResolution } from '@/lib/hooks';
```

## 📝 Contoh Cepat

### 1. Create Market (Server/Client)

```typescript
import { RegistryService } from '@/lib/services';

const market = await RegistryService.createMarket({
  question: "Will it rain tomorrow?",
  outcomes: ["Yes", "No"],
  deadline: Date.now() + 86400000 // 24 hours
});
```

### 2. Submit Vote (Server/Client)

```typescript
import { VoterService } from '@/lib/services';

const vote = await VoterService.submitVote({
  marketId: 1,
  outcomeIndex: 0,
  confidence: 100
});
```

### 3. Resolve Market (Server/Client)

```typescript
import { CoordinatorService } from '@/lib/services';

// Aggregate votes
const agg = await CoordinatorService.aggregateVotes(1);

// Finalize
const result = await CoordinatorService.finalizeMarket({
  marketId: 1,
  winningOutcome: agg.consensus
});
```

## 🎣 Dengan React Hooks (Client Only)

### Create Market Form

```typescript
'use client';

import { useMarket } from '@/lib/hooks';

export default function CreateForm() {
  const { createMarket, loading, error } = useMarket();

  const handleSubmit = async () => {
    const market = await createMarket({
      question: "Your question?",
      outcomes: ["Yes", "No"],
      deadline: Date.now() + 86400000
    });
    
    if (market) alert('Market created!');
  };

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Creating...' : 'Create'}
    </button>
  );
}
```

### Voting Button

```typescript
'use client';

import { useVoting } from '@/lib/hooks';

export default function VoteButton({ marketId, outcomeIndex }) {
  const { submitVote, loading } = useVoting();

  return (
    <button 
      onClick={() => submitVote({ marketId, outcomeIndex })}
      disabled={loading}
    >
      Vote
    </button>
  );
}
```

## 📦 Available Services

### RegistryService
- `createMarket()` - Buat market baru
- `getMarket()` - Get market details
- `getActiveMarkets()` - List active markets
- `updateMarketStatus()` - Update status
- `registerOracle()` - Register oracle

### VoterService
- `submitVote()` - Submit vote
- `registerVoter()` - Register voter
- `getVoter()` - Get voter info
- `getVoterStats()` - Get statistics
- `updateVoterStake()` - Update stake
- `withdrawStake()` - Withdraw stake

### CoordinatorService
- `requestResolution()` - Request resolution
- `aggregateVotes()` - Aggregate votes
- `finalizeMarket()` - Finalize market
- `getResolutionStatus()` - Get status
- `cancelResolution()` - Cancel resolution

## 🎯 Ready-to-Use Components

### CreateMarketForm
```typescript
import CreateMarketForm from '@/components/CreateMarketForm';

<CreateMarketForm />
```

### VotingInterface
```typescript
import VotingInterface from '@/components/VotingInterface';

<VotingInterface 
  market={market} 
  onVoteSuccess={() => console.log('Voted!')} 
/>
```

## 📚 Full Documentation

Lihat `lib/services/README.md` untuk dokumentasi lengkap!

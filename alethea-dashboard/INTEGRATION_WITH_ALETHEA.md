# Integration with Alethea Oracle

## Overview

Panduan untuk mengintegrasikan Linera client dengan existing Alethea Oracle features.

## Current Architecture

### Existing System
```
Dashboard → GraphQL (HTTP) → Oracle Registry → Linera Blockchain
```

### With Linera Client
```
Dashboard → Linera Client (WebAssembly) → Linera Blockchain
```

## Integration Points

### 1. Voter Registration

**Current**: HTTP GraphQL mutation
**Enhanced**: Direct blockchain interaction

```typescript
// Current approach (via HTTP)
import { registerVoter } from '@/lib/graphql';

await registerVoter({
  stake: "1000000",
  name: "Alice"
});

// New approach (via Linera Client)
import { useLineraClient } from '@/hooks/useLineraClient';

const { graphqlMutation } = useLineraClient();

await graphqlMutation(`
  mutation {
    registerVoter(
      stake: "1000000",
      name: "Alice"
    ) {
      address
      stake
      reputation
    }
  }
`, REGISTRY_APP_ID);
```

### 2. Market Creation

**Current**: HTTP GraphQL mutation
**Enhanced**: Direct blockchain interaction with real-time confirmation

```typescript
// Enhanced CreateMarketForm.tsx
import { useLineraClient, useLineraNotifications } from '@/hooks/useLineraClient';

function CreateMarketForm() {
  const { graphqlMutation, isReady } = useLineraClient();
  const [creating, setCreating] = useState(false);

  // Listen for market creation confirmation
  useLineraNotifications((notification) => {
    if (notification.reason?.NewBlock) {
      // Market created, refresh list
      onSuccess();
    }
  }, creating);

  const handleSubmit = async (data) => {
    setCreating(true);
    try {
      await graphqlMutation(`
        mutation {
          createMarket(
            question: "${data.question}",
            outcomes: [${data.outcomes.map(o => `"${o}"`).join(', ')}],
            deadline: ${data.deadline}
          ) {
            id
            question
          }
        }
      `, REGISTRY_APP_ID);
      
      // Wait for notification to confirm
    } catch (error) {
      setCreating(false);
      // Handle error
    }
  };

  return (
    // Form UI
  );
}
```

### 3. Voting

**Current**: HTTP GraphQL mutation
**Enhanced**: Direct blockchain interaction with instant feedback

```typescript
// Enhanced VotingInterface.tsx
import { useLineraClient } from '@/hooks/useLineraClient';

function VotingInterface({ marketId }) {
  const { graphqlMutation } = useLineraClient();

  const handleVote = async (outcome: string) => {
    await graphqlMutation(`
      mutation {
        submitVote(
          queryId: ${marketId},
          value: "${outcome}",
          confidence: 100
        ) {
          voter
          value
          timestamp
        }
      }
    `, REGISTRY_APP_ID);
  };

  return (
    // Voting UI
  );
}
```

### 4. Real-time Market Updates

**Current**: Polling every 30 seconds
**Enhanced**: Real-time notifications

```typescript
// Enhanced Dashboard page.tsx
import { useLineraNotifications } from '@/hooks/useLineraClient';

function Dashboard() {
  const [markets, setMarkets] = useState([]);

  // Replace polling with notifications
  useLineraNotifications((notification) => {
    if (notification.reason?.NewBlock) {
      // New block = potential market update
      loadMarkets();
    }
  }, true);

  return (
    // Dashboard UI
  );
}
```

## Migration Strategy

### Phase 1: Parallel Operation (Current)

Keep both systems running:
- HTTP GraphQL for production
- Linera Client for testing/demo

```typescript
const USE_LINERA_CLIENT = process.env.NEXT_PUBLIC_USE_LINERA_CLIENT === 'true';

async function registerVoter(params) {
  if (USE_LINERA_CLIENT) {
    return lineraClient.graphqlMutation(/* ... */);
  } else {
    return httpGraphQL(/* ... */);
  }
}
```

### Phase 2: Gradual Migration

Migrate features one by one:
1. ✅ Demo page (completed)
2. 🔄 Voter registration
3. 🔄 Market creation
4. 🔄 Voting
5. 🔄 Real-time updates

### Phase 3: Full Migration

Replace HTTP GraphQL with Linera Client:
- Remove polling
- Use notifications exclusively
- Direct blockchain interaction

## Hybrid Approach

Best of both worlds:

```typescript
// lib/services/oracle-client.ts
import { lineraClient } from './linera-client';
import { queryGraphQL } from '../graphql';

export class OracleClient {
  private useLineraClient: boolean;

  constructor() {
    this.useLineraClient = process.env.NEXT_PUBLIC_USE_LINERA_CLIENT === 'true';
  }

  async query(query: string) {
    if (this.useLineraClient && lineraClient.isReady()) {
      return lineraClient.graphqlQuery(query);
    } else {
      return queryGraphQL(query);
    }
  }

  async mutate(mutation: string) {
    if (this.useLineraClient && lineraClient.isReady()) {
      return lineraClient.graphqlMutation(mutation);
    } else {
      return queryGraphQL(mutation);
    }
  }
}

export const oracleClient = new OracleClient();
```

## Benefits of Integration

### 1. Performance
- ⚡ Faster queries (direct blockchain access)
- ⚡ No HTTP overhead
- ⚡ Real-time updates (no polling)

### 2. Reliability
- 🔒 Direct blockchain connection
- 🔒 No intermediary server
- 🔒 Cryptographic verification

### 3. User Experience
- ✨ Instant feedback
- ✨ Real-time notifications
- ✨ Better error messages

### 4. Decentralization
- 🌐 No central server dependency
- 🌐 True peer-to-peer
- 🌐 Censorship resistant

## Implementation Examples

### Enhanced Voter Registration Component

```typescript
// components/VoterRegistrationLinera.tsx
'use client';

import { useState } from 'react';
import { useLineraClient, useLineraNotifications } from '@/hooks/useLineraClient';

export default function VoterRegistrationLinera() {
  const { graphqlMutation, isReady } = useLineraClient();
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);

  useLineraNotifications((notification) => {
    if (notification.reason?.NewBlock && registering) {
      setRegistering(false);
      setSuccess(true);
    }
  }, registering);

  const handleRegister = async (formData) => {
    setRegistering(true);
    try {
      await graphqlMutation(`
        mutation {
          registerVoter(
            stake: "${formData.stake}",
            name: "${formData.name}"
          ) {
            address
            stake
            reputation
          }
        }
      `);
      // Wait for notification
    } catch (error) {
      setRegistering(false);
      alert('Registration failed: ' + error.message);
    }
  };

  if (!isReady) {
    return <div>Please connect Linera wallet first</div>;
  }

  return (
    <div>
      {/* Registration form */}
      {registering && <div>Registering... waiting for confirmation</div>}
      {success && <div>Registration confirmed!</div>}
    </div>
  );
}
```

### Enhanced Market Card with Real-time Updates

```typescript
// components/MarketCardLinera.tsx
'use client';

import { useState, useEffect } from 'react';
import { useLineraClient, useLineraNotifications } from '@/hooks/useLineraClient';

export default function MarketCardLinera({ marketId }) {
  const { graphqlQuery } = useLineraClient();
  const [market, setMarket] = useState(null);

  const loadMarket = async () => {
    const result = await graphqlQuery(`
      query {
        market(id: ${marketId}) {
          id
          question
          status
          totalLiquidity
        }
      }
    `);
    setMarket(result.data.market);
  };

  // Real-time updates
  useLineraNotifications((notification) => {
    if (notification.reason?.NewBlock) {
      loadMarket();
    }
  }, true);

  useEffect(() => {
    loadMarket();
  }, [marketId]);

  return (
    <div>
      {/* Market card UI with real-time data */}
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
# Enable Linera Client
NEXT_PUBLIC_USE_LINERA_CLIENT=true

# Linera Configuration
NEXT_PUBLIC_FAUCET_URL=https://faucet.testnet-conway.linera.net
NEXT_PUBLIC_REGISTRY_ID=640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6

# Fallback to HTTP (if Linera client not available)
NEXT_PUBLIC_REGISTRY_URL=http://localhost:8080/chains/.../applications/...
```

## Testing Strategy

### 1. Unit Tests
```typescript
describe('OracleClient', () => {
  it('should use Linera client when available', async () => {
    process.env.NEXT_PUBLIC_USE_LINERA_CLIENT = 'true';
    // Test Linera client path
  });

  it('should fallback to HTTP when Linera not available', async () => {
    process.env.NEXT_PUBLIC_USE_LINERA_CLIENT = 'false';
    // Test HTTP path
  });
});
```

### 2. Integration Tests
- Test wallet connection
- Test voter registration
- Test market creation
- Test voting
- Test notifications

### 3. E2E Tests
- Complete user flow with Linera client
- Fallback scenarios
- Error handling

## Monitoring

### Metrics to Track
- Linera client initialization time
- Query/mutation latency
- Notification latency
- Error rates
- Fallback usage

### Logging
```typescript
console.log('[Linera] Query executed:', {
  query,
  duration: Date.now() - start,
  success: true
});
```

## Rollback Plan

If issues occur:

1. Set `NEXT_PUBLIC_USE_LINERA_CLIENT=false`
2. System falls back to HTTP GraphQL
3. No code changes needed
4. Fix issues in Linera integration
5. Re-enable when ready

## Next Steps

1. ✅ Complete demo page (Done)
2. 🔄 Test with real Alethea Registry
3. 🔄 Implement hybrid client
4. 🔄 Migrate voter registration
5. 🔄 Migrate market creation
6. 🔄 Full integration testing
7. 🔄 Production deployment

## Support

For questions or issues:
- Check [LINERA_INTEGRATION.md](./LINERA_INTEGRATION.md)
- Check [LINERA_QUICKSTART.md](./LINERA_QUICKSTART.md)
- GitHub: [alethea-docs](https://github.com/mdlog/alethea-docs)

---

**Last Updated**: November 16, 2025
**Status**: Ready for Integration Testing

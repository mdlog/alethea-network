// GraphQL Client for Alethea Oracle Registry v2
// Updated: November 17, 2025 - Latest Deployment with Voter Selection

// Oracle Registry v2 Configuration - LATEST
// Chain ID: 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
// App ID: 9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2 (Voter Selection System)
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || process.env.NEXT_PUBLIC_APP_ID || '9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2';

// Registry URL
const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ||
  `http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}`;

// Market Chain URL (for prediction markets)
const MARKET_CHAIN_ID = process.env.NEXT_PUBLIC_MARKET_CHAIN_ID || process.env.NEXT_PUBLIC_APP_ID || REGISTRY_ID;
const MARKET_CHAIN_URL = process.env.NEXT_PUBLIC_MARKET_CHAIN_URL ||
  `http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}`;

// Feature flags
const ACCOUNT_BASED = process.env.NEXT_PUBLIC_ACCOUNT_BASED === 'true' || true;
const REPUTATION_ENABLED = process.env.NEXT_PUBLIC_REPUTATION_ENABLED === 'true' || true;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🚀 Oracle Registry v2 Configuration:');
  console.log('CHAIN_ID:', CHAIN_ID);
  console.log('REGISTRY_ID:', REGISTRY_ID);
  console.log('REGISTRY_URL:', REGISTRY_URL);
  console.log('ACCOUNT_BASED:', ACCOUNT_BASED);
  console.log('REPUTATION_ENABLED:', REPUTATION_ENABLED);
  console.log('Environment:', {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_REGISTRY_ID: process.env.NEXT_PUBLIC_REGISTRY_ID,
  });
}

export const ENDPOINTS = {
  registry: REGISTRY_URL,
  marketChain: MARKET_CHAIN_URL,
  voter: REGISTRY_URL, // Voter queries use registry endpoint
};

export const CONFIG = {
  chainId: CHAIN_ID,
  registryId: REGISTRY_ID,
  accountBased: ACCOUNT_BASED,
  reputationEnabled: REPUTATION_ENABLED,
};

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function queryGraphQL<T = any>(
  query: string,
  endpoint: 'registry' | 'marketChain' | 'voter' = 'registry',
  timeoutMs = 10000
): Promise<T | null> {
  const url = ENDPOINTS[endpoint];

  if (!url) {
    throw new Error(`Endpoint ${endpoint} not configured`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    }).catch((fetchError) => {
      // Handle network errors
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request timeout: Service did not respond within ${timeoutMs}ms`);
      }
      throw new Error(`Network error: ${fetchError.message || 'Failed to connect to service'}`);
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const result: GraphQLResponse<T> = await response.json().catch(() => {
      throw new Error('Invalid JSON response from server');
    });

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL Error: ${result.errors[0].message}`);
    }

    return result.data || null;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout: Service did not respond within ${timeoutMs}ms`);
    }

    throw error;
  }
}

// Specific query functions
export async function getProtocolStats() {
  return queryGraphQL(`
    query {
      protocolStats {
        totalMarkets
        activeMarkets
        resolvedMarkets
        totalVoters
      }
    }
  `);
}

export async function getActiveMarkets() {
  // Prediction Market dApp: Hanya menggunakan Market Chain
  // Registry hanya digunakan untuk resolution (setelah requestResolution)
  console.log('Market Chain URL:', MARKET_CHAIN_URL);

  const markets: any[] = [];

  // Query Market Chain markets (primary source untuk prediction market)
  const marketChainResult = await (MARKET_CHAIN_URL && !MARKET_CHAIN_URL.includes('YOUR_MARKET_CHAIN_ID')
    ? Promise.race([
      queryGraphQL(`
          query {
            markets {
              id
              question
              outcomes
              status
              resolutionDeadline
              totalLiquidity
              creator
            }
          }
        `, 'marketChain', 20000), // 20 second timeout
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Market Chain timeout')), 20000)
      )
    ]).catch((err) => {
      console.warn('Market Chain unavailable (may still be syncing):', err.message);
      return null;
    })
    : Promise.resolve(null));

  // Add Market Chain markets (convert to same format)
  if (marketChainResult?.markets && Array.isArray(marketChainResult.markets)) {
    const marketChainData = marketChainResult.markets;
    console.log('Market Chain markets raw:', marketChainData);

    markets.push(...marketChainData.map((m: any) => {
      // Market Chain status: OPEN, WAITING_RESOLUTION, RESOLVED, CLOSED
      let status = m.status;
      if (typeof status === 'string') {
        status = status.toUpperCase();
        // Normalize status
        if (status === 'OPEN') status = 'OPEN';
        else if (status === 'RESOLVED') status = 'RESOLVED';
        else if (status === 'WAITINGRESOLUTION' || status === 'WAITING_RESOLUTION') status = 'WAITING_RESOLUTION';
        else if (status === 'CLOSED') status = 'CLOSED';
        else status = 'OPEN'; // Default to OPEN
      } else {
        status = 'OPEN'; // Fallback
      }

      // Convert resolutionDeadline dari microseconds ke milliseconds
      const deadline = m.resolutionDeadline
        ? Math.floor(Number(m.resolutionDeadline) / 1000) // microseconds to milliseconds
        : Date.now() + 86400000; // Default to 1 day from now

      const market = {
        id: Number(m.id) || 0,
        question: m.question || '',
        outcomes: Array.isArray(m.outcomes) ? m.outcomes : [],
        status: status,
        deadline: deadline,
        createdAt: deadline - 86400000, // Default to 1 day before deadline
        totalLiquidity: m.totalLiquidity || '0',
        creator: m.creator || null,
        source: 'marketChain', // Semua dari Market Chain untuk prediction market
      };

      console.log('Market Chain market:', market);
      return market;
    }));
  }

  // Sort by ID (newest first)
  const sortedMarkets = markets.sort((a, b) => b.id - a.id);

  console.log('Final markets array:', sortedMarkets.length, 'markets (all from Market Chain)');

  return { activeMarkets: sortedMarkets };
}

export async function getMarketDetails(id: number) {
  return queryGraphQL(`
    query {
      market(id: ${id}) {
        id
        question
        outcomes
        status
        createdAt
        deadline
      }
    }
  `);
}

export async function getVoterStats() {
  return queryGraphQL(`
    query {
      voterStats {
        totalVotes
        correctVotes
        accuracy
        reputation
      }
    }
  `, 'voter');
}

export async function getRecentActivity() {
  return queryGraphQL(`
    query {
      recentActivity {
        id
        question
        status
        createdAt
      }
    }
  `);
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

// Registry Mutations
export async function createMarket(params: {
  question: string;
  outcomes: string[];
  deadline: number;
  metadata?: string;
}) {
  const outcomesStr = params.outcomes.map(o => `"${o}"`).join(', ');
  const metadataStr = params.metadata ? `"${params.metadata}"` : 'null';

  return queryGraphQL(`
    mutation {
      createMarket(
        question: "${params.question}",
        outcomes: [${outcomesStr}],
        deadline: ${params.deadline},
        metadata: ${metadataStr}
      ) {
        id
        question
        outcomes
        status
        createdAt
        deadline
      }
    }
  `, 'registry');
}

export async function updateMarketStatus(marketId: number, status: string) {
  return queryGraphQL(`
    mutation {
      updateMarketStatus(
        marketId: ${marketId},
        status: "${status}"
      ) {
        id
        status
      }
    }
  `, 'registry');
}

export async function registerOracle(params: {
  name: string;
  endpoint: string;
  publicKey: string;
}) {
  return queryGraphQL(`
    mutation {
      registerOracle(
        name: "${params.name}",
        endpoint: "${params.endpoint}",
        publicKey: "${params.publicKey}"
      ) {
        id
        name
        endpoint
        isActive
      }
    }
  `, 'registry');
}

// Account-Based Registry Voter Mutations
export async function submitVote(params: {
  queryId: number;
  value: string;
  confidence?: number;
}) {
  const confidence = params.confidence || 100;

  return queryGraphQL(`
    mutation {
      submitVote(
        queryId: ${params.queryId},
        value: "${params.value}",
        confidence: ${confidence}
      ) {
        voter
        value
        timestamp
      }
    }
  `, 'registry');
}

export async function registerVoter(params: {
  stake: string;
  name?: string;
  metadataUrl?: string;
}) {
  const nameStr = params.name ? `"${params.name}"` : 'null';
  const metadataStr = params.metadataUrl ? `"${params.metadataUrl}"` : 'null';

  return queryGraphQL(`
    mutation {
      registerVoter(
        stake: "${params.stake}",
        name: ${nameStr},
        metadataUrl: ${metadataStr}
      ) {
        address
        stake
        reputation
        reputationTier
        totalVotes
        isActive
      }
    }
  `, 'registry');
}

export async function updateStake(stake: string) {
  return queryGraphQL(`
    mutation {
      updateStake(
        stake: "${stake}"
      ) {
        address
        stake
        lockedStake
        availableStake
      }
    }
  `, 'registry');
}

export async function withdrawStake(amount: string) {
  return queryGraphQL(`
    mutation {
      withdrawStake(
        amount: "${amount}"
      ) {
        address
        stake
        availableStake
      }
    }
  `, 'registry');
}

export async function claimRewards() {
  return queryGraphQL(`
    mutation {
      claimRewards
    }
  `, 'registry');
}

// Note: Resolution operations are handled via Registry, not a separate coordinator
// Use Linera operations for resolution requests (see operations.ts)

// Account-Based Registry Queries
export async function getVoter(address: string) {
  return queryGraphQL(`
    query {
      voter(address: "${address}") {
        address
        stake
        lockedStake
        availableStake
        reputation
        reputationTier
        reputationWeight
        totalVotes
        correctVotes
        accuracyPercentage
        registeredAt
        isActive
        name
        metadataUrl
      }
    }
  `, 'registry');
}

export async function getVoters(limit: number = 100, offset: number = 0, activeOnly: boolean = false) {
  return queryGraphQL(`
    query {
      voters(limit: ${limit}, offset: ${offset}, activeOnly: ${activeOnly}) {
        address
        stake
        lockedStake
        availableStake
        reputation
        reputationTier
        reputationWeight
        totalVotes
        correctVotes
        accuracyPercentage
        registeredAt
        isActive
        name
        metadataUrl
      }
    }
  `, 'registry');
}

export async function getMyVoterInfo() {
  return queryGraphQL(`
    query {
      myVoterInfo {
        address
        stake
        lockedStake
        availableStake
        reputation
        reputationTier
        reputationWeight
        totalVotes
        correctVotes
        accuracyPercentage
        registeredAt
        isActive
        name
        metadataUrl
      }
    }
  `, 'registry');
}

export async function getQuery(id: number) {
  return queryGraphQL(`
    query {
      query(id: ${id}) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        status
        result
        resolvedAt
        voteCount
        timeRemaining
      }
    }
  `, 'registry');
}

export async function getQueries(limit: number = 100, offset: number = 0) {
  return queryGraphQL(`
    query {
      queries(limit: ${limit}, offset: ${offset}) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        status
        result
        resolvedAt
        voteCount
        timeRemaining
      }
    }
  `, 'registry');
}

export async function getActiveQueries(limit: number = 100) {
  return queryGraphQL(`
    query {
      activeQueries(limit: ${limit}) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        status
        voteCount
        timeRemaining
      }
    }
  `, 'registry');
}

export async function getMyPendingRewards() {
  return queryGraphQL(`
    query {
      myPendingRewards
    }
  `, 'registry');
}

export async function getStatistics() {
  // Use simple queries that exist in the schema
  return queryGraphQL(`
    query {
      voterCount
      totalStake
    }
  `, 'registry');
}

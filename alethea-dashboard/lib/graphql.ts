// GraphQL Client for Alethea Oracle Registry v2
// Updated: November 17, 2025 - Latest Deployment with Voter Selection

// Oracle Registry v2 Configuration - LATEST (Updated Nov 19, 2025 - 16:31:32)
// Chain ID: 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
// App ID: 6cf34d723b88cbbb2087f72f8395567217a0a1038ebfc4246bc168a3655303ca (Fixed Chain ID Tracking + AccountOwner)
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || process.env.NEXT_PUBLIC_APP_ID || '6cf34d723b88cbbb2087f72f8395567217a0a1038ebfc4246bc168a3655303ca';

// Registry URL
const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ||
  `http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}`;

// Market Chain URL (for prediction markets)
const MARKET_CHAIN_ID = process.env.NEXT_PUBLIC_MARKET_CHAIN_ID || '438a180a65594f69d27d0d53eb2072213a476489d439aeef5f857ef9699f245b';
const MARKET_CHAIN_URL = process.env.NEXT_PUBLIC_MARKET_CHAIN_URL ||
  `http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}`;

// Feature flags
const ACCOUNT_BASED = process.env.NEXT_PUBLIC_ACCOUNT_BASED === 'true' || true;
const REPUTATION_ENABLED = process.env.NEXT_PUBLIC_REPUTATION_ENABLED === 'true' || true;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🚀 Alethea Network Configuration:');
  console.log('CHAIN_ID:', CHAIN_ID);
  console.log('REGISTRY_ID:', REGISTRY_ID);
  console.log('MARKET_CHAIN_ID:', MARKET_CHAIN_ID);
  console.log('');
  console.log('📍 Endpoints:');
  console.log('Registry URL:', REGISTRY_URL);
  console.log('Market Chain URL:', MARKET_CHAIN_URL);
  console.log('');
  console.log('⚙️  Features:');
  console.log('ACCOUNT_BASED:', ACCOUNT_BASED);
  console.log('REPUTATION_ENABLED:', REPUTATION_ENABLED);
  console.log('');
  console.log('🔧 Environment Variables:');
  console.log('NEXT_PUBLIC_CHAIN_ID:', process.env.NEXT_PUBLIC_CHAIN_ID);
  console.log('NEXT_PUBLIC_REGISTRY_ID:', process.env.NEXT_PUBLIC_REGISTRY_ID);
  console.log('NEXT_PUBLIC_MARKET_CHAIN_ID:', process.env.NEXT_PUBLIC_MARKET_CHAIN_ID);
  console.log('NEXT_PUBLIC_MARKET_CHAIN_URL:', process.env.NEXT_PUBLIC_MARKET_CHAIN_URL);
}

export const ENDPOINTS = {
  registry: REGISTRY_URL,
  marketChain: MARKET_CHAIN_URL,
  voter: REGISTRY_URL, // Voter queries use registry endpoint
};

export const CONFIG = {
  chainId: CHAIN_ID,
  registryId: REGISTRY_ID,
  marketChainId: MARKET_CHAIN_ID,
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
  timeoutMs = 3000 // Reduced from 10s to 3s for faster failure
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
  try {
    // Get voter count from registry
    const registryResult = await queryGraphQL(`
      query {
        voterCount
      }
    `, 'registry').catch(() => ({ voterCount: 0 }));

    // Get market stats from market chain
    const marketResult = await queryGraphQL(`
      query {
        markets {
          id
          status
        }
      }
    `, 'marketChain').catch(() => ({ markets: [] }));

    const markets = marketResult?.markets || [];
    const activeMarkets = markets.filter((m: any) => m.status === 'Active' || m.status === 'ACTIVE').length;
    const resolvedMarkets = markets.filter((m: any) => m.status === 'Resolved' || m.status === 'RESOLVED').length;

    return {
      totalVoters: registryResult?.voterCount || 0,
      totalMarkets: markets.length,
      activeMarkets,
      resolvedMarkets
    };
  } catch (error) {
    console.error('Failed to get protocol stats:', error);
    return {
      totalVoters: 0,
      totalMarkets: 0,
      activeMarkets: 0,
      resolvedMarkets: 0
    };
  }
}

export async function getActiveMarkets() {
  // Load from BOTH Oracle and Market Chain, then combine
  console.log('Fetching markets from Oracle and Market Chain...');

  const allMarkets: any[] = [];

  try {
    // 1. Try Oracle application first
    const oracleAppId = process.env.NEXT_PUBLIC_ORACLE_APP_ID;
    if (oracleAppId) {
      try {
        const oracleUrl = `http://localhost:8080/chains/${CONFIG.chainId}/applications/${oracleAppId}`;
        console.log('Querying Oracle app:', oracleUrl);

        const oracleResponse = await fetch(oracleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query {
              queries {
                id
                question
                outcomes
                status
                deadline
                commitEnd
                revealEnd
                resolvedOutcome
              }
            }`
          })
        });

        const oracleData = await oracleResponse.json();

        if (oracleData?.data?.queries && oracleData.data.queries.length > 0) {
          const oracleQueries = oracleData.data.queries.map((q: any) => ({
            id: `oracle-${q.id}`, // Prefix to avoid ID collision
            question: q.question,
            outcomes: q.outcomes,
            status: q.status,
            createdAt: Date.now(),
            deadline: q.deadline,
            commitEnd: q.commitEnd,
            revealEnd: q.revealEnd,
            resolvedOutcome: q.resolvedOutcome,
            source: 'oracle' as const,
          }));

          console.log('✅ Loaded queries from Oracle:', oracleQueries.length, 'queries');
          allMarkets.push(...oracleQueries);
        } else {
          console.log('⚠️ No Oracle queries found');
        }
      } catch (oracleErr) {
        console.warn('⚠️ Oracle query failed:', oracleErr);
      }
    }

    // 2. Load from Market Chain (always, not fallback)
    console.log('Querying Market Chain:', MARKET_CHAIN_URL);
    try {
      const result = await queryGraphQL(`
        query {
          markets {
            id
            question
            outcomes
            status
            finalOutcome
            resolutionDeadline
          }
        }
      `, 'marketChain', 5000);

      const rawMarkets = result?.markets || [];

      if (rawMarkets.length > 0) {
        const markets = rawMarkets.map((m: any) => ({
          id: `market-${m.id}`, // Prefix to avoid ID collision
          question: m.question,
          outcomes: m.outcomes,
          status: mapMarketStatus(m.status),
          createdAt: Date.now(),
          deadline: m.resolutionDeadline,
          source: 'marketChain' as const,
        }));

        console.log('✅ Loaded markets from Market Chain:', markets.length, 'markets');
        allMarkets.push(...markets);
      } else {
        console.log('⚠️ No Market Chain markets found');
      }
    } catch (marketErr) {
      console.warn('⚠️ Market Chain query failed:', marketErr);
    }

    // 3. Return combined results
    console.log('✅ Total markets loaded:', allMarkets.length, '(Oracle + Market Chain)');
    return { activeMarkets: allMarkets };
  } catch (err) {
    console.warn('⚠️ Failed to load markets:', err instanceof Error ? err.message : 'Unknown error');
    return { activeMarkets: [] };
  }
}

// Helper function to map Market Chain status to Dashboard status
function mapMarketStatus(status: string): 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED' {
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'ACTIVE') return 'OPEN';
  if (statusUpper === 'RESOLVED') return 'RESOLVED';
  if (statusUpper === 'PENDING_RESOLUTION') return 'PENDING';
  if (statusUpper === 'CLOSED') return 'CLOSED';
  return 'OPEN'; // Default to OPEN
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

export async function commitVote(params: {
  queryId: number;
  commitHash: string;
}) {
  return queryGraphQL(`
    mutation {
      commitVote(
        queryId: ${params.queryId},
        commitHash: "${params.commitHash}"
      ) {
        voter
        commitHash
        committedAt
      }
    }
  `, 'registry');
}

export async function revealVote(params: {
  queryId: number;
  value: string;
  salt: string;
  confidence?: number;
}) {
  const confidence = params.confidence || 100;

  return queryGraphQL(`
    mutation {
      revealVote(
        queryId: ${params.queryId},
        value: "${params.value}",
        salt: "${params.salt}",
        confidence: ${confidence}
      ) {
        voter
        value
        timestamp
      }
    }
  `, 'registry');
}

export async function createQuery(params: {
  description: string;
  outcomes: string[];
  strategy: string;
  minVotes?: number;
  rewardAmount: string;
  deadline?: number;
}) {
  const outcomesStr = params.outcomes.map(o => `"${o}"`).join(', ');
  const minVotes = params.minVotes || 3;
  const deadlineStr = params.deadline ? params.deadline.toString() : 'null';

  return queryGraphQL(`
    mutation {
      createQuery(
        description: "${params.description}",
        outcomes: [${outcomesStr}],
        strategy: "${params.strategy}",
        minVotes: ${minVotes},
        rewardAmount: "${params.rewardAmount}",
        deadline: ${deadlineStr}
      ) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        commitPhaseEnd
        revealPhaseEnd
        phase
        status
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
  // Use voterLeaderboard to get list of voters
  return queryGraphQL(`
    query {
      voterLeaderboard(limit: ${limit}) {
        voterApp
        reputationScore
        totalVotes
        accuracyRate
      }
    }
  `, 'registry').then(data => {
    // Transform to match expected format
    const voters = data.voterLeaderboard?.map((entry: any, index: number) => {
      // Extract chain ID from voterApp
      // Format: "ApplicationId { application_description_hash: <hash> }" or just "<chain_id>"
      let chainId = entry.voterApp;

      // If it's the full ApplicationId format, extract the hash
      if (chainId.includes('application_description_hash:')) {
        const match = chainId.match(/application_description_hash:\s*([a-f0-9]+)/);
        if (match) {
          chainId = match[1];
        }
      }

      // Clean up any remaining formatting
      chainId = chainId.replace(/[{}]/g, '').trim();

      return {
        address: chainId,
        stake: '0',
        lockedStake: '0',
        availableStake: '0',
        reputation: entry.reputationScore,
        reputationTier: getReputationTier(entry.reputationScore),
        reputationWeight: entry.reputationScore / 100,
        totalVotes: entry.totalVotes,
        correctVotes: Math.floor(entry.totalVotes * entry.accuracyRate),
        accuracyPercentage: entry.accuracyRate * 100,
        isActive: true,
        name: `Voter #${index + 1}`,
        metadataUrl: '',
        registeredAt: 0,
      };
    }) || [];

    return { voters };
  }).catch(error => {
    console.warn('getVoters query failed, returning empty array:', error.message);
    return { voters: [] };
  });
}

// Helper function to determine reputation tier
function getReputationTier(reputation: number): string {
  if (reputation >= 900) return 'Master';
  if (reputation >= 700) return 'Expert';
  if (reputation >= 500) return 'Journeyman';
  if (reputation >= 300) return 'Apprentice';
  return 'Novice';
}

export async function getMyVoterInfo(address?: string) {
  // If no address provided, return null (user not connected)
  if (!address) {
    return { myVoterInfo: null };
  }

  return queryGraphQL(`
    query {
      myVoterInfo(address: "${address}") {
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
        commitPhaseEnd
        revealPhaseEnd
        phase
        status
        voteCount
        commitCount
        timeRemaining
      }
    }
  `, 'registry');
}

export async function getUpcomingQueries(limit: number = 100) {
  return queryGraphQL(`
    query {
      queries(limit: ${limit}) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        commitPhaseEnd
        revealPhaseEnd
        phase
        status
        voteCount
        commitCount
        timeRemaining
      }
    }
  `, 'registry');
}

export async function getPastQueries(limit: number = 100) {
  return queryGraphQL(`
    query {
      queries(limit: ${limit}) {
        id
        description
        outcomes
        strategy
        minVotes
        rewardAmount
        creator
        createdAt
        deadline
        commitPhaseEnd
        revealPhaseEnd
        phase
        status
        result
        resolvedAt
        voteCount
        commitCount
      }
    }
  `, 'registry');
}

export async function getQueryById(id: number) {
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
        commitPhaseEnd
        revealPhaseEnd
        phase
        status
        result
        resolvedAt
        voteCount
        commitCount
        timeRemaining
        selectedVoters
        hasCommitted
        hasRevealed
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
  // Use protocolStats to get statistics
  return queryGraphQL(`
    query {
      protocolStats {
        totalMarkets
        activeMarkets
        resolvedMarkets
        totalVoters
        activeVoters
        totalValueLocked
      }
    }
  `, 'registry').then(data => {
    // Transform to match expected format
    const stats = data.protocolStats;
    return {
      statistics: {
        totalVoters: stats.totalVoters,
        activeVoters: stats.activeVoters,
        totalMarkets: stats.totalMarkets,
        activeMarkets: stats.activeMarkets,
        resolvedMarkets: stats.resolvedMarkets,
        totalStaked: stats.totalValueLocked,
        protocolTreasury: '0',
        averageReputation: 0,
        protocolStatus: 'Active',
        resolutionRate: stats.totalMarkets > 0 ? (stats.resolvedMarkets / stats.totalMarkets) * 100 : 0,
      }
    };
  }).catch(error => {
    console.warn('getStatistics query failed:', error.message);
    return {
      statistics: {
        totalVoters: 0,
        activeVoters: 0,
        totalMarkets: 0,
        activeMarkets: 0,
        resolvedMarkets: 0,
        totalStaked: '0',
        protocolTreasury: '0',
        averageReputation: 0,
        protocolStatus: 'Unknown',
        resolutionRate: 0,
      }
    };
  });
}

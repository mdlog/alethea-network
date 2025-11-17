// Alethea Dashboard Types

export interface Market {
    id: number;
    question: string;
    outcomes: string[];
    status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
    createdAt: number;
    deadline: number;
    totalLiquidity?: string;
    outcomePools?: string[];
    creator?: string;
    source?: 'registry' | 'marketChain'; // Source of the market to avoid ID conflicts
}

export interface ProtocolStats {
    totalMarkets: number;
    activeMarkets: number;
    resolvedMarkets: number;
    totalVoters: number;
    totalVolume?: string;
    totalLiquidity?: string;
}

// Account-Based Registry Types
export interface Voter {
    address: string;
    stake: string;
    lockedStake: string;
    availableStake: string;
    reputation: number;
    reputationTier: string;
    reputationWeight: number;
    totalVotes: number;
    correctVotes: number;
    accuracyPercentage: number;
    registeredAt: string;
    isActive: boolean;
    name?: string;
    metadataUrl?: string;
}

export interface Query {
    id: number;
    description: string;
    outcomes: string[];
    strategy: string;
    minVotes: number;
    rewardAmount: string;
    creator: string;
    createdAt: string;
    deadline: string;
    status: string;
    result?: string;
    resolvedAt?: string;
    voteCount: number;
    timeRemaining: number;
}

export interface Statistics {
    totalVoters: number;
    activeVoters: number;
    totalStake: string;
    totalLockedStake: string;
    averageStake: string;
    totalQueriesCreated: number;
    totalQueriesResolved: number;
    activeQueriesCount: number;
    totalVotesSubmitted: number;
    averageVotesPerQuery: number;
    totalRewardsDistributed: string;
    rewardPoolBalance: string;
    protocolTreasury: string;
    averageReputation: number;
    protocolStatus: string;
    resolutionRate: number;
}

export interface VoterStats {
    totalVotes: number;
    correctVotes: number;
    accuracy: number;
    reputation: number;
    totalStake: string;
}

export interface Activity {
    id: string;
    type: 'MARKET_CREATED' | 'MARKET_RESOLVED' | 'VOTE_SUBMITTED' | 'TRADE_EXECUTED';
    timestamp: number;
    description: string;
    marketId?: number;
    userId?: string;
}

export interface ChainInfo {
    chainId: string;
    network: string;
    blockHeight: number;
    lastUpdate: Date;
}

// Re-export voter registration types
export * from './voter-registration';

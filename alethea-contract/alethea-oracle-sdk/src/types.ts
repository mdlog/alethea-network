/**
 * Alethea Oracle SDK - Type Definitions
 * 
 * This file contains all type definitions for the SDK, organized by:
 * - Shared types (used by both internal and external APIs)
 * - External API types (for DApps/Prediction Markets)
 * - Internal API types (for Alethea Dashboard - voter operations)
 */

// =============================================================================
// SHARED CONFIGURATION
// =============================================================================

/**
 * Base configuration for Oracle client
 */
export interface OracleConfigBase {
    /** Registry application ID */
    registryId: string;

    /** Chain ID where the registry is deployed */
    chainId: string;

    /** GraphQL endpoint (optional, will be auto-generated if not provided) */
    endpoint?: string;

    /** Number of retry attempts for failed requests (default: 3) */
    retryAttempts?: number;

    /** Delay between retries in milliseconds (default: 1000) */
    retryDelay?: number;
}

/**
 * Configuration for External DApps (Prediction Markets, Insurance, etc.)
 * 
 * Use this when integrating your DApp with Alethea Oracle for resolution services.
 * Does NOT require voter operations - those are handled by Alethea Dashboard.
 */
export interface ExternalDAppConfig extends OracleConfigBase {
    /** Your DApp's chain ID (for receiving callbacks) */
    callbackChainId: string;

    /** Your DApp's application ID (for receiving callbacks) */
    callbackAppId: string;
}

/**
 * Configuration for Internal Alethea Dashboard
 * 
 * Use this ONLY in Alethea Network Dashboard for voter management.
 * External DApps should NOT use this - voter registration is internal only.
 * 
 * @internal
 */
export interface InternalDashboardConfig extends OracleConfigBase {
    /** Voter's chain ID (required for voter operations) */
    voterChainId: string;
}

/**
 * Legacy combined config (deprecated, use specific configs instead)
 * @deprecated Use ExternalDAppConfig or InternalDashboardConfig
 */
export interface OracleConfig extends OracleConfigBase {
    /** @deprecated Use InternalDashboardConfig.voterChainId */
    voterAddress?: string;
}

// =============================================================================
// SHARED TYPES (Used by both External and Internal APIs)
// =============================================================================

/**
 * Query/Market information
 * 
 * Matches the GraphQL Query type in oracle-registry-v2/src/service.rs
 */
export interface QueryInfo {
    /** Unique query ID */
    id: number;

    /** Query description/question */
    description: string;

    /** Possible outcomes */
    outcomes: string[];

    /** Decision strategy */
    strategy: DecisionStrategy;

    /** Minimum votes required for resolution */
    minVotes: number;

    /** Reward amount for correct voters */
    rewardAmount: string;

    /** Query creator address */
    creator: string;

    /** Creation timestamp (microseconds as string) */
    createdAt: string;

    /** Resolution deadline (microseconds as string) */
    deadline: string;

    /** Commit phase end time (microseconds as string) */
    commitEnd: string;

    /** Reveal phase end time (microseconds as string) */
    revealEnd: string;

    /** Query status (Active, Resolved, Finalized, Disputed, Expired, Cancelled) */
    status: QueryStatus;

    /** Current voting phase (Commit, Reveal, Completed) */
    phase: VotingPhase;

    /** Resolved result (if resolved) */
    result?: string;

    /** Resolution timestamp (if resolved) */
    resolvedAt?: string;

    /** Number of commits (phase 1) */
    commitCount: number;

    /** Number of revealed votes */
    voteCount: number;

    /** Time remaining until deadline (in seconds) */
    timeRemaining: number;

    // ==================== QUERY METADATA ====================

    /** Short title for the query */
    title?: string;

    /** Category (Sports, Crypto, Politics, etc.) */
    category?: string;

    /** Detailed context for voters */
    context?: string;

    /** Resolution criteria */
    resolutionCriteria?: string;

    /** Data source URLs */
    sourceUrls?: string;

    /** Tags for categorization */
    tags?: string;

    /** External metadata URL */
    metadataUrl?: string;

    /** External market ID from DApp */
    externalId?: string;

    // ==================== HYBRID MODEL FIELDS ====================

    /** Bond amount (refundable if no dispute) */
    bondAmount?: string;

    /** Priority fee (non-refundable) */
    priorityFee?: string;

    /** Whether bond has been refunded */
    bondRefunded?: boolean;

    /** Whether query has a dispute */
    hasDispute?: boolean;

    /** Dispute window end timestamp (microseconds) */
    disputeWindowEnd?: string;

    /** Can still be disputed */
    canDispute?: boolean;

    // ==================== SOURCE DAPP TRACKING ====================

    /** Source DApp Application ID (if external) */
    sourceAppId?: string;

    /** Source DApp name */
    sourceAppName?: string;

    /** Source DApp logo URL */
    sourceAppLogo?: string;

    /** Source DApp category */
    sourceAppCategory?: string;

    /** Query source type (Internal, ExternalPredictionMarket, etc.) */
    querySource?: string;

    /** Is query from external DApp */
    isExternal?: boolean;
}

export type DecisionStrategy = 'Majority' | 'Median' | 'WeightedByStake' | 'WeightedByReputation';
export type QueryStatus = 'Active' | 'Resolved' | 'Finalized' | 'Disputed' | 'Expired' | 'Cancelled';
export type VotingPhase = 'Commit' | 'Reveal' | 'Completed';

/**
 * Protocol statistics (public, read-only)
 */
export interface Statistics {
    /** Total number of registered voters */
    totalVoters: number;

    /** Number of active voters */
    activeVoters: number;

    /** Total stake across all voters */
    totalStake: string;

    /** Total locked stake */
    totalLockedStake: string;

    /** Average stake per voter */
    averageStake: string;

    /** Total number of queries created */
    totalQueriesCreated: number;

    /** Total number of queries resolved */
    totalQueriesResolved: number;

    /** Number of currently active queries */
    activeQueriesCount: number;

    /** Total number of votes submitted */
    totalVotesSubmitted: number;

    /** Average votes per query */
    averageVotesPerQuery: number;

    /** Total rewards distributed */
    totalRewardsDistributed: string;

    /** Current reward pool balance */
    rewardPoolBalance: string;

    /** Protocol treasury balance */
    protocolTreasury: string;

    /** Average voter reputation score */
    averageReputation: number;

    /** Protocol status (Active or Paused) */
    protocolStatus: string;

    /** Query resolution rate (percentage) */
    resolutionRate: number;
}

/**
 * Voter information (public, read-only for transparency)
 * 
 * ## Reward Flow (Updated)
 * 1. Voter votes correctly on a query
 * 2. When query resolves, rewards are added to `pendingRewards`
 * 3. Voter calls `claimRewards()` → rewards move to `withdrawableBalance`
 * 4. Voter calls `claimWithdrawableTokens()` → tokens sent to voter's wallet
 * 
 * ## Stake vs Withdrawable Balance
 * - `stake`: Locked in the system, used for voting power
 * - `withdrawableBalance`: Ready to withdraw as actual tokens
 */
export interface VoterInfo {
    /** Voter's chain ID / address */
    address: string;

    /** Staked amount in tokens (locked in system for voting power) */
    stake: string;

    /** Locked stake for active votes (cannot be withdrawn until votes resolve) */
    lockedStake: string;

    /** Available stake (stake - lockedStake, can be withdrawn or used for voting) */
    availableStake: string;

    /** 
     * Withdrawable balance - rewards and unstaked tokens ready to claim as actual tokens
     * Call `claimWithdrawableTokens()` to receive these tokens in your wallet
     */
    withdrawableBalance: string;

    /** 
     * Pending rewards to claim (from correct votes)
     * Call `claimRewards()` to move these to withdrawableBalance
     */
    pendingRewards?: string;

    /** Reputation score (0-100) */
    reputation: number;

    /** Reputation tier (Novice, Intermediate, Expert, Master) */
    reputationTier: string;

    /** Voting weight multiplier based on reputation (0.5-2.0) */
    reputationWeight: number;

    /** Total number of votes submitted */
    totalVotes: number;

    /** Number of correct votes */
    correctVotes: number;

    /** Voting accuracy percentage */
    accuracyPercentage: number;

    /** Registration timestamp */
    registeredAt: string;

    /** Is voter currently active */
    isActive: boolean;

    /** Optional voter name */
    name?: string;

    /** Optional metadata URL */
    metadataUrl?: string;
}

// =============================================================================
// EXTERNAL API TYPES - For DApps/Prediction Markets
// =============================================================================

/**
 * Parameters for creating a resolution query (Legacy mode)
 * 
 * Use this to request oracle resolution for your market/event.
 * The oracle will resolve the query and send a callback to your DApp.
 * 
 * @deprecated Use CreateQueryWithBondParams for the hybrid model
 */
export interface CreateResolutionQueryParams {
    /** Question/description for voters (e.g., "Did BTC close above $100k on Jan 5, 2026?") */
    description: string;

    /** Possible outcomes (e.g., ["Yes", "No"]) */
    outcomes: string[];

    /** Decision strategy (default: WeightedByStake) */
    strategy?: DecisionStrategy;

    /** Minimum votes required (optional, uses protocol default) */
    minVotes?: number;

    /** Reward amount for correct voters in tokens */
    rewardAmount: string;

    /** Duration in seconds (optional, uses protocol default) */
    durationSecs?: number;

    /** Your reference ID (e.g., market_id) - will be returned in callback */
    referenceId?: string;

    /** Additional callback data (encoded as hex string) */
    callbackData?: string;
}

/**
 * Parameters for creating a resolution query with bond (Hybrid Model)
 * 
 * This is the recommended way to create queries in the hybrid model.
 * - Bond is refundable if no dispute is raised
 * - Priority fee is non-refundable and goes to voter rewards
 * - Voter rewards come from inflation + priority fees + slashing
 */
export interface CreateQueryWithBondParams {
    /** Question/description for voters (the main question to resolve) */
    description: string;

    /** Possible outcomes (2-10 items) */
    outcomes: string[];

    /** Decision strategy (default: WeightedByStake) */
    strategy?: DecisionStrategy;

    /** Minimum votes required (optional, uses protocol default) */
    minVotes?: number;

    /** Bond amount (refundable if no dispute) - minimum 100 ALTH */
    bondAmount: string;

    /** Priority fee (optional, non-refundable, adds to voter rewards) */
    priorityFee?: string;

    /** Duration in seconds (optional, uses protocol default) */
    durationSecs?: number;

    /** Your reference ID (e.g., market_id) - will be returned in callback */
    referenceId?: string;

    /** Additional callback data (encoded as hex string) */
    callbackData?: string;

    // ==================== QUERY METADATA ====================

    /** Short title for the query */
    title?: string;

    /** Category (e.g., "Sports", "Crypto", "Politics", "Entertainment") */
    category?: string;

    /** Detailed context/background for voters to make informed decisions */
    context?: string;

    /** Resolution criteria - specific conditions to determine outcome 
     * e.g., "Use CoinGecko price at exactly 00:00 UTC on the date" */
    resolutionCriteria?: string;

    /** Data source URLs for verification (comma-separated)
     * e.g., "https://coingecko.com/btc, https://coinmarketcap.com/btc" */
    sourceUrls?: string;

    /** Tags for categorization (comma-separated) 
     * e.g., "bitcoin,crypto,price,2026" */
    tags?: string;

    /** External metadata URL (IPFS or HTTP link to full JSON metadata) */
    metadataUrl?: string;

    /** External market/request ID from your DApp */
    externalId?: string;
}

/**
 * Parameters for raising a dispute
 */
export interface RaiseDisputeParams {
    /** Query ID to dispute */
    queryId: number;

    /** The outcome disputer claims is correct */
    disputedOutcome: string;

    /** Dispute bond (must equal original bond) */
    disputeBond: string;

    /** Reason for dispute */
    reason: string;
}

/**
 * Result of query creation
 */
export interface QueryCreationResult {
    /** Assigned query ID */
    queryId: number;

    /** Query status */
    status: QueryStatus;

    /** Estimated resolution time */
    estimatedResolution: Date;

    /** Deadline for voting */
    deadline: string;
}

/**
 * Resolution callback data (received when query is resolved)
 */
export interface ResolutionResult {
    /** Query ID */
    queryId: number;

    /** Resolved outcome (e.g., "Yes" or "No") */
    result: string;

    /** Resolution timestamp */
    resolvedAt: string;

    /** Number of votes */
    voteCount: number;

    /** Confidence score (0-100) */
    confidence: number;

    /** Your original reference ID / callback data */
    callbackData?: string;
}

/**
 * Callback function for resolution subscription
 */
export type ResolutionCallback = (
    resolution: ResolutionResult | null,
    error: Error | null
) => void;

/**
 * Function to unsubscribe from resolution updates
 */
export type Unsubscribe = () => void;

/**
 * Options for resolution subscription
 */
export interface SubscriptionOptions {
    /** Polling interval in milliseconds (default: 5000) */
    pollInterval?: number;

    /** Timeout in milliseconds (default: 86400000 = 24 hours) */
    timeout?: number;
}

// =============================================================================
// INTERNAL API TYPES - For Alethea Dashboard ONLY
// =============================================================================

/**
 * Parameters for voter registration
 * 
 * @internal Use only in Alethea Dashboard
 */
export interface RegisterVoterParams {
    /** Stake amount in tokens (minimum: 100 ALTH) */
    stake: string;

    /** Optional voter display name */
    name?: string;

    /** Optional metadata URL */
    metadataUrl?: string;
}

/**
 * Parameters for submitting a vote
 * 
 * @internal Use only in Alethea Dashboard
 */
export interface SubmitVoteParams {
    /** Query ID to vote on */
    queryId: number;

    /** Vote value (must be one of the query's outcomes) */
    value: string;

    /** Optional confidence score (0-100) */
    confidence?: number;
}

/**
 * Parameters for commit-reveal voting (Phase 1)
 * 
 * @internal Use only in Alethea Dashboard
 */
export interface CommitVoteParams {
    /** Query ID to vote on */
    queryId: number;

    /** Commit hash: SHA256(value + salt) */
    commitHash: string;
}

/**
 * Parameters for commit-reveal voting (Phase 2)
 * 
 * @internal Use only in Alethea Dashboard
 */
export interface RevealVoteParams {
    /** Query ID */
    queryId: number;

    /** Vote value (same as used in commit) */
    value: string;

    /** Salt (same as used in commit) */
    salt: string;

    /** Optional confidence score (0-100) */
    confidence?: number;
}

// =============================================================================
// GRAPHQL RESPONSE TYPES (Internal)
// =============================================================================

export interface GraphQLResponse<T = any> {
    data?: T;
    errors?: Array<{
        message: string;
        extensions?: {
            code?: string;
            [key: string]: any;
        };
    }>;
}

export interface QueryQueryResponse {
    query: QueryInfo | null;
}

export interface QueriesQueryResponse {
    queries: QueryInfo[];
}

export interface ActiveQueriesQueryResponse {
    activeQueries: QueryInfo[];
}

export interface StatisticsQueryResponse {
    statistics: Statistics;
}

export interface VoterQueryResponse {
    voter: VoterInfo | null;
}

export interface VotersQueryResponse {
    voters: VoterInfo[];
}

export interface PendingRewardsQueryResponse {
    myPendingRewards: string;
}

// =============================================================================
// LEGACY TYPES (Deprecated)
// =============================================================================

/**
 * @deprecated Use CreateResolutionQueryParams
 */
export interface RegisterMarketParams {
    question: string;
    outcomes: string[];
    deadline: string;
    callbackChainId: string;
    callbackApplicationId: string;
    callbackMethod: string;
    fee: string;
}

/**
 * @deprecated Use QueryCreationResult
 */
export interface MarketRegistration {
    marketId: number;
    registeredAt: Date;
    estimatedResolution: Date;
}

/**
 * @deprecated Use QueryInfo
 */
export interface MarketStatus {
    id: number;
    status: 'ACTIVE' | 'VOTING' | 'REVEALING' | 'RESOLVED' | 'CANCELLED';
    finalOutcome?: number;
    callbackStatus: 'PENDING' | 'SENT' | 'FAILED' | 'NOT_REQUIRED';
    resolvedAt?: string;
    confidence?: number;
    question?: string;
    outcomes?: string[];
}

/**
 * @deprecated Use ResolutionResult
 */
export interface Resolution {
    marketId: number;
    outcome: number;
    resolvedAt: string;
    confidence?: number;
    voterCount?: number;
}

/**
 * @deprecated Use CreateResolutionQueryParams
 */
export interface CreateQueryParams {
    description: string;
    outcomes: string[];
    strategy: DecisionStrategy;
    minVotes?: number;
    rewardAmount: string;
    deadline?: string;
}

export interface MarketQueryResponse {
    market: {
        id: number;
        question: string;
        outcomes: string[];
        deadline: string;
        status: string;
        finalOutcome?: number;
        callbackStatus: string;
        resolvedAt?: string;
        confidence?: number;
    } | null;
}

export interface RegisterMarketResponse {
    registerExternalMarket: number;
}

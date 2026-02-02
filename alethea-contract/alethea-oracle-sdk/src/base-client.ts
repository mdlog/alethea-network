/**
 * Base Client - Shared functionality for Oracle SDK clients
 * 
 * This class contains common functionality used by both ExternalDAppClient
 * and InternalDashboardClient.
 * 
 * @internal
 */

import {
    OracleConfigBase,
    GraphQLResponse,
    QueryInfo,
    Statistics,
    VoterInfo,
    QueryQueryResponse,
    QueriesQueryResponse,
    StatisticsQueryResponse,
    VotersQueryResponse,
} from './types';
import {
    NetworkError,
    MaxRetriesExceededError,
} from './errors';

export abstract class BaseOracleClient {
    protected config: OracleConfigBase;
    protected endpoint: string;
    protected retryAttempts: number;
    protected retryDelay: number;

    constructor(config: OracleConfigBase) {
        this.config = config;
        this.endpoint = config.endpoint || this.buildDefaultEndpoint();
        this.retryAttempts = config.retryAttempts ?? 3;
        this.retryDelay = config.retryDelay ?? 1000;
    }

    // =========================================================================
    // PUBLIC READ-ONLY METHODS (Available to all clients)
    // =========================================================================

    /**
     * Get query information by ID
     */
    async getQuery(queryId: number): Promise<QueryInfo | null> {
        const query = `
            query {
                query(id: ${queryId}) {
                    id
                    description
                    outcomes
                    strategy
                    minVotes
                    rewardAmount
                    creator
                    createdAt
                    deadline
                    commitEnd
                    revealEnd
                    status
                    phase
                    result
                    resolvedAt
                    commitCount
                    voteCount
                    timeRemaining
                }
            }
        `;

        const result = await this.executeQuery<QueryQueryResponse>(query);
        return result.data?.query || null;
    }

    /**
     * Get all queries
     */
    async getQueries(options?: {
        limit?: number;
        offset?: number;
        status?: 'Active' | 'Resolved' | 'Expired' | 'Cancelled';
    }): Promise<QueryInfo[]> {
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;

        const query = `
            query {
                queries(
                    limit: ${limit}
                    offset: ${offset}
                    ${options?.status ? `status: "${options.status}"` : ''}
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
                    status
                    phase
                    result
                    resolvedAt
                    voteCount
                    timeRemaining
                }
            }
        `;

        const result = await this.executeQuery<QueriesQueryResponse>(query);
        return result.data?.queries || [];
    }

    /**
     * Get active queries
     */
    async getActiveQueries(options?: {
        limit?: number;
        offset?: number;
    }): Promise<QueryInfo[]> {
        return this.getQueries({ ...options, status: 'Active' });
    }

    /**
     * Get protocol statistics
     */
    async getStatistics(): Promise<Statistics> {
        const query = `
            query {
                statistics {
                    totalVoters
                    activeVoters
                    totalStake
                    totalLockedStake
                    averageStake
                    totalQueriesCreated
                    totalQueriesResolved
                    activeQueriesCount
                    totalVotesSubmitted
                    averageVotesPerQuery
                    totalRewardsDistributed
                    rewardPoolBalance
                    protocolTreasury
                    averageReputation
                    protocolStatus
                    resolutionRate
                }
            }
        `;

        const result = await this.executeQuery<StatisticsQueryResponse>(query);

        if (!result.data?.statistics) {
            throw new NetworkError('Invalid response from statistics query');
        }

        return result.data.statistics;
    }

    /**
     * Get all registered voters (for transparency)
     */
    async getVoters(options?: {
        limit?: number;
        offset?: number;
        activeOnly?: boolean;
    }): Promise<VoterInfo[]> {
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;
        const activeOnly = options?.activeOnly || false;

        const query = `
            query {
                voters(limit: ${limit}, offset: ${offset}, activeOnly: ${activeOnly}) {
                    address
                    stake
                    lockedStake
                    availableStake
                    withdrawableBalance
                    pendingRewards
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
        `;

        const result = await this.executeQuery<VotersQueryResponse>(query);
        return result.data?.voters || [];
    }

    // =========================================================================
    // PROTECTED METHODS (Shared utilities)
    // =========================================================================

    /**
     * Execute GraphQL query with retry logic
     */
    protected async executeWithRetry<T>(
        query: string,
        attempt: number = 1
    ): Promise<GraphQLResponse<T>> {
        try {
            return await this.executeQuery<T>(query);
        } catch (error) {
            if (attempt >= this.retryAttempts) {
                throw new MaxRetriesExceededError(attempt, error);
            }

            // Exponential backoff
            await this.sleep(this.retryDelay * attempt);

            return this.executeWithRetry<T>(query, attempt + 1);
        }
    }

    /**
     * Execute a GraphQL query
     */
    protected async executeQuery<T>(query: string): Promise<GraphQLResponse<T>> {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new NetworkError(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const result = await response.json() as GraphQLResponse<T>;

            if (result.errors && result.errors.length > 0) {
                const error = result.errors[0];
                throw new NetworkError(
                    error.message,
                    error.extensions
                );
            }

            return result;
        } catch (error) {
            if (error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(
                'Failed to communicate with oracle service',
                error
            );
        }
    }

    /**
     * Build default GraphQL endpoint
     */
    protected buildDefaultEndpoint(): string {
        return `http://localhost:8080/chains/${this.config.chainId}/applications/${this.config.registryId}`;
    }

    /**
     * Sleep utility
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

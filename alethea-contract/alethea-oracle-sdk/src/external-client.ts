/**
 * External DApp Client - For Prediction Markets, Insurance, and other DApps
 * 
 * This client provides resolution oracle services for external applications.
 * 
 * ## What This Client Does:
 * - Create resolution queries with bond (Hybrid Model)
 * - Subscribe to resolution results (polling-based)
 * - Raise disputes against resolutions
 * - Read-only access to queries, voters, and statistics
 * 
 * ## Who Should Use This:
 * - Prediction Markets (e.g., Polymarket-like)
 * - Insurance Protocols
 * - Gaming Platforms
 * - DeFi Protocols requiring price/event verification
 * - Any external DApp needing decentralized resolution
 * 
 * ## Who Should NOT Use This:
 * - Alethea Dashboard (use InternalDashboardClient)
 * - Voter management tools (use InternalDashboardClient)
 * 
 * ## Quick Start:
 * 
 * ```typescript
 * import { ExternalDAppClient } from 'alethea-oracle-sdk';
 * 
 * const client = new ExternalDAppClient({
 *   registryId: 'f51da82d...',
 *   chainId: '9d0d233f...',
 *   callbackChainId: 'YOUR_CHAIN_ID',
 *   callbackAppId: 'YOUR_APP_ID',
 * });
 * 
 * // Create a resolution query with bond
 * const result = await client.createResolutionQueryWithBond({
 *   description: 'Did BTC close above $100k on Jan 5, 2026?',
 *   outcomes: ['Yes', 'No'],
 *   bondAmount: '100',
 *   title: 'BTC Price Check',
 *   category: 'Crypto',
 * });
 * 
 * // Subscribe to resolution
 * const unsubscribe = client.subscribeToResolution(queryId, (resolution, error) => {
 *   if (resolution) {
 *     console.log('Resolved:', resolution.result);
 *   }
 * });
 * ```
 */

import { BaseOracleClient } from './base-client';
import {
    ExternalDAppConfig,
    CreateResolutionQueryParams,
    CreateQueryWithBondParams,
    RaiseDisputeParams,
    QueryCreationResult,
    ResolutionResult,
    ResolutionCallback,
    Unsubscribe,
    SubscriptionOptions,
    QueryInfo,
    GraphQLResponse,
} from './types';
import {
    ValidationError,
    NetworkError,
    QueryNotFoundError,
    SubscriptionTimeoutError,
} from './errors';

export class ExternalDAppClient extends BaseOracleClient {
    private callbackChainId: string;
    private callbackAppId: string;

    /**
     * Create a new External DApp client
     * 
     * @param config - Configuration with callback chain and app IDs
     */
    constructor(config: ExternalDAppConfig) {
        super(config);
        this.callbackChainId = config.callbackChainId;
        this.callbackAppId = config.callbackAppId;
    }

    // =========================================================================
    // QUERY CREATION
    // =========================================================================

    /**
     * Create a resolution query with bond (Recommended - Hybrid Model)
     * 
     * This is the primary method for external DApps to request oracle resolution.
     * Bond is refundable if no dispute is raised within the dispute window.
     * 
     * @param params - Query creation parameters
     * @returns Query creation result with query ID
     * 
     * @example
     * ```typescript
     * const result = await client.createResolutionQueryWithBond({
     *   description: 'Will ETH reach $5000 by March 2026?',
     *   outcomes: ['Yes', 'No'],
     *   bondAmount: '100',
     *   strategy: 'WeightedByStake',
     *   title: 'ETH Price Prediction',
     *   category: 'Crypto',
     *   resolutionCriteria: 'Use CoinGecko price at 00:00 UTC',
     *   sourceUrls: 'https://coingecko.com/eth',
     * });
     * ```
     */
    async createResolutionQueryWithBond(params: CreateQueryWithBondParams): Promise<string> {
        // Validate required parameters
        if (!params.description || params.description.trim().length === 0) {
            throw new ValidationError('Description is required');
        }

        if (!params.outcomes || params.outcomes.length < 2) {
            throw new ValidationError('At least 2 outcomes are required');
        }

        if (params.outcomes.length > 10) {
            throw new ValidationError('Maximum 10 outcomes allowed');
        }

        if (!params.bondAmount || parseFloat(params.bondAmount) < 100) {
            throw new ValidationError('Minimum bond amount is 100 ALTH');
        }

        const mutation = `
            mutation {
                claimBondRefund: createResolutionQueryWithBond(
                    description: ${JSON.stringify(params.description)}
                    outcomes: ${JSON.stringify(params.outcomes)}
                    strategy: "${params.strategy || 'WeightedByStake'}"
                    ${params.minVotes ? `minVotes: ${params.minVotes}` : ''}
                    bondAmount: "${params.bondAmount}"
                    ${params.priorityFee ? `priorityFee: "${params.priorityFee}"` : ''}
                    ${params.durationSecs ? `durationSecs: ${params.durationSecs}` : ''}
                    callbackChain: "${this.callbackChainId}"
                    callbackApp: "${this.callbackAppId}"
                    ${params.referenceId ? `callbackData: "${params.referenceId}"` : ''}
                    ${params.title ? `title: ${JSON.stringify(params.title)}` : ''}
                    ${params.category ? `category: ${JSON.stringify(params.category)}` : ''}
                    ${params.context ? `context: ${JSON.stringify(params.context)}` : ''}
                    ${params.resolutionCriteria ? `resolutionCriteria: ${JSON.stringify(params.resolutionCriteria)}` : ''}
                    ${params.sourceUrls ? `sourceUrls: ${JSON.stringify(params.sourceUrls)}` : ''}
                    ${params.tags ? `tags: ${JSON.stringify(params.tags)}` : ''}
                    ${params.metadataUrl ? `metadataUrl: ${JSON.stringify(params.metadataUrl)}` : ''}
                    ${params.externalId ? `externalId: ${JSON.stringify(params.externalId)}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ claimBondRefund: string }>(mutation);

        if (result.errors && result.errors.length > 0) {
            throw new NetworkError(result.errors[0].message);
        }

        return result.data?.claimBondRefund || 'Query creation submitted';
    }

    /**
     * Create a resolution query (Legacy mode - no bond)
     * 
     * @deprecated Use createResolutionQueryWithBond() for the hybrid model
     * @param params - Query creation parameters
     */
    async createResolutionQuery(params: CreateResolutionQueryParams): Promise<string> {
        if (!params.description || params.description.trim().length === 0) {
            throw new ValidationError('Description is required');
        }

        if (!params.outcomes || params.outcomes.length < 2) {
            throw new ValidationError('At least 2 outcomes are required');
        }

        const mutation = `
            mutation {
                createQuery(
                    description: ${JSON.stringify(params.description)}
                    outcomes: ${JSON.stringify(params.outcomes)}
                    strategy: "${params.strategy || 'WeightedByStake'}"
                    ${params.minVotes ? `minVotes: ${params.minVotes}` : ''}
                    rewardAmount: "${params.rewardAmount}"
                    ${params.durationSecs ? `durationSecs: ${params.durationSecs}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ createQuery: string }>(mutation);
        return result.data?.createQuery || 'Query creation submitted';
    }

    // =========================================================================
    // RESOLUTION SUBSCRIPTION
    // =========================================================================

    /**
     * Subscribe to query resolution (polling-based)
     * 
     * Polls the oracle registry periodically to check if a query has been resolved.
     * Calls the callback function when resolution is detected.
     * 
     * @param queryId - Query ID to watch
     * @param callback - Function called when resolution occurs or on error
     * @param options - Polling options (interval, timeout)
     * @returns Unsubscribe function to stop polling
     * 
     * @example
     * ```typescript
     * const unsubscribe = client.subscribeToResolution(42, (resolution, error) => {
     *   if (error) {
     *     console.error('Resolution error:', error);
     *     return;
     *   }
     *   if (resolution) {
     *     console.log(`Query ${resolution.queryId} resolved: ${resolution.result}`);
     *     // Settle your market with the result
     *   }
     * });
     * 
     * // Later, to stop polling:
     * unsubscribe();
     * ```
     */
    subscribeToResolution(
        queryId: number,
        callback: ResolutionCallback,
        options?: SubscriptionOptions,
    ): Unsubscribe {
        const pollInterval = options?.pollInterval || 5000; // 5 seconds default
        const timeout = options?.timeout || 86400000; // 24 hours default
        let isActive = true;
        const startTime = Date.now();

        const poll = async () => {
            if (!isActive) return;

            try {
                const query = await this.getQuery(queryId);

                if (!query) {
                    callback(null, new QueryNotFoundError(queryId));
                    isActive = false;
                    return;
                }

                if (query.status === 'Resolved' || query.status === 'Finalized') {
                    const resolution: ResolutionResult = {
                        queryId: query.id,
                        result: query.result || '',
                        resolvedAt: query.resolvedAt || '',
                        voteCount: query.voteCount,
                        confidence: 0, // Not directly available from query
                        callbackData: undefined,
                    };
                    callback(resolution, null);
                    isActive = false;
                    return;
                }

                if (query.status === 'Expired' || query.status === 'Cancelled') {
                    callback(null, new NetworkError(`Query ${queryId} ${query.status.toLowerCase()}`));
                    isActive = false;
                    return;
                }

                // Check timeout
                if (Date.now() - startTime > timeout) {
                    callback(null, new SubscriptionTimeoutError(queryId, timeout));
                    isActive = false;
                    return;
                }

                // Continue polling
                setTimeout(poll, pollInterval);
            } catch (error) {
                if (isActive) {
                    callback(null, error instanceof Error ? error : new Error(String(error)));
                    // Continue polling on transient errors
                    setTimeout(poll, pollInterval);
                }
            }
        };

        // Start polling
        setTimeout(poll, pollInterval);

        // Return unsubscribe function
        return () => {
            isActive = false;
        };
    }

    /**
     * Wait for query resolution (Promise-based)
     * 
     * Returns a Promise that resolves when the query is resolved.
     * More convenient than callback-based subscription for simple use cases.
     * 
     * @param queryId - Query ID to wait for
     * @param options - Polling options
     * @returns Resolution result
     * 
     * @example
     * ```typescript
     * const result = await client.waitForResolution(42, { pollInterval: 10000 });
     * console.log('Resolved:', result.result);
     * ```
     */
    async waitForResolution(
        queryId: number,
        options?: SubscriptionOptions,
    ): Promise<ResolutionResult> {
        return new Promise((resolve, reject) => {
            this.subscribeToResolution(
                queryId,
                (resolution, error) => {
                    if (error) {
                        reject(error);
                    } else if (resolution) {
                        resolve(resolution);
                    }
                },
                options,
            );
        });
    }

    // =========================================================================
    // DISPUTE OPERATIONS
    // =========================================================================

    /**
     * Raise a dispute against a resolved query
     * 
     * Dispute bond must equal the original query bond.
     * If dispute succeeds, disputer gets both bonds.
     * If dispute fails, original creator gets dispute bond.
     * 
     * @param params - Dispute parameters
     * @returns Success status
     */
    async raiseDispute(params: RaiseDisputeParams): Promise<boolean> {
        if (!params.disputedOutcome || params.disputedOutcome.trim().length === 0) {
            throw new ValidationError('Disputed outcome is required');
        }

        if (!params.disputeBond || parseFloat(params.disputeBond) <= 0) {
            throw new ValidationError('Dispute bond must be positive');
        }

        if (!params.reason || params.reason.trim().length === 0) {
            throw new ValidationError('Dispute reason is required');
        }

        const mutation = `
            mutation {
                raiseDispute(
                    queryId: ${params.queryId}
                    disputedOutcome: ${JSON.stringify(params.disputedOutcome)}
                    disputeBond: "${params.disputeBond}"
                    reason: ${JSON.stringify(params.reason)}
                )
            }
        `;

        const result = await this.executeWithRetry<{ raiseDispute: boolean }>(mutation);
        return result.data?.raiseDispute ?? false;
    }

    /**
     * Claim bond refund after dispute window expires
     * 
     * @param queryId - Query ID whose bond to claim back
     * @returns Success status
     */
    async claimBondRefund(queryId: number): Promise<boolean> {
        const mutation = `
            mutation {
                claimBondRefund(queryId: ${queryId})
            }
        `;

        const result = await this.executeWithRetry<{ claimBondRefund: boolean }>(mutation);
        return result.data?.claimBondRefund ?? false;
    }

    // =========================================================================
    // QUERY MONITORING
    // =========================================================================

    /**
     * Get queries created by external DApps
     * 
     * @returns List of external queries
     */
    async getExternalQueries(): Promise<QueryInfo[]> {
        const queries = await this.getQueries();
        return queries.filter(q => q.id > 0); // All queries from this endpoint are relevant
    }

    /**
     * Get queries with active bonds
     * 
     * @returns List of queries that have bond > 0
     */
    async getQueriesWithBond(): Promise<QueryInfo[]> {
        const query = `
            query {
                queriesWithBond {
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
                    bondAmount
                    priorityFee
                    bondRefunded
                    hasDispute
                    disputeWindowEnd
                    canDispute
                    title
                    category
                    sourceAppName
                    sourceAppCategory
                    isExternal
                }
            }
        `;

        const result = await this.executeQuery<{ queriesWithBond: QueryInfo[] }>(query);
        return result.data?.queriesWithBond || [];
    }

    /**
     * Get dispute information for a query
     * 
     * @param queryId - Query ID to check
     * @returns Dispute info or null if no dispute
     */
    async getDispute(queryId: number): Promise<{
        queryId: number;
        disputer: string;
        disputeBond: string;
        disputedOutcome: string;
        reason: string;
        disputedAt: string;
        status: string;
    } | null> {
        const query = `
            query {
                dispute(queryId: ${queryId}) {
                    queryId
                    disputer
                    disputeBond
                    disputedOutcome
                    reason
                    disputedAt
                    status
                }
            }
        `;

        const result = await this.executeQuery<{ dispute: any }>(query);
        return result.data?.dispute || null;
    }

    /**
     * Get hybrid model statistics
     * 
     * @returns Inflation pool, bond pool, and other hybrid model stats
     */
    async getHybridModelStats(): Promise<{
        inflationPool: string;
        totalInflationDistributed: string;
        bondPool: string;
        totalBondsRefunded: string;
        totalBondsSlashed: string;
    }> {
        const query = `
            query {
                hybridModelStats {
                    inflationPool
                    totalInflationDistributed
                    bondPool
                    totalBondsRefunded
                    totalBondsSlashed
                }
            }
        `;

        const result = await this.executeQuery<{ hybridModelStats: any }>(query);
        if (!result.data?.hybridModelStats) {
            throw new NetworkError('Failed to fetch hybrid model stats');
        }
        return result.data.hybridModelStats;
    }
}

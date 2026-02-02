/**
 * Legacy Oracle Client
 * 
 * @deprecated This client is deprecated. Please use:
 * - `ExternalDAppClient` for prediction markets and external DApps
 * - `InternalDashboardClient` for Alethea Dashboard (internal only)
 * 
 * This file is kept for backward compatibility only.
 */

import { BaseOracleClient } from './base-client';
import {
    OracleConfig,
    QueryInfo,
    VoterInfo,
    Statistics,
    CreateQueryParams,
    RegisterVoterParams,
    SubmitVoteParams,
    VoterQueryResponse,
    PendingRewardsQueryResponse,
} from './types';
import {
    ValidationError,
    NetworkError,
} from './errors';

/**
 * @deprecated Use ExternalDAppClient for DApps or InternalDashboardClient for Alethea Dashboard
 */
export class AletheaOracleClient extends BaseOracleClient {
    private voterAddress?: string;

    constructor(config: OracleConfig) {
        super(config);
        this.voterAddress = config.voterAddress;
        
        console.warn(
            '[DEPRECATED] AletheaOracleClient is deprecated.\n' +
            'For external DApps: use ExternalDAppClient\n' +
            'For Alethea Dashboard: use InternalDashboardClient'
        );
    }

    // =========================================================================
    // QUERY OPERATIONS (Use ExternalDAppClient instead)
    // =========================================================================

    /**
     * @deprecated Use ExternalDAppClient.createResolutionQuery()
     */
    async createQuery(params: CreateQueryParams): Promise<QueryInfo> {
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
                    strategy: "${params.strategy}"
                    ${params.minVotes ? `minVotes: ${params.minVotes}` : ''}
                    rewardAmount: "${params.rewardAmount}"
                    ${params.deadline ? `deadline: "${params.deadline}"` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ createQuery: QueryInfo }>(mutation);

        if (!result.data?.createQuery) {
            throw new NetworkError('Invalid response from query creation');
        }

        return result.data.createQuery;
    }

    // =========================================================================
    // VOTER OPERATIONS (Use InternalDashboardClient instead)
    // =========================================================================

    /**
     * @deprecated Use InternalDashboardClient.registerVoter()
     */
    async registerVoter(params: RegisterVoterParams): Promise<VoterInfo> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                registerVoter(
                    stake: "${params.stake}"
                    ${params.name ? `name: ${JSON.stringify(params.name)}` : ''}
                ) {
                    address
                    stake
                    reputation
                    isActive
                }
            }
        `;

        const result = await this.executeWithRetry<{ registerVoter: VoterInfo }>(mutation);

        if (!result.data?.registerVoter) {
            throw new NetworkError('Invalid response from voter registration');
        }

        return result.data.registerVoter;
    }

    /**
     * @deprecated Use InternalDashboardClient.getMyVoterInfo()
     */
    async getVoter(address?: string): Promise<VoterInfo | null> {
        const voterAddress = address || this.voterAddress;
        if (!voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const query = `
            query {
                voter(address: "${voterAddress}") {
                    address
                    stake
                    lockedStake
                    availableStake
                    withdrawableBalance
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

        const result = await this.executeQuery<VoterQueryResponse>(query);
        return result.data?.voter || null;
    }

    /**
     * @deprecated Use InternalDashboardClient.getMyVoterInfo()
     */
    async getMyVoterInfo(): Promise<VoterInfo | null> {
        return this.getVoter(this.voterAddress);
    }

    /**
     * @deprecated Use InternalDashboardClient.getPendingRewards()
     */
    async getMyPendingRewards(): Promise<string> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const query = `
            query {
                myPendingRewards(address: "${this.voterAddress}")
            }
        `;

        const result = await this.executeQuery<PendingRewardsQueryResponse>(query);
        return result.data?.myPendingRewards || '0';
    }

    /**
     * @deprecated Use InternalDashboardClient.submitVote()
     */
    async submitVote(params: SubmitVoteParams): Promise<void> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                submitVote(
                    queryId: ${params.queryId}
                    value: ${JSON.stringify(params.value)}
                    ${params.confidence !== undefined ? `confidence: ${params.confidence}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ submitVote: boolean }>(mutation);

        if (!result.data?.submitVote) {
            throw new NetworkError('Failed to submit vote');
        }
    }

    /**
     * @deprecated Use InternalDashboardClient.addStake()
     */
    async updateStake(additionalStake: string): Promise<VoterInfo> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                updateStake(additionalStake: "${additionalStake}") {
                    address
                    stake
                    availableStake
                    isActive
                }
            }
        `;

        const result = await this.executeWithRetry<{ updateStake: VoterInfo }>(mutation);

        if (!result.data?.updateStake) {
            throw new NetworkError('Invalid response');
        }

        return result.data.updateStake;
    }

    /**
     * @deprecated Use InternalDashboardClient.withdrawStake()
     */
    async withdrawStake(amount: string): Promise<VoterInfo> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                withdrawStake(amount: "${amount}") {
                    address
                    stake
                    availableStake
                    isActive
                }
            }
        `;

        const result = await this.executeWithRetry<{ withdrawStake: VoterInfo }>(mutation);

        if (!result.data?.withdrawStake) {
            throw new NetworkError('Invalid response');
        }

        return result.data.withdrawStake;
    }

    /**
     * Claim pending rewards - moves rewards to withdrawableBalance
     * 
     * Note: After claiming, rewards are in withdrawableBalance.
     * Use claimWithdrawableTokens() to actually receive the tokens.
     * 
     * @deprecated Use InternalDashboardClient.claimRewards()
     */
    async claimRewards(): Promise<string> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                executeClaimRewardsFor(voterAddress: "${this.voterAddress}")
            }
        `;

        const result = await this.executeWithRetry<{ executeClaimRewardsFor: boolean }>(mutation);
        return result.data?.executeClaimRewardsFor ? 'Rewards claimed to withdrawable balance' : '0';
    }

    /**
     * Claim withdrawable tokens - actually sends tokens to your wallet
     * 
     * Call this after claimRewards() or withdrawStake() to receive the actual tokens.
     * 
     * @deprecated Use InternalDashboardClient.claimWithdrawableTokens()
     */
    async claimWithdrawableTokens(): Promise<boolean> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                executeClaimWithdrawableTokens(voterAddress: "${this.voterAddress}")
            }
        `;

        const result = await this.executeWithRetry<{ executeClaimWithdrawableTokens: boolean }>(mutation);
        return result.data?.executeClaimWithdrawableTokens ?? false;
    }

    /**
     * @deprecated Use InternalDashboardClient.deregisterVoter()
     */
    async deregisterVoter(): Promise<void> {
        if (!this.voterAddress) {
            throw new ValidationError('Voter address is required');
        }

        const mutation = `
            mutation {
                deregisterVoter
            }
        `;

        await this.executeWithRetry<{ deregisterVoter: boolean }>(mutation);
    }

    /**
     * @deprecated
     */
    async resolveQuery(queryId: number): Promise<QueryInfo> {
        const mutation = `
            mutation {
                resolveQuery(queryId: ${queryId}) {
                    id
                    status
                    result
                }
            }
        `;

        const result = await this.executeWithRetry<{ resolveQuery: QueryInfo }>(mutation);

        if (!result.data?.resolveQuery) {
            throw new NetworkError('Invalid response');
        }

        return result.data.resolveQuery;
    }

    /**
     * @deprecated
     */
    async getActiveQueries(options?: { limit?: number; offset?: number }): Promise<QueryInfo[]> {
        return super.getQueries({ ...options, status: 'Active' });
    }
}

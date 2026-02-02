/**
 * Internal Dashboard Client - For Alethea Network Dashboard ONLY
 * 
 * ⚠️ WARNING: This client is for INTERNAL USE ONLY.
 * 
 * External DApps (prediction markets, insurance, etc.) should NOT use this client.
 * Instead, use ExternalDAppClient for resolution queries.
 * 
 * ## What This Client Does:
 * - Voter registration and management
 * - Vote submission (commit-reveal)
 * - Stake management
 * - Reward claiming
 * - Query creation (for testing/admin)
 * 
 * ## Who Should Use This:
 * - Alethea Network Dashboard
 * - Alethea Admin Tools
 * - Voter Testing Tools
 * 
 * ## Who Should NOT Use This:
 * - External Prediction Markets
 * - Third-party DApps
 * - Any application outside Alethea Network
 * 
 * @internal
 */

import { BaseOracleClient } from './base-client';
import {
    InternalDashboardConfig,
    RegisterVoterParams,
    SubmitVoteParams,
    CommitVoteParams,
    RevealVoteParams,
    VoterInfo,
    QueryInfo,
    VoterQueryResponse,
    PendingRewardsQueryResponse,
} from './types';
import {
    ValidationError,
    NetworkError,
} from './errors';

/**
 * @internal
 */
export class InternalDashboardClient extends BaseOracleClient {
    private voterChainId: string;

    /**
     * Create a new Internal Dashboard client
     * 
     * @internal
     * @param config - Configuration with voter chain ID
     */
    constructor(config: InternalDashboardConfig) {
        super(config);
        this.voterChainId = config.voterChainId;
    }

    // =========================================================================
    // VOTER REGISTRATION
    // =========================================================================

    /**
     * Register as a voter
     * 
     * @internal Alethea Dashboard only
     */
    async registerVoter(params: RegisterVoterParams): Promise<boolean> {
        this.validateVoterOperation();

        const stake = parseFloat(params.stake);
        if (isNaN(stake) || stake < 100) {
            throw new ValidationError('Minimum stake is 100 ALTH tokens');
        }

        const mutation = `
            mutation {
                sendRegisterVoterMessage(
                    targetChain: "${this.config.chainId}"
                    stake: "${params.stake}"
                    ${params.name ? `name: ${JSON.stringify(params.name)}` : ''}
                    ${params.metadataUrl ? `metadataUrl: ${JSON.stringify(params.metadataUrl)}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendRegisterVoterMessage: boolean }>(mutation);
        return result.data?.sendRegisterVoterMessage ?? false;
    }

    /**
     * Get current voter information
     * 
     * @internal Alethea Dashboard only
     */
    async getMyVoterInfo(): Promise<VoterInfo | null> {
        this.validateVoterOperation();

        const query = `
            query {
                voter(address: "${this.voterChainId}") {
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

        const result = await this.executeQuery<VoterQueryResponse>(query);
        return result.data?.voter || null;
    }

    // =========================================================================
    // STAKE MANAGEMENT
    // =========================================================================

    /**
     * Add additional stake
     * 
     * @internal Alethea Dashboard only
     */
    async addStake(amount: string): Promise<boolean> {
        this.validateVoterOperation();

        const stakeAmount = parseFloat(amount);
        if (isNaN(stakeAmount) || stakeAmount <= 0) {
            throw new ValidationError('Stake amount must be positive');
        }

        const mutation = `
            mutation {
                sendUpdateStakeMessage(
                    targetChain: "${this.config.chainId}"
                    additionalStake: "${amount}"
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendUpdateStakeMessage: boolean }>(mutation);
        return result.data?.sendUpdateStakeMessage ?? false;
    }

    /**
     * Withdraw stake
     * 
     * @internal Alethea Dashboard only
     */
    async withdrawStake(amount: string): Promise<boolean> {
        this.validateVoterOperation();

        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            throw new ValidationError('Withdraw amount must be positive');
        }

        const mutation = `
            mutation {
                executeWithdrawStakeFor(
                    voterAddress: "${this.voterChainId}"
                    amount: "${amount}"
                )
            }
        `;

        const result = await this.executeWithRetry<{ executeWithdrawStakeFor: boolean }>(mutation);
        return result.data?.executeWithdrawStakeFor ?? false;
    }

    /**
     * Claim withdrawable tokens
     * 
     * @internal Alethea Dashboard only
     */
    async claimWithdrawableTokens(): Promise<boolean> {
        this.validateVoterOperation();

        const mutation = `
            mutation {
                executeClaimWithdrawableTokens(
                    voterAddress: "${this.voterChainId}"
                )
            }
        `;

        const result = await this.executeWithRetry<{ executeClaimWithdrawableTokens: boolean }>(mutation);
        return result.data?.executeClaimWithdrawableTokens ?? false;
    }

    // =========================================================================
    // VOTING OPERATIONS
    // =========================================================================

    /**
     * Submit a vote on a query (direct voting)
     * 
     * @internal Alethea Dashboard only
     */
    async submitVote(params: SubmitVoteParams): Promise<boolean> {
        this.validateVoterOperation();

        if (!params.value || params.value.trim().length === 0) {
            throw new ValidationError('Vote value is required');
        }

        if (params.confidence !== undefined && (params.confidence < 0 || params.confidence > 100)) {
            throw new ValidationError('Confidence must be between 0 and 100');
        }

        const mutation = `
            mutation {
                sendSubmitVoteMessage(
                    targetChain: "${this.config.chainId}"
                    queryId: ${params.queryId}
                    value: ${JSON.stringify(params.value)}
                    ${params.confidence !== undefined ? `confidence: ${params.confidence}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendSubmitVoteMessage: boolean }>(mutation);
        return result.data?.sendSubmitVoteMessage ?? false;
    }

    /**
     * Commit a vote (phase 1 of commit-reveal)
     * 
     * @internal Alethea Dashboard only
     */
    async commitVote(params: CommitVoteParams): Promise<boolean> {
        this.validateVoterOperation();

        if (!params.commitHash || params.commitHash.length === 0) {
            throw new ValidationError('Commit hash is required');
        }

        const mutation = `
            mutation {
                sendCommitVoteMessage(
                    targetChain: "${this.config.chainId}"
                    queryId: ${params.queryId}
                    commitHash: "${params.commitHash}"
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendCommitVoteMessage: boolean }>(mutation);
        return result.data?.sendCommitVoteMessage ?? false;
    }

    /**
     * Reveal a vote (phase 2 of commit-reveal)
     * 
     * @internal Alethea Dashboard only
     */
    async revealVote(params: RevealVoteParams): Promise<boolean> {
        this.validateVoterOperation();

        if (!params.value || params.value.trim().length === 0) {
            throw new ValidationError('Vote value is required');
        }

        if (!params.salt || params.salt.length === 0) {
            throw new ValidationError('Salt is required');
        }

        const mutation = `
            mutation {
                sendRevealVoteMessage(
                    targetChain: "${this.config.chainId}"
                    queryId: ${params.queryId}
                    value: ${JSON.stringify(params.value)}
                    salt: ${JSON.stringify(params.salt)}
                    ${params.confidence !== undefined ? `confidence: ${params.confidence}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendRevealVoteMessage: boolean }>(mutation);
        return result.data?.sendRevealVoteMessage ?? false;
    }

    // =========================================================================
    // REWARDS
    // =========================================================================

    /**
     * Get pending rewards
     * 
     * @internal Alethea Dashboard only
     */
    async getPendingRewards(): Promise<string> {
        this.validateVoterOperation();

        const query = `
            query {
                voter(address: "${this.voterChainId}") {
                    pendingRewards
                }
            }
        `;

        const result = await this.executeQuery<VoterQueryResponse>(query);
        return result.data?.voter?.pendingRewards || '0';
    }

    /**
     * Claim pending rewards
     * 
     * @internal Alethea Dashboard only
     */
    async claimRewards(): Promise<boolean> {
        this.validateVoterOperation();

        const mutation = `
            mutation {
                executeClaimRewardsFor(
                    voterAddress: "${this.voterChainId}"
                )
            }
        `;

        const result = await this.executeWithRetry<{ executeClaimRewardsFor: boolean }>(mutation);
        return result.data?.executeClaimRewardsFor ?? false;
    }

    // =========================================================================
    // QUERY CREATION (Admin/Testing)
    // =========================================================================

    /**
     * Create a query (for testing or admin purposes)
     * 
     * @internal Alethea Dashboard only
     */
    async createQuery(params: {
        description: string;
        outcomes: string[];
        strategy?: string;
        minVotes?: number;
        rewardAmount: string;
        durationSecs?: number;
    }): Promise<boolean> {
        const mutation = `
            mutation {
                sendCreateQueryMessage(
                    targetChain: "${this.config.chainId}"
                    description: ${JSON.stringify(params.description)}
                    outcomes: ${JSON.stringify(params.outcomes)}
                    strategy: "${params.strategy || 'WeightedByStake'}"
                    ${params.minVotes ? `minVotes: ${params.minVotes}` : ''}
                    rewardAmount: "${params.rewardAmount}"
                    ${params.durationSecs ? `durationSecs: ${params.durationSecs}` : ''}
                )
            }
        `;

        const result = await this.executeWithRetry<{ sendCreateQueryMessage: boolean }>(mutation);
        return result.data?.sendCreateQueryMessage ?? false;
    }

    /**
     * Deregister as a voter
     * 
     * @internal Alethea Dashboard only
     */
    async deregisterVoter(): Promise<boolean> {
        this.validateVoterOperation();

        const mutation = `
            mutation {
                deregisterVoter
            }
        `;

        const result = await this.executeWithRetry<{ deregisterVoter: boolean }>(mutation);
        return result.data?.deregisterVoter ?? false;
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Validate that voter chain ID is set
     */
    private validateVoterOperation(): void {
        if (!this.voterChainId) {
            throw new ValidationError('Voter chain ID is required for this operation');
        }
    }
}

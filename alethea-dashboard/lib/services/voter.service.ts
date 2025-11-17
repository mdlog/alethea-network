// Voter Service - Voting and Voter Management
import { queryGraphQL } from '../graphql';

export interface Vote {
    marketId: number;
    voter: string;
    outcomeIndex: number;
    confidence: number;
    timestamp: number;
}

export interface Voter {
    address: string;
    reputation: number;
    totalVotes: number;
    correctVotes: number;
    stake: number;
    isActive: boolean;
}

export interface VoterStats {
    totalVotes: number;
    correctVotes: number;
    accuracy: number;
    reputation: number;
}

export class VoterService {
    // Queries
    static async getVoter(address: string): Promise<Voter | null> {
        try {
            const result = await queryGraphQL(`
                query {
                    voter(address: "${address}") {
                        address
                        reputation
                        totalVotes
                        correctVotes
                        stake
                        isActive
                    }
                }
            `, 'voter');
            return result?.voter || null;
        } catch (error) {
            console.error('Failed to get voter:', error);
            return null;
        }
    }

    static async getVoterStats(address?: string): Promise<VoterStats | null> {
        try {
            const addressParam = address ? `(address: "${address}")` : '';
            const result = await queryGraphQL(`
                query {
                    voterStats${addressParam} {
                        totalVotes
                        correctVotes
                        accuracy
                        reputation
                    }
                }
            `, 'voter');
            return result?.voterStats || null;
        } catch (error) {
            console.error('Failed to get voter stats:', error);
            return null;
        }
    }

    static async getMarketVotes(marketId: number): Promise<Vote[]> {
        try {
            const result = await queryGraphQL(`
                query {
                    marketVotes(marketId: ${marketId}) {
                        marketId
                        voter
                        outcomeIndex
                        confidence
                        timestamp
                    }
                }
            `, 'voter');
            return result?.marketVotes || [];
        } catch (error) {
            console.error('Failed to get market votes:', error);
            return [];
        }
    }

    // Mutations
    static async submitVote(params: {
        marketId: number;
        outcomeIndex: number;
        confidence?: number;
    }): Promise<Vote> {
        const confidence = params.confidence || 100;

        try {
            const result = await queryGraphQL(`
                mutation {
                    submitVote(
                        marketId: ${params.marketId},
                        outcomeIndex: ${params.outcomeIndex},
                        confidence: ${confidence}
                    ) {
                        marketId
                        voter
                        outcomeIndex
                        confidence
                        timestamp
                    }
                }
            `, 'voter');

            if (!result?.submitVote) {
                throw new Error('Failed to submit vote');
            }

            return result.submitVote;
        } catch (error) {
            console.error('Failed to submit vote:', error);
            throw error;
        }
    }

    static async registerVoter(params: {
        address: string;
        stake?: number;
    }): Promise<Voter> {
        const stake = params.stake || 0;

        try {
            const result = await queryGraphQL(`
                mutation {
                    registerVoter(
                        address: "${params.address}",
                        stake: ${stake}
                    ) {
                        address
                        reputation
                        totalVotes
                        correctVotes
                        stake
                        isActive
                    }
                }
            `, 'voter');

            if (!result?.registerVoter) {
                throw new Error('Failed to register voter');
            }

            return result.registerVoter;
        } catch (error) {
            console.error('Failed to register voter:', error);
            throw error;
        }
    }

    static async updateVoterStake(address: string, stake: number): Promise<Voter> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    updateVoterStake(
                        address: "${address}",
                        stake: ${stake}
                    ) {
                        address
                        stake
                        reputation
                        totalVotes
                        isActive
                    }
                }
            `, 'voter');

            if (!result?.updateVoterStake) {
                throw new Error('Failed to update voter stake');
            }

            return result.updateVoterStake;
        } catch (error) {
            console.error('Failed to update voter stake:', error);
            throw error;
        }
    }

    static async withdrawStake(address: string, amount: number): Promise<Voter> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    withdrawStake(
                        address: "${address}",
                        amount: ${amount}
                    ) {
                        address
                        stake
                        reputation
                    }
                }
            `, 'voter');

            if (!result?.withdrawStake) {
                throw new Error('Failed to withdraw stake');
            }

            return result.withdrawStake;
        } catch (error) {
            console.error('Failed to withdraw stake:', error);
            throw error;
        }
    }
}

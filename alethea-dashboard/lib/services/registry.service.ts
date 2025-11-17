// Registry Service - Market Management
import { queryGraphQL } from '../graphql';

export interface Market {
    id: number;
    question: string;
    outcomes: string[];
    status: string;
    createdAt: number;
    deadline: number;
    metadata?: string;
}

export interface CreateMarketParams {
    question: string;
    outcomes: string[];
    resolutionDeadline: number; // Unix timestamp in SECONDS
    initialLiquidity: string; // Amount as string
}

export interface Oracle {
    id: string;
    name: string;
    endpoint: string;
    publicKey: string;
    isActive: boolean;
}

export class RegistryService {
    // Queries
    static async getMarket(id: number): Promise<Market | null> {
        try {
            const result = await queryGraphQL(`
                query {
                    market(id: ${id}) {
                        id
                        question
                        outcomes
                        status
                        createdAt
                        deadline
                        metadata
                    }
                }
            `, 'registry');
            return result?.market || null;
        } catch (error) {
            console.error('Failed to get market:', error);
            throw error;
        }
    }

    static async getActiveMarkets(): Promise<Market[]> {
        try {
            const result = await queryGraphQL(`
                query {
                    activeMarkets {
                        id
                        question
                        outcomes
                        status
                        createdAt
                        deadline
                    }
                }
            `, 'registry');
            return result?.activeMarkets || [];
        } catch (error) {
            console.error('Failed to get active markets:', error);
            return [];
        }
    }

    static async getAllMarkets(): Promise<Market[]> {
        try {
            const result = await queryGraphQL(`
                query {
                    markets {
                        id
                        question
                        outcomes
                        status
                        createdAt
                        deadline
                    }
                }
            `, 'registry');
            return result?.markets || [];
        } catch (error) {
            console.error('Failed to get all markets:', error);
            return [];
        }
    }

    // Mutations
    static async createMarket(params: CreateMarketParams): Promise<any> {
        const outcomesStr = params.outcomes.map(o => `"${o.replace(/"/g, '\\"')}"`).join(', ');

        try {
            // Note: resolutionDeadline must be in SECONDS, not milliseconds
            // initialLiquidity must be a string
            const result = await queryGraphQL(`
                mutation {
                    createMarket(
                        question: "${params.question.replace(/"/g, '\\"')}",
                        outcomes: [${outcomesStr}],
                        resolutionDeadline: ${params.resolutionDeadline},
                        initialLiquidity: "${params.initialLiquidity}"
                    )
                }
            `, 'registry');

            if (!result) {
                throw new Error('Failed to create market');
            }

            return result;
        } catch (error) {
            console.error('Failed to create market:', error);
            throw error;
        }
    }

    static async updateMarketStatus(marketId: number, status: string): Promise<Market> {
        try {
            const result = await queryGraphQL(`
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

            if (!result?.updateMarketStatus) {
                throw new Error('Failed to update market status');
            }

            return result.updateMarketStatus;
        } catch (error) {
            console.error('Failed to update market status:', error);
            throw error;
        }
    }

    static async registerOracle(params: {
        name: string;
        endpoint: string;
        publicKey: string;
    }): Promise<Oracle> {
        try {
            const result = await queryGraphQL(`
                mutation {
                    registerOracle(
                        name: "${params.name.replace(/"/g, '\\"')}",
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

            if (!result?.registerOracle) {
                throw new Error('Failed to register oracle');
            }

            return result.registerOracle;
        } catch (error) {
            console.error('Failed to register oracle:', error);
            throw error;
        }
    }
}
